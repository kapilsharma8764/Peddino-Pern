import { useDroppable } from '@dnd-kit/core'
import type { SiteRegion } from '@/blocks/types'

/**
 * Half a section, as a landing place.
 *
 * Each section gets two of these while a drag is in progress — its top half
 * drops above it, its bottom half below. Aiming at a full half-section is
 * something you can do on a trackpad; aiming at an eighteen-pixel strip
 * between sections, which is what this replaces, is not.
 *
 * They only exist during a drag, so nothing sits on top of the page the rest
 * of the time.
 */
export function DropZone({
  region,
  index,
  edge,
  parentId = null,
}: {
  region: SiteRegion
  /** Where a drop here inserts the block. */
  index: number
  edge: 'top' | 'bottom'
  /** The container this gap is inside, or null for the page itself. */
  parentId?: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${parentId ?? region}-${edge}-${index}`,
    data: { kind: 'gap', region, index, parentId },
  })

  return (
    <div
      ref={setNodeRef}
      // Named so a test can aim at a specific gap. Landing places carry no
      // text and no role of their own — they are deliberately invisible until
      // something is dragged over them — so there is nothing else to aim at.
      data-drop-gap={`${parentId ?? region}-${index}`}
      className={`absolute inset-x-0 ${edge === 'top' ? 'top-0' : 'bottom-0'} h-1/2 z-[3]`}
      aria-hidden="true"
    >
      {isOver && (
        <>
          <div
            className={`absolute inset-x-3 h-1 rounded-full bg-brand ${
              edge === 'top' ? 'top-0' : 'bottom-0'
            }`}
          />
          <span
            className={`absolute left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-medium whitespace-nowrap ${
              edge === 'top' ? 'top-1' : 'bottom-1'
            }`}
          >
            Drop here
          </span>
        </>
      )}
    </div>
  )
}

/** The landing place after the last section, and the whole of an empty region. */
export function DropEnd({
  region,
  index,
  parentId = null,
}: {
  region: SiteRegion
  index: number
  parentId?: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${parentId ?? region}-end-${index}`,
    data: { kind: 'gap', region, index, parentId },
  })

  return (
    <div
      ref={setNodeRef}
      data-drop-end={parentId ?? region}
      className="relative z-[3] transition-all"
      style={{ height: isOver ? 64 : 40 }}
      aria-hidden="true"
    >
      <div
        className={`absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-full transition-all ${
          isOver ? 'h-1 bg-brand' : 'h-px bg-brand/25'
        }`}
      />
      {isOver && (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-brand text-white text-[10px] font-medium whitespace-nowrap">
          Drop here
        </span>
      )}
    </div>
  )
}
