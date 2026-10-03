// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import { CanvasContext } from '../canvas-context'
import { RenderBlock } from '../registry'
import { newContainer } from '@/lib/block-tree'
import { useEditorStore } from '@/store/editorStore'
import { useConfigStore } from '@/store/configStore'
import { newId } from '@/lib/id'
import type { BlockConfig } from '../types'

/**
 * A container as it behaves on screen.
 *
 * The point of the canvas context is that one component serves three places
 * with different rules — the editing canvas, the gallery's small previews and
 * the preview dialog — so these check the difference actually holds. A drag
 * handle appearing in a preview, or an empty container publishing the words
 * "Drop widgets here", are both faults a visitor would see.
 */

function heading(text: string): BlockConfig {
  return { id: newId('block-heading'), type: 'heading', variant: 'default', props: { text } }
}

function inCanvas(block: BlockConfig, dragging = false) {
  return render(
    <DndContext>
      <CanvasContext.Provider value={{ region: 'page', dragging }}>
        <RenderBlock block={block} />
      </CanvasContext.Provider>
    </DndContext>,
  )
}

function asVisitor(block: BlockConfig) {
  // No provider at all — the default says "this is not the canvas", which is
  // what the gallery card and the published page both get.
  return render(<RenderBlock block={block} />)
}

beforeEach(() => {
  useEditorStore.setState({ selectedBlockId: null, previewMode: false })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('a container on the canvas', () => {
  it('draws the widgets inside it', () => {
    inCanvas(newContainer([heading('Left'), heading('Right')]))
    expect(screen.getByText('Left')).toBeTruthy()
    expect(screen.getByText('Right')).toBeTruthy()
  })

  it('offers an empty one as somewhere to drop', () => {
    inCanvas(newContainer())
    expect(screen.getByText('Drop widgets here')).toBeTruthy()
  })

  it('gives each widget inside it its own controls', () => {
    inCanvas(newContainer([heading('Left')]))
    expect(screen.getByLabelText('Move heading')).toBeTruthy()
    expect(screen.getByLabelText('Duplicate heading')).toBeTruthy()
    expect(screen.getByLabelText('Delete heading')).toBeTruthy()
  })

  it('selects the widget that was clicked, not the container around it', async () => {
    const user = userEvent.setup()
    const child = heading('Left')
    inCanvas(newContainer([child]))

    await user.click(screen.getByText('Left'))

    expect(useEditorStore.getState().selectedBlockId).toBe(child.id)
  })

  it('arranges a grid container as a grid', () => {
    const grid = { ...newContainer([heading('One'), heading('Two')]), variant: 'grid', props: { columns: 3 } }
    const { container } = inCanvas(grid)
    const layout = container.querySelector('[style*="grid-template-columns"]') as HTMLElement
    expect(layout.style.gridTemplateColumns).toContain('repeat(3')
  })

  it('stacks a column container instead of spreading it', () => {
    const column = { ...newContainer([heading('One')]), props: { direction: 'column' } }
    const { container } = inCanvas(column)
    const layout = container.querySelector('[style*="flex-direction"]') as HTMLElement
    expect(layout.style.flexDirection).toBe('column')
  })
})

describe('a container outside the canvas', () => {
  it('draws the widgets with no editing controls around them', () => {
    asVisitor(newContainer([heading('Left')]))
    expect(screen.getByText('Left')).toBeTruthy()
    expect(screen.queryByLabelText('Move heading')).toBeNull()
    expect(screen.queryByLabelText('Delete heading')).toBeNull()
  })

  it('shows a visitor nothing at all when it is empty', () => {
    // "Drop widgets here" on a published website would be the builder leaking
    // into the product it built.
    const { container } = asVisitor(newContainer())
    expect(container.textContent).toBe('')
  })

  it('hides the controls in preview mode even on the canvas', () => {
    useEditorStore.setState({ previewMode: true })
    inCanvas(newContainer([heading('Left')]))
    expect(screen.getByText('Left')).toBeTruthy()
    expect(screen.queryByLabelText('Move heading')).toBeNull()
  })
})

describe('editing a widget inside a container', () => {
  it('deletes only the widget whose button was pressed', async () => {
    const user = userEvent.setup()
    const left = heading('Left')
    const right = heading('Right')
    const layout = newContainer([left, right])

    useConfigStore.getState().setConfig({ name: 'Test', blocks: [layout] })
    inCanvas(layout)

    await user.click(screen.getAllByLabelText('Delete heading')[0])

    const after = useConfigStore.getState().getActivePageBlocks()[0]
    expect(after.children?.map((child) => child.id)).toEqual([right.id])
  })

  it('duplicates a widget inside its own container', async () => {
    const user = userEvent.setup()
    const layout = newContainer([heading('Left')])

    useConfigStore.getState().setConfig({ name: 'Test', blocks: [layout] })
    inCanvas(layout)

    await user.click(screen.getByLabelText('Duplicate heading'))

    const after = useConfigStore.getState().getActivePageBlocks()[0]
    expect(after.children?.length).toBe(2)
    expect(after.children![1].id).not.toBe(after.children![0].id)
  })
})
