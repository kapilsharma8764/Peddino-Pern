import { type ReactNode, useRef, useEffect } from 'react'
import { blockName } from '@/lib/block-names'
import { Copy, Clipboard, ClipboardPaste, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { regionBlocks, regionOfBlock } from '@/store/site-shape'
import { useElementEditing } from './useElementEditing'
import { useEditorStore } from '@/store/editorStore'
import { useScrollReveal } from '@/lib/useScrollReveal'
import type { BlockConfig, SiteRegion } from './types'

interface Props {
  block: BlockConfig
  /** Position within its region, needed when the section is dragged. */
  index: number
  region: SiteRegion
  isSelected: boolean
  onSelect: () => void
  children: ReactNode
}

export function BlockWrapper({ block, index, region, isSelected, onSelect, children }: Props) {
  // The up/down controls need to know how long the list this block sits in is,
  // and that list may be the header, the page or the footer.
  const blocks = useConfigStore((s) =>
    regionBlocks(s.config, regionOfBlock(s.config, block.id, s.activePageId), s.activePageId),
  )
  const { duplicateBlock, removeBlock, moveBlock, pasteBlockAfter } = useConfigStore()
  const { selectedBlockId, selectBlock, clipboardBlock, setClipboardBlock } = useEditorStore()
  const editing = useElementEditing(block, region)
  const previewMode = useEditorStore((s) => s.previewMode)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { ref: revealRef, isRevealed } = useScrollReveal(!previewMode)

  // Only the handle starts a drag, so clicking anywhere on a section still
  // selects it and text inside stays selectable.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `section-${block.id}`,
    data: { kind: 'move', id: block.id, region, index },
  })

  const isFirst = index === 0
  const isLast = index === blocks.length - 1

  useEffect(() => {
    if (isSelected && scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])


  // ── Editing text on the page ───────────────────────────────────────────
  // Double-click a piece of text a widget has marked as editable and type
  // straight into it. Hunting for the right box in the side panel every time
  // you want to change a word is the difference between a builder that feels
  // direct and one that feels like filling in a form.
  if (previewMode) {
    return (
      <div
        ref={revealRef}
        className={isRevealed ? 'scroll-revealed' : ''}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      ref={(el) => {
        editing.setRoot(el);
        (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        ;(revealRef as React.MutableRefObject<HTMLDivElement | null>).current = el
        // The section itself is what is being dragged. Without this the
        // handle started a gesture that had no subject: nothing was measured,
        // nothing followed the pointer, and letting go did nothing at all.
        setNodeRef(el)
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      data-block-owner={block.id}
      onClickCapture={editing.onClickCapture}
      onKeyDownCapture={editing.onKeyDownCapture}
      onDoubleClickCapture={editing.onDoubleClickCapture}
      className={`scroll-revealed relative cursor-pointer border-b border-border-subtle group transition-[opacity,transform] duration-500 ${
        isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${
        isSelected
          ? 'bg-brand-glow2 outline outline-2 outline-brand -outline-offset-2 rounded animate-select-pulse'
          : 'hover:bg-brand-glow2'
      }`}
      role="button"
      aria-label={`${block.type} block${isSelected ? ', selected' : ''}`}
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        // Enter and space select the section — but not while someone is
        // typing into it, where space is a space and swallowing it makes the
        // text come out as one long word.
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      style={{
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: isDragging ? 0.4 : undefined,
      }}
    >
      {/* Block type tag */}
      {region === 'page' && <span
        className={`absolute top-0 -translate-y-1/2 left-2 text-[9px] font-semibold uppercase tracking-wider text-brand bg-brand-glow px-1.5 py-0.5 rounded transition-opacity z-10 ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        {blockName(block)}
      </span>}

      {/* Typing straight onto the page is not discoverable on its own, so the
          selected section says so once. */}
      {isSelected && region === 'page' && (
        <span className="absolute bottom-1.5 left-1.5 text-[9px] text-text-3 bg-bg-1/85 px-1.5 py-0.5 rounded z-10 pointer-events-none">
          Double-click text to edit it
        </span>
      )}

      {/* Action buttons */}
      <div data-editor-tools
        className={`absolute top-0 -translate-y-1/2 right-2 flex gap-0.5 z-10 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="w-6 h-6 rounded bg-bg-2/80 border border-border-default backdrop-blur-sm flex items-center justify-center text-text-3 hover:text-text-0 hover:bg-bg-3 transition-colors cursor-grab active:cursor-grabbing"
          title="Drag to move"
          aria-label={`Drag ${block.type} section to move it`}
        >
          <GripVertical size={12} />
        </button>
        {!isFirst && (
          <button
            onClick={(e) => { e.stopPropagation(); useConfigStore.getState().setActiveRegion(region); moveBlock(index, index - 1) }}
            className="w-6 h-6 rounded bg-bg-2/80 border border-border-default backdrop-blur-sm flex items-center justify-center text-text-3 hover:text-text-0 hover:bg-bg-3 transition-colors"
            title="Move up"
            aria-label={`Move ${block.type} block up`}
          >
            <ChevronUp size={12} />
          </button>
        )}
        {!isLast && (
          <button
            onClick={(e) => { e.stopPropagation(); useConfigStore.getState().setActiveRegion(region); moveBlock(index, index + 1) }}
            className="w-6 h-6 rounded bg-bg-2/80 border border-border-default backdrop-blur-sm flex items-center justify-center text-text-3 hover:text-text-0 hover:bg-bg-3 transition-colors"
            title="Move down"
            aria-label={`Move ${block.type} block down`}
          >
            <ChevronDown size={12} />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); duplicateBlock(block.id) }}
          className="w-6 h-6 rounded bg-bg-2/80 border border-border-default backdrop-blur-sm flex items-center justify-center text-text-3 hover:text-text-0 hover:bg-bg-3 transition-colors"
          title="Duplicate"
          aria-label={`Duplicate ${block.type} block`}
        >
          <Copy size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setClipboardBlock(block) }}
          className="w-6 h-6 rounded bg-bg-2/80 border border-border-default backdrop-blur-sm flex items-center justify-center text-text-3 hover:text-text-0 hover:bg-bg-3 transition-colors"
          title="Copy (Ctrl+C)"
          aria-label={`Copy ${block.type} block`}
        >
          <Clipboard size={12} />
        </button>
        {clipboardBlock && (
          <button
            onClick={(e) => { e.stopPropagation(); pasteBlockAfter(block.id, clipboardBlock) }}
            className="w-6 h-6 rounded bg-bg-2/80 border border-border-default backdrop-blur-sm flex items-center justify-center text-text-3 hover:text-text-0 hover:bg-bg-3 transition-colors"
            title="Paste after this block (Ctrl+V)"
            aria-label={`Paste ${clipboardBlock.type} block after this one`}
          >
            <ClipboardPaste size={12} />
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (selectedBlockId === block.id) selectBlock(null)
            removeBlock(block.id)
            toast('Block removed', {
              action: {
                label: 'Undo',
                onClick: () => {
                  useConfigStore.getState().undo()
                  toast('Block restored')
                },
              },
              duration: 3000,
            })
          }}
          className="w-6 h-6 rounded bg-bg-2/80 border border-border-default backdrop-blur-sm flex items-center justify-center text-text-3 hover:text-status-red hover:bg-status-red/10 transition-colors"
          title="Delete"
          aria-label={`Delete ${block.type} block`}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {children}
    </div>
  )
}
