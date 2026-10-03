import { useElementEditing } from './useElementEditing'
import { type ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Copy, GripVertical, Trash2 } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { blockName } from '@/lib/block-names'
import { useEditorStore } from '@/store/editorStore'
import type { BlockConfig, SiteRegion } from './types'

/**
 * A widget inside a container, on the canvas.
 *
 * Top-level sections get `BlockWrapper`, which is built around the idea of a
 * band across the page: it has up and down arrows, it knows how long the page
 * is, and it lays a full-width toolbar over the section. None of that suits a
 * widget sitting in one column of a two-column layout, where the controls have
 * to be small, sit inside the column, and where moving means dragging rather
 * than stepping through a list.
 *
 * So this is deliberately a smaller thing: select it, drag it, copy it, delete
 * it. Everything else about editing a nested widget happens in the side panel,
 * which already addresses blocks by id and so reaches them at any depth.
 */
export function NestedBlock({
  block,
  region,
  children,
}: {
  block: BlockConfig
  region: SiteRegion
  children: ReactNode
}) {
  const editing = useElementEditing(block, region)
  const selectedBlockId = useEditorStore((s) => s.selectedBlockId)
  const selectBlock = useEditorStore((s) => s.selectBlock)
  const previewMode = useEditorStore((s) => s.previewMode)
  const setActiveRegion = useConfigStore((s) => s.setActiveRegion)
  const removeBlock = useConfigStore((s) => s.removeBlock)
  const duplicateBlock = useConfigStore((s) => s.duplicateBlock)

  // Only the handle starts a drag, so clicking the widget still selects it and
  // the text inside stays selectable.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `nested-${block.id}`,
    // `index` is left out on purpose: a nested move is resolved by id and
    // parent, never by a position in a flat list.
    data: { kind: 'move', id: block.id, region, index: -1 },
  })

  const isSelected = selectedBlockId === block.id

  if (previewMode) return <>{children}</>

  return (
    <div
      ref={node => { setNodeRef(node); editing.setRoot(node) }}
      data-block-owner={block.id}
      onClickCapture={editing.onClickCapture}
      onKeyDownCapture={editing.onKeyDownCapture}
      onDoubleClickCapture={editing.onDoubleClickCapture}
      className={`relative group/nested rounded-sm transition-opacity ${
        isDragging ? 'opacity-40' : ''
      }`}
      onClick={(event) => {
        // Stopped so the click does not also select every container above this
        // one on its way out to the page.
        event.stopPropagation()
        selectBlock(block.id)
        setActiveRegion(region)
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-[2] rounded-sm transition-colors ${
          isSelected
            ? 'outline outline-2 outline-brand'
            : 'outline outline-1 outline-transparent group-hover/nested:outline-brand/40'
        }`}
        aria-hidden="true"
      />

      <span
        data-editor-tools
        className={`pointer-events-none absolute -top-2.5 left-1 z-[4] rounded bg-brand-glow px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-brand transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover/nested:opacity-100'
        }`}
      >{blockName(block, true)}</span>

      <div data-editor-tools
        // Placed a little inside, and above the toolbar of the container it sits in (z-10): a first child shares the container's
        // top edge, so the two overlap, and the one being pointed at must be the one that answers.
        // While hidden it must not catch clicks meant for the container's own buttons.
        className={`absolute top-4 right-1 z-[12] flex items-center gap-0.5 rounded-md bg-bg-1 border border-border-default shadow-sm transition-opacity ${
          isSelected ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover/nested:pointer-events-auto group-hover/nested:opacity-100'
        }`}
      >
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          type="button"
          title="Drag to move"
          aria-label={`Move ${block.type}`}
          className="w-6 h-6 grid place-items-center text-text-3 hover:text-text-0 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={12} />
        </button>
        <button
          type="button"
          title="Duplicate"
          aria-label={`Duplicate ${block.type}`}
          onClick={(event) => {
            event.stopPropagation()
            duplicateBlock(block.id)
          }}
          className="w-6 h-6 grid place-items-center text-text-3 hover:text-text-0"
        >
          <Copy size={12} />
        </button>
        <button
          type="button"
          title="Delete"
          aria-label={`Delete ${block.type}`}
          onClick={(event) => {
            event.stopPropagation()
            removeBlock(block.id)
            if (isSelected) selectBlock(null)
          }}
          className="w-6 h-6 grid place-items-center text-text-3 hover:text-status-red"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {children}
    </div>
  )
}
