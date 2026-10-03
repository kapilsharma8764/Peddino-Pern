import type { CSSProperties } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { BlockConfig } from '../types'
import { RenderBlock } from '../registry'
import { useCanvas } from '../canvas-context'
import { NestedBlock } from '../NestedBlock'
import { DropZone } from '@/builder/DropZone'
import { useEditorStore } from '@/store/editorStore'
import { Plus } from 'lucide-react'
import '@/layouts/layouts.css'
import { ColumnResizeHandle } from '@/layouts/ColumnResizeHandle'

/**
 * A section that holds other sections.
 *
 * This is the block that turns a page from a stack into a layout. It draws
 * nothing of its own — no background, no words — it only arranges whatever has
 * been put inside it, as a row, a column or a grid.
 *
 * Deliberately plain: the moment a container has a look of its own, people
 * start using it for the look rather than the arrangement, and every nested
 * layout inherits decoration nobody asked for. Backgrounds, padding and
 * corners come from the section styling every block already has.
 *
 * On the canvas it also grows the machinery for editing what is inside it —
 * an outline per child, a drag handle, and landing places between the
 * children. In a preview or an export it stays the plain arrangement, because
 * that is all a visitor should ever see.
 */

const justifyMap: Record<string, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
}

const alignMap: Record<string, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

function layoutStyle(block: BlockConfig): CSSProperties {
  const props = block.props as {
    direction?: string
    gap?: number
    align?: string
    justify?: string
    columns?: number
    wrap?: boolean
    template?: string
  }
  const gap = typeof props.gap === 'number' ? props.gap : 24

  if (block.variant === 'grid') {
    const columns = Math.max(1, Math.min(Number(props.columns) || 2, 6))
    return {
      display: 'grid',
      // `minmax(0, 1fr)` rather than `1fr`: without it a long word or a wide
      // image inside a column refuses to shrink and pushes the grid past the
      // edge of the page.
      gridTemplateColumns: props.template && /^[\d.\sfrmin()%,a-z-]+$/i.test(props.template) ? props.template : `repeat(${columns}, minmax(0, 1fr))`,
      gap,
      alignItems: alignMap[props.align ?? 'stretch'],
    }
  }

  return {
    display: 'flex',
    flexDirection: props.direction === 'column' ? 'column' : 'row',
    flexWrap: props.wrap === false ? 'nowrap' : 'wrap',
    gap,
    alignItems: alignMap[props.align ?? 'stretch'],
    justifyContent: justifyMap[props.justify ?? 'start'],
  }
}

/**
 * The whole of an empty container, as a landing place.
 *
 * An empty container is otherwise a nought-pixel-tall nothing, which cannot be
 * dropped into — so the first widget could never get in, and the container
 * would be permanently useless.
 */
function EmptyContainer({ block, region }: { block: BlockConfig; region: 'header' | 'page' | 'footer' }) {
  const setInsertTarget = useEditorStore((s) => s.setInsertTarget)
  const setLeftTab = useEditorStore((s) => s.setLeftTab)
  const { setNodeRef, isOver } = useDroppable({
    id: `container-${block.id}-empty`,
    data: { kind: 'gap', region, index: 0, parentId: block.id },
  })

  return (
    <div
      ref={setNodeRef}
      // Above the drop strips the sections around it lay over the page, so the
      // area that says "drop here" is the area that receives the drop.
      className={`relative z-[4] mx-6 my-4 min-h-24 rounded-lg border border-dashed grid place-items-center transition-colors ${
        isOver ? 'border-brand bg-brand/5' : 'border-border-default'
      }`}
    >
      <div className="flex flex-col items-center gap-1">
      <p className="text-[12px] text-text-3">{isOver ? 'Drop here' : 'Drop widgets here'}</p>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          useEditorStore.getState().selectBlock(null)
          setInsertTarget({ region, parentId: block.id, index: 0 })
          setLeftTab('components')
        }}
        className="inline-flex items-center gap-1.5 text-[12px] text-text-3 hover:text-brand"
        aria-label="Add a widget to this empty area"
        data-editor-tools
      >
        <Plus size={13} />Add widget
      </button>
      </div>
    </div>
  )
}

export function ContainerBlock({ block, layout }: { block: BlockConfig; layout?: CSSProperties }) {
  const { region, dragging } = useCanvas()
  const children = block.children ?? []
  const editable = region !== null

  if (children.length === 0) {
    if (!editable) {
      // Nothing to show a visitor. Rendering the dashed hint here would put
      // "Drop widgets here" on a published website.
      return null
    }
    return <EmptyContainer block={block} region={region} />
  }

  const isGrid = block.variant === 'grid'

  const label = typeof block.props.sectionLabel === 'string' ? block.props.sectionLabel : ''
  const stack = (block.props as { stackOnMobile?: boolean }).stackOnMobile ? ' sb-stack' : ''
  const tablet = Number((block.props as { tabletColumns?: number }).tabletColumns) === 2 ? ' sb-tablet-2' : ''

  return (
    <div className={`relative${stack}${tablet}`} style={layout ?? layoutStyle(block)}>
      {editable && label && (
        <span className="pointer-events-none absolute -top-2.5 left-0 z-[3] rounded bg-bg-4 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-text-2">{label}</span>
      )}
      {editable && isGrid && <ColumnResizeHandle block={block} />}
      {children.map((child, index) => (
        // Each child is drawn through the same entry point as a top-level
        // section, so a widget behaves identically whether it sits on the
        // page or three containers deep.
        <div
          key={child.id}
          className="relative"
          style={{ minWidth: 0, flex: isGrid ? undefined : '1 1 0' }}
        >
          {editable ? (
            <NestedBlock block={child} region={region}>
              <RenderBlock block={child} />
            </NestedBlock>
          ) : (
            <RenderBlock block={child} />
          )}

          {editable && dragging && (
            <>
              <DropZone region={region} index={index} edge="top" parentId={block.id} />
              <DropZone region={region} index={index + 1} edge="bottom" parentId={block.id} />
            </>
          )}
        </div>
      ))}
    </div>
  )
}
