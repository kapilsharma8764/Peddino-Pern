import type { BlockMeta } from './block-metadata'
import type { BlockType } from '@/blocks/types'
import { widgetSearchAliases } from './widget-search-aliases'

const aliases: Partial<Record<BlockType, readonly string[]>> = widgetSearchAliases

/** Source catalogue names help find existing widgets without changing their schema. */
export function matchesWidgetSearch(meta: BlockMeta, query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  return [meta.label, meta.type, meta.category, meta.description, ...(aliases[meta.type] ?? [])]
    .some((text) => text.toLowerCase().includes(normalized))
}
