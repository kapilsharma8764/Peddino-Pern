import { beforeEach, describe, expect, it } from 'vitest'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { addWidgetSmart, resolveInsertTarget } from './core'
import type { BlockConfig, SiteConfig } from '@/blocks/types'

const block = (id: string, type: BlockConfig['type'] = 'content', children?: BlockConfig[]): BlockConfig => ({ id, type, variant: 'default', props: {}, ...(children ? { children } : {}) })

function load() {
  const site: SiteConfig = {
    name: 't',
    header: [block('nav', 'navbar')],
    footer: [block('foot', 'footer')],
    pages: [{ id: 'home', name: 'Home', path: '/', blocks: [block('a'), block('b'), block('box', 'container', [block('c')]), block('d')] }],
    blocks: [],
  }
  useConfigStore.getState().setConfig(site)
  useEditorStore.setState({ selectedBlockId: null, insertTarget: null, insertMode: 'after' })
}
const ids = () => useConfigStore.getState().config.pages![0].blocks.map((b) => b.id)

describe('where a library widget lands', () => {
  beforeEach(load)

  it('goes to the end of the page when nothing is selected', () => {
    expect(resolveInsertTarget()).toMatchObject({ region: 'page', index: 4, parentId: null })
  })

  it('goes after the selected section by default', () => {
    useEditorStore.setState({ selectedBlockId: 'a' })
    addWidgetSmart('divider')
    expect(ids().slice(0, 3)).toEqual(['a', expect.stringContaining('divider'), 'b'])
  })

  it('goes before the selected section when asked', () => {
    useEditorStore.setState({ selectedBlockId: 'b' })
    addWidgetSmart('divider', 'before')
    expect(ids().slice(0, 3)).toEqual(['a', expect.stringContaining('divider'), 'b'])
  })

  it('goes inside a selected container', () => {
    useEditorStore.setState({ selectedBlockId: 'box' })
    addWidgetSmart('divider', 'inside')
    const box = useConfigStore.getState().config.pages![0].blocks[2]
    expect(box.children!.map((child) => child.id)).toEqual(['c', expect.stringContaining('divider')])
  })

  it('lands beside a block that is itself inside a container', () => {
    useEditorStore.setState({ selectedBlockId: 'c' })
    addWidgetSmart('divider')
    expect(useConfigStore.getState().config.pages![0].blocks[2].children!.map((child) => child.id)).toEqual(['c', expect.stringContaining('divider')])
  })

  it('falls back to after when "inside" is chosen on something that cannot hold widgets', () => {
    useEditorStore.setState({ selectedBlockId: 'a' })
    addWidgetSmart('divider', 'inside')
    expect(ids()[1]).toContain('divider')
  })

  it('uses an "Add here" spot once, then forgets it', () => {
    useEditorStore.setState({ insertTarget: { region: 'page', parentId: null, index: 1 }, selectedBlockId: 'd' })
    addWidgetSmart('divider')
    expect(ids()[1]).toContain('divider')
    expect(useEditorStore.getState().insertTarget).toBeNull()
  })

  it('selects the widget it added, and stays in the header when added there', () => {
    useEditorStore.setState({ selectedBlockId: 'nav' })
    const added = addWidgetSmart('divider')
    expect(useEditorStore.getState().selectedBlockId).toBe(added.id)
    expect(useConfigStore.getState().config.header!.map((b) => b.id)).toEqual(['nav', added.id])
  })

  it('adds into a page just created, where there is nothing to select', () => {
    const id = useConfigStore.getState().addPage('Offers', true, [])
    expect(useConfigStore.getState().activePageId).toBe(id)
    addWidgetSmart('divider')
    expect(useConfigStore.getState().config.pages!.find((p) => p.id === id)!.blocks).toHaveLength(1)
  })
})

describe('page colours', () => {
  beforeEach(load)
  it('are kept on that page only and can be cleared', () => {
    const store = useConfigStore.getState()
    store.setPageColors('home', { background: '#fff3cd' })
    expect(useConfigStore.getState().config.pages![0].colors).toEqual({ background: '#fff3cd' })
    store.setPageColors('home', { background: undefined })
    expect(useConfigStore.getState().config.pages![0].colors).toBeUndefined()
  })
})
