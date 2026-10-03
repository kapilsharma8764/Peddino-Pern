import { useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
  MeasuringStrategy,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { blockMetadata } from '@/lib/block-metadata'
import { handleWidgetDrop } from './core'
import { insertLayout } from '@/layouts/insert'
import { isDragPayload, isDropTarget, resolveMoveIndex, type DragPayload } from './dnd'
import { canDrop } from '@/lib/block-tree'
import { regionBlocks } from '@/store/site-shape'

/**
 * Drag and drop across the whole editor.
 *
 * One context wraps the widget library and the canvas, which is what lets a
 * widget be dragged out of the list and dropped onto the page — the thing
 * people expect of a builder and the reason this is not simply a sortable list
 * inside the canvas.
 */

function label(payload: DragPayload | null): string {
  if (!payload) return ''
  if (payload.kind === 'layout') return payload.label
  if (payload.kind === 'new') {
    return blockMetadata.find((meta) => meta.type === payload.type)?.label ?? payload.type
  }
  return 'Move section'
}

/**
 * Which landing place a drop belongs to.
 *
 * `closestCenter` alone compares the centre of what is being dragged against
 * the centre of every landing place. That is the right answer for a stack of
 * sections and the wrong one as soon as landing places overlap, which they do
 * in two places here:
 *
 *  - A container's own drop area sits inside the drop strips of the sections
 *    around it, so a drop aimed squarely into the container was won by the
 *    section below it and the widget landed beside the container.
 *  - The strip at the end of the page meets the top strip of the footer. A
 *    drop at the bottom of the page was read as a drop into the footer, and
 *    refused with a message about headers and footers — so nothing could be
 *    added to the end of a page by dragging at all.
 *
 * So the pointer decides first, and among the places it is inside, the most
 * specific one wins: a container before the page, and the part of the site the
 * drag started in before any other. Only when the pointer is over nothing does
 * the distance-based answer apply, which is what keeps a drop into the gap
 * between two sections working.
 */
function nestingAwareCollision(args: Parameters<typeof closestCenter>[0]) {
  const under = pointerWithin(args)
  if (under.length === 0) return args.pointerCoordinates ? [] : closestCenter(args)

  const dragged = args.active.data.current
  const region = isDragPayload(dragged) && dragged.kind === 'move' ? dragged.region : null

  const targetOf = (collision: (typeof under)[number]) => {
    const data = collision.data?.droppableContainer?.data?.current
    return isDropTarget(data) ? data : null
  }

  // A container before the page it sits on.
  const nested = under.find((collision) => targetOf(collision)?.parentId != null)
  if (nested) return [nested]

  // Then the region the drag began in, so a drop at the bottom of the page is
  // not read as a drop into the footer that happens to start there.
  if (region) {
    const sameRegion = under.find((collision) => targetOf(collision)?.region === region)
    if (sameRegion) return [sameRegion]
  }

  return under
}

export function BuilderDndContext({ children }: { children: ReactNode }) {
  const moveBlock = useConfigStore((s) => s.moveBlock)
  const moveBlockTo = useConfigStore((s) => s.moveBlockTo)
  const setActiveRegion = useConfigStore((s) => s.setActiveRegion)

  const [dragging, setDragging] = useState<DragPayload | null>(null)

  const sensors = useSensors(
    // A few pixels of movement before a drag starts, so clicking a widget to
    // select it does not turn into an accidental drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  function handleStart(event: DragStartEvent) {
    const data = event.active.data.current
    setDragging(isDragPayload(data) ? data : null)
  }

  function handleEnd(event: DragEndEvent) {
    const payload = dragging
    setDragging(null)
    if (!payload) return

    const target = event.over?.data.current
    if (!isDropTarget(target)) return

    if (payload.kind === 'layout') {
      try { insertLayout(payload.layoutId, target); toast(`${payload.label} added`) }
      catch { toast('Select a valid container for this layout') }
      return
    }

    if (payload.kind === 'new') {
      const meta = blockMetadata.find((m) => m.type === payload.type)
      if (!meta) return
      try { handleWidgetDrop(payload.type, target); toast(`${meta.label} added`) }
      catch { toast('Select a valid container for this widget') }
      return
    }

    if (payload.region !== target.region) {
      // Moving between the page and the shared header or footer would change
      // what appears on other pages, which is not what a drag looks like it
      // does. Say so rather than doing it silently.
      toast('Sections cannot be dragged between the page and the header or footer')
      return
    }

    const parentId = target.parentId ?? null

    // A move that crosses in or out of a container cannot be expressed as two
    // positions in one list, so it goes through the tree instead. The flat
    // path stays for the common case of nudging a section up or down the page,
    // where it is cheaper and already proven.
    const nested = parentId !== null || payload.index < 0
    if (nested) {
      const state = useConfigStore.getState()
      const blocks = regionBlocks(state.config, payload.region, state.activePageId)

      // Dropping a container into itself, or into something it contains,
      // would detach that whole branch from the page.
      if (!canDrop(blocks, payload.id, parentId)) {
        toast('A layout cannot be moved inside itself')
        return
      }

      setActiveRegion(payload.region)
      moveBlockTo(payload.id, parentId, target.index)
      return
    }

    const to = resolveMoveIndex(payload.index, target.index)
    if (to === payload.index) return
    setActiveRegion(payload.region)
    moveBlock(payload.index, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={nestingAwareCollision}
      // The landing places only appear once a drag has begun, and a droppable
      // that appears after the drag was measured is never measured at all —
      // so the page picked a section up and then had nowhere to put it down.
      // Measuring throughout the drag is what makes them real targets.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => setDragging(null)}
    >
      {children}

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div className="px-3 py-1.5 rounded-lg bg-brand text-white text-[11.5px] font-medium shadow-lg pointer-events-none">
            {label(dragging)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
