import { describe, it, expect, beforeEach } from 'vitest'
import { useConfigStore } from './configStore'
import { newContainer, findBlock, walk } from '@/lib/block-tree'
import { exportSiteToHTML } from '@/lib/export-html'
import { starterSite } from '@/templates/starter'
import { newId } from '@/lib/id'
import type { BlockConfig } from '@/blocks/types'

/**
 * Editing a page that is a tree rather than a stack.
 *
 * The store used to reach blocks with `blocks.find` and change them with
 * `blocks.map`, which reaches exactly one level. This drives the store the way
 * the editor does — select, edit, duplicate, move, delete — against blocks
 * that sit inside containers, and then publishes the result, because an edit
 * that works in the canvas and vanishes on publish is not an edit.
 */

function heading(text: string): BlockConfig {
  return { id: newId('block-heading'), type: 'heading', variant: 'default', props: { text } }
}

function siteWithLayout() {
  const site = starterSite()
  const left = heading('Left column')
  const right = heading('Right column')
  const layout = newContainer([left, right])

  const home = site.pages![0]
  return {
    site: {
      ...site,
      pages: site.pages!.map((page) =>
        page.id === home.id ? { ...page, blocks: [...page.blocks, layout] } : page,
      ),
      blocks: [...home.blocks, layout],
    },
    layout,
    left,
    right,
  }
}

beforeEach(() => {
  const { site } = siteWithLayout()
  useConfigStore.getState().setConfig(site)
})

function page() {
  return useConfigStore.getState().getActivePageBlocks()
}

describe('editing inside a container', () => {
  it('changes a widget that sits two levels down', () => {
    const { left } = siteWithLayout()
    useConfigStore.getState().setConfig(siteWithLayout().site)

    const target = walk(page()).find((block) => block.props.text === 'Left column')!
    useConfigStore.getState().updateBlockProps(target.id, { text: 'Edited in place' })

    expect(findBlock(page(), target.id)?.props.text).toBe('Edited in place')
    // Its sibling is untouched — a tree-wide map that rewrites everything is
    // the other way this goes wrong.
    expect(walk(page()).some((block) => block.props.text === 'Right column')).toBe(true)
    void left
  })

  it('changes a nested widget without disturbing the sections around it', () => {
    const before = page().length
    const target = walk(page()).find((block) => block.props.text === 'Right column')!
    useConfigStore.getState().updateBlock(target.id, { variant: 'default' })
    expect(page().length).toBe(before)
  })

  it('deletes a widget out of a container, leaving the container', () => {
    const layout = page().find((block) => block.type === 'container')!
    const child = layout.children![0]

    useConfigStore.getState().removeBlock(child.id)

    const after = findBlock(page(), layout.id)
    expect(after).toBeTruthy()
    expect(after!.children?.length).toBe(1)
  })

  it('deletes a container together with everything inside it', () => {
    const layout = page().find((block) => block.type === 'container')!
    const childIds = layout.children!.map((child) => child.id)

    useConfigStore.getState().removeBlock(layout.id)

    for (const id of childIds) expect(findBlock(page(), id)).toBeNull()
    expect(findBlock(page(), layout.id)).toBeNull()
  })

  it('duplicates a container and gives the copy its own blocks', () => {
    const layout = page().find((block) => block.type === 'container')!

    useConfigStore.getState().duplicateBlock(layout.id)

    const containers = page().filter((block) => block.type === 'container')
    expect(containers.length).toBe(2)
    expect(containers[1].id).not.toBe(containers[0].id)
    expect(containers[1].children?.length).toBe(2)

    const ids = walk(page()).map((block) => block.id)
    expect(new Set(ids).size, 'the copy reuses an id').toBe(ids.length)
  })

  it('adds a widget straight into a container', () => {
    const layout = page().find((block) => block.type === 'container')!

    useConfigStore.getState().addBlock(heading('Third column'), 2, layout.id)

    const after = findBlock(page(), layout.id)!
    expect(after.children?.map((child) => child.props.text)).toEqual([
      'Left column',
      'Right column',
      'Third column',
    ])
  })

  it('moves a widget out of a container onto the page', () => {
    const layout = page().find((block) => block.type === 'container')!
    const child = layout.children![0]

    useConfigStore.getState().moveBlockTo(child.id, null, 0)

    expect(page()[0].id).toBe(child.id)
    expect(findBlock(page(), layout.id)?.children?.length).toBe(1)
  })

  it('moves a section off the page and into a container', () => {
    const layout = page().find((block) => block.type === 'container')!
    const section = page()[0]

    useConfigStore.getState().moveBlockTo(section.id, layout.id, 0)

    expect(findBlock(page(), layout.id)?.children?.[0].id).toBe(section.id)
    expect(page().some((block) => block.id === section.id)).toBe(false)
  })

  it('refuses to move a container into itself and leaves the page intact', () => {
    const layout = page().find((block) => block.type === 'container')!
    const before = walk(page()).length

    useConfigStore.getState().moveBlockTo(layout.id, layout.children![0].id, 0)

    expect(walk(page()).length).toBe(before)
    expect(findBlock(page(), layout.id)?.children?.length).toBe(2)
  })

  it('undoes a nested edit back to what it was', () => {
    const target = walk(page()).find((block) => block.props.text === 'Left column')!

    useConfigStore.getState().updateBlockProps(target.id, { text: 'Changed' })
    expect(findBlock(page(), target.id)?.props.text).toBe('Changed')

    useConfigStore.getState().undo()
    expect(findBlock(page(), target.id)?.props.text).toBe('Left column')

    useConfigStore.getState().redo()
    expect(findBlock(page(), target.id)?.props.text).toBe('Changed')
  })
})

describe('saving and publishing a nested page', () => {
  it('survives being written out and read back as JSON', () => {
    const { site } = siteWithLayout()
    const restored = JSON.parse(JSON.stringify(site))
    const layout = restored.pages[0].blocks.find(
      (block: BlockConfig) => block.type === 'container',
    )
    expect(layout.children.length).toBe(2)
    expect(layout.children[0].props.text).toBe('Left column')
  })

  it('publishes the widgets inside a container, not just the container', () => {
    const { site } = siteWithLayout()
    const html = exportSiteToHTML(site)

    expect(html).toContain('Left column')
    expect(html).toContain('Right column')
    // Arranged, not merely stacked.
    expect(html).toMatch(/display:flex[^"]*flex-direction:row/)
  })

  it('publishes a container inside a container', () => {
    const inner = newContainer([heading('Deep')])
    const outer = newContainer([inner])
    const { site } = siteWithLayout()
    const nested = { ...site, blocks: [...site.blocks, outer] }

    const html = exportSiteToHTML(nested)
    expect(html).toContain('Deep')
  })

  it('publishes a grid container as a grid', () => {
    const grid = { ...newContainer([heading('One'), heading('Two')]), variant: 'grid', props: { columns: 3, gap: 16 } }
    const { site } = siteWithLayout()

    const html = exportSiteToHTML({ ...site, blocks: [...site.blocks, grid] })
    expect(html).toContain('grid-template-columns:repeat(3, minmax(0, 1fr))')
  })
})
