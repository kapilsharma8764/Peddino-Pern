import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import type { BlockConfig } from '@/blocks/types'
import { beginHistoryGroup, endHistoryGroup, useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'

/**
 * Drag handles between the columns of the selected layout (2 to 4 columns).
 *
 * Dragging the line between two columns moves width from one to the other and
 * leaves every other column as it was. The result is written as column widths
 * (for example 3.5fr 6.5fr), the same value that can be typed into "Column
 * widths". A whole drag is one undo step. The handles live inside the container
 * and only on the canvas, for the selected container, never on a published page.
 *
 * Auto-fit grids are left alone: their column count depends on the screen, so
 * there is no fixed set of columns to resize.
 */
const MIN_SHARE = 0.08

interface Measure { widths: number[]; gap: number }

function measure(grid: HTMLElement): Measure | null {
  const style = getComputedStyle(grid)
  const widths = style.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => !Number.isNaN(n))
  if (widths.length < 2 || widths.length > 4) return null
  return { widths, gap: parseFloat(style.columnGap) || 0 }
}

export function ColumnResizeHandle({ block }: { block: BlockConfig }) {
  const selected = useEditorStore((s) => s.selectedBlockId === block.id)
  const updateBlockProps = useConfigStore((s) => s.updateBlockProps)
  // Tablet and phone draw their own columns, so only the desktop view has widths to drag.
  const desktop = useEditorStore((s) => s.viewport === 'desktop')
  const anchor = useRef<HTMLSpanElement>(null)
  const [splits, setSplits] = useState<number[]>([])
  const template = String(block.props.template ?? '')
  const manual = !/auto-(fit|fill)/.test(template)

  useLayoutEffect(() => {
    const grid = anchor.current?.parentElement
    const m = selected && manual && desktop && grid ? measure(grid) : null
    if (!m) { setSplits([]); return }
    let x = 0
    setSplits(m.widths.slice(0, -1).map((w) => { x += w; const at = x + m.gap / 2; x += m.gap; return at }))
  }, [selected, manual, desktop, template, block.children?.length])

  function drag(index: number, event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const grid = anchor.current?.parentElement
    const m = grid ? measure(grid) : null
    if (!grid || !m) return
    const box = grid.getBoundingClientRect()
    const total = m.widths.reduce((sum, w) => sum + w, 0)
    // Where the left edge of the column being resized starts.
    const start = m.widths.slice(0, index).reduce((sum, w) => sum + w + m.gap, 0)
    const pair = m.widths[index] + m.widths[index + 1]
    const min = total * MIN_SHARE
    const left = Math.min(pair - min, Math.max(min, event.clientX - box.left - m.gap / 2 - start))
    const next = [...m.widths]
    next[index] = left
    next[index + 1] = pair - left
    const tracks = next.map((w) => `minmax(0, ${Math.round((w / total) * 100) / 10}fr)`)
    updateBlockProps(block.id, { template: tracks.join(' ') })
  }

  return (
    <>
      {/* An invisible anchor keeps the ref alive, so the grid can be measured once it is selected. */}
      <span ref={anchor} className="hidden" aria-hidden="true" />
      {splits.map((left, index) => (
        <div
          key={index}
          data-editor-tools
          role="separator"
          aria-orientation="vertical"
          aria-label={splits.length === 1 ? 'Drag to resize the columns' : `Drag to resize columns ${index + 1} and ${index + 2}`}
          title="Drag to resize the columns"
          onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); beginHistoryGroup() }}
          onPointerMove={(event) => drag(index, event)}
          onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); endHistoryGroup() }}
          onPointerCancel={() => endHistoryGroup()}
          onClick={(event) => event.stopPropagation()}
          className="absolute top-0 bottom-0 z-[5] w-3 -translate-x-1/2 cursor-col-resize touch-none group/resize"
          style={{ left }}
        >
          <span className="absolute inset-y-2 left-1/2 w-[3px] -translate-x-1/2 rounded-full bg-brand/70 group-hover/resize:bg-brand" />
        </div>
      ))}
    </>
  )
}
