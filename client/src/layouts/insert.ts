import type { BlockConfig } from '@/blocks/types'
import { canDrop } from '@/lib/block-tree'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { regionBlocks } from '@/store/site-shape'
import type { DropTarget } from '@/builder/dnd'
import { buildLayout } from './layouts'

/**
 * Puts a layout on the page.
 *
 * An explicit spot wins: the "+ Add section" pill, an "Add here" seam, an empty
 * area's "Add widget", or a drop. With none chosen the layout goes to the end
 * of the open page, never into whatever happens to be selected, so adding a
 * section can never surprise anyone by nesting itself inside a widget.
 */
export function insertLayout(layoutId: string, target?: DropTarget): BlockConfig {
  const block = buildLayout(layoutId)
  placeBlock(block, target)
  return block
}

/** Places an already-built block (a layout, or a page structure's section) at a spot. */
export function placeBlock(block: BlockConfig, target?: DropTarget): void {
  const store = useConfigStore.getState()
  const editor = useEditorStore.getState()

  const spot: DropTarget = target ?? (editor.insertTarget
    ? { kind: 'gap', ...editor.insertTarget }
    : { kind: 'gap', region: 'page', index: regionBlocks(store.config, 'page', store.activePageId).length, parentId: null })

  if (!canDrop(regionBlocks(store.config, spot.region, store.activePageId), null, spot.parentId ?? null)) {
    throw new Error('Select a valid container for this layout')
  }
  store.setActiveRegion(spot.region)
  store.addBlock(block, spot.index, spot.parentId ?? null)
  editor.setInsertTarget(null)
  editor.selectBlock(block.id)
}
