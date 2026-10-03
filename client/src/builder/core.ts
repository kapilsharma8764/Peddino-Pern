import type { BlockConfig, BlockType, SiteConfig, SiteRegion } from '@/blocks/types'
import { blockMetadata } from '@/lib/block-metadata'
import { canDrop, findBlock, isContainer, locate } from '@/lib/block-tree'
import { exportSitePages, type ExportedPage } from '@/lib/export-html'
import type { ExportSiteOptions } from '@/lib/export-html'
import { newId } from '@/lib/id'
import { inlineLocalAssets } from '@/lib/inline-assets'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore, type InsertMode } from '@/store/editorStore'
import { rememberWidget } from '@/layouts/widget-prefs'
import { ensurePages, regionBlocks, regionOfBlock, splitHeaderFooter, syncMenu } from '@/store/site-shape'
import type { DropTarget } from './dnd'

/** Start from a selected template and the profile already applied by onboarding. */
export function initBuilder(template: SiteConfig): SiteConfig {
  const config = syncMenu(splitHeaderFooter(template))
  useConfigStore.getState().setConfig(config)
  return useConfigStore.getState().config
}

/** One shared shell around the page currently open in the editor. */
export function renderSkeleton(config: SiteConfig, activePageId: string) {
  const pages = ensurePages(config)
  const page = pages.find((candidate) => candidate.id === activePageId) ?? pages[0]
  return {
    header: config.header ?? [],
    main: page.blocks,
    footer: config.footer ?? [],
    page,
  }
}

/** Create a fresh JSON node and insert it through the store's undoable tree action. */
export function handleWidgetDrop(type: BlockType, target: DropTarget): BlockConfig {
  const meta = blockMetadata.find((widget) => widget.type === type)
  if (!meta) throw new Error(`Unknown widget: ${type}`)

  const block: BlockConfig = {
    id: newId(`block-${type}`),
    type,
    variant: meta.variants[0] ?? 'default',
    props: structuredClone(meta.defaultProps),
  }
  const store = useConfigStore.getState()
  if (!canDrop(regionBlocks(store.config, target.region, store.activePageId), null, target.parentId ?? null)) throw new Error('Select a valid container for this widget')
  store.setActiveRegion(target.region)
  store.addBlock(block, target.index, target.parentId ?? null)
  // A widget that has just been added is the thing to work on next: select it
  // (which also scrolls it into view) so its settings are already open.
  useEditorStore.getState().selectBlock(block.id)
  rememberWidget(type)
  return block
}

/**
 * Where a widget added from the library should land.
 *
 * An "Add here" control on the canvas wins outright, being an explicit choice
 * of a spot. Otherwise the widget goes next to whatever is selected — before
 * it, after it, or inside it when it is a container — and only with nothing
 * selected does it fall back to the end of the page. Appending regardless was
 * the bug: the widget landed at the bottom however carefully a spot was picked.
 */
export function resolveInsertTarget(mode: InsertMode = useEditorStore.getState().insertMode): DropTarget {
  const editor = useEditorStore.getState()
  const { config, activePageId } = useConfigStore.getState()

  if (editor.insertTarget) return { kind: 'gap', ...editor.insertTarget }

  const endOfPage: DropTarget = {
    kind: 'gap',
    region: 'page',
    index: regionBlocks(config, 'page', activePageId).length,
    parentId: null,
  }
  if (!editor.selectedBlockId || mode === 'end') return endOfPage

  const region: SiteRegion = regionOfBlock(config, editor.selectedBlockId, activePageId)
  const where = locate(regionBlocks(config, region, activePageId), editor.selectedBlockId)
  if (!where) return endOfPage

  const selected = where.siblings[where.index]
  if (mode === 'inside' && isContainer(selected)) {
    return { kind: 'gap', region, parentId: selected.id, index: selected.children?.length ?? 0 }
  }
  return {
    kind: 'gap',
    region,
    parentId: where.parent?.id ?? null,
    index: mode === 'before' ? where.index : where.index + 1,
  }
}

/** Adds a widget from the library at the spot `resolveInsertTarget` chooses, then clears any one-shot "Add here" choice. */
export function addWidgetSmart(type: BlockType, mode?: InsertMode): BlockConfig {
  const target = resolveInsertTarget(mode)
  const block = handleWidgetDrop(type, target)
  useEditorStore.getState().setInsertTarget(null)
  return block
}

/** Point an action field at a page by ID, while storing its stable site path. */
export function linkPages(blockId: string, targetPageId: string, propKey = 'url'): string {
  const store = useConfigStore.getState()
  const page = ensurePages(store.config).find((candidate) => candidate.id === targetPageId)
  if (!page) throw new Error(`Unknown page: ${targetPageId}`)
  const region: SiteRegion = regionOfBlock(store.config, blockId, store.activePageId)
  const block = findBlock(regionBlocks(store.config, region, store.activePageId), blockId)
  if (!block) throw new Error(`Unknown widget: ${blockId}`)
  store.updateBlockProps(blockId, { [propKey]: `page:${page.id}` })
  return page.path
}

/** Compile every page with the shared shell and assets ready for download/publish. */
export async function exportSite(config: SiteConfig, options?: ExportSiteOptions): Promise<ExportedPage[]> {
  // An original template from the gallery, published to a server that holds its
  // files, keeps referring to them there. Anything else (an uploaded site, a
  // block-built one) is made self-contained as before.
  const originals = [...config.blocks, ...(config.pages ?? []).flatMap((page) => page.blocks)].filter((block) => block.props.originalTemplate)
  const hostedTemplate = Boolean(options?.assetOrigin) && originals.length > 0 &&
    originals.every((block) => /^https?:\/\/[^/]+\/original-templates\//.test(String(block.props.sourceUrl)))
  const standalone = hostedTemplate ? config : await inlineLocalAssets(config)
  return exportSitePages(standalone, options)
}
