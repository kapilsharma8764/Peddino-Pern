import type { BlockConfig, SiteConfig } from '@/blocks/types'
import { blockMetadata } from '@/lib/block-metadata'
import { newId } from '@/lib/id'
import { syncMenu } from '@/store/site-shape'
import { layoutMap, slotKey } from './registry/layouts'
import type { LayoutDef, PageOptions, PageSpec, RowDef, SiteSpec, WidgetRef } from './types'

/** Splits `"hero:split"` into the widget type and an optional variant. */
export function parseRef(ref: WidgetRef): { type: string; variant?: string } {
  const [type, variant] = ref.split(':')
  return { type, variant }
}

export const metaFor = (type: string) => blockMetadata.find((entry) => entry.type === type)
export const isKnownWidget = (ref: WidgetRef) => Boolean(metaFor(parseRef(ref).type))

/**
 * One widget, exactly as the library defines it. Only prop values the widget
 * already has can be overridden — that is how text and images get filled in
 * without touching the widget's own design.
 */
export function makeBlock(ref: WidgetRef, content?: Record<string, unknown>): BlockConfig | null {
  const { type, variant } = parseRef(ref)
  const meta = metaFor(type)
  if (!meta) return null
  const props = structuredClone(meta.defaultProps) as Record<string, unknown>
  for (const [key, value] of Object.entries(content ?? {})) {
    if (key in props && value !== '' && value !== undefined) props[key] = value
  }
  return {
    id: newId(`block-${type}`),
    type: type as BlockConfig['type'],
    variant: variant && meta.variants.includes(variant) ? variant : meta.variants[0] ?? 'default',
    props,
  }
}

function container(children: BlockConfig[], props: Record<string, unknown>): BlockConfig {
  return {
    id: newId('block-container'),
    type: 'container',
    variant: 'grid',
    props: { direction: 'row', gap: 32, align: 'center', justify: 'start', wrap: true, stackOnMobile: true, ...props },
    style: { paddingTop: 48, paddingBottom: 48, width: 'centered' },
    children,
  }
}

function slotBlock(page: PageSpec, row: RowDef, slotName: string): BlockConfig | null {
  const key = slotKey(row.id, slotName)
  const ref = page.slots[key]
  return ref ? makeBlock(ref, page.content?.[key]) : null
}

/** The blocks one row of a layout becomes, given the page's options. */
export function rowBlocks(page: PageSpec, row: RowDef): BlockConfig[] {
  const get = (name: string) => slotBlock(page, row, name)
  const { reverse, columns, sidebar } = page.options

  if (row.kind === 'full') {
    const block = get(row.slots[0].name)
    return block ? [block] : []
  }

  if (row.kind === 'split') {
    const pair = [get('left'), get('right')].filter((block): block is BlockConfig => block !== null)
    if (reverse) pair.reverse()
    if (pair.length < 2) return pair
    return [container(pair, { columns: 2, template: 'minmax(0, 1fr) minmax(0, 1fr)' })]
  }

  if (row.kind === 'grid') {
    const cells = row.slots.slice(0, columns).map((entry) => get(entry.name)).filter((block): block is BlockConfig => block !== null)
    return cells.length ? [container(cells, { columns, align: 'stretch' })] : []
  }

  // sidebar: main content at 70%, the sidebar at 30%, on whichever side was chosen.
  const main = get('main')
  const side = get('side')
  if (!main) return side && sidebar !== 'none' ? [side] : []
  if (!side || sidebar === 'none') return [main]
  return [container(sidebar === 'left' ? [side, main] : [main, side], { columns: 2, align: 'start', template: sidebar === 'left' ? 'minmax(0, 3fr) minmax(0, 7fr)' : 'minmax(0, 7fr) minmax(0, 3fr)' })]
}

export function pageBlocks(page: PageSpec): BlockConfig[] {
  const layout = layoutMap.get(page.layout)
  if (!layout) return []
  const order = page.options.order.length ? page.options.order : layout.rows.map((row) => row.id)
  const rows = order.map((id) => layout.rows.find((row) => row.id === id)).filter((row): row is RowDef => Boolean(row))
  return rows.flatMap((row) => rowBlocks(page, row))
}

/**
 * The editor's own site shape, built from the spec. One header and one footer
 * serve every page, and the menu is generated from the pages that exist.
 */
export function compile(spec: SiteSpec): SiteConfig {
  const header = makeBlock(spec.header)
  const footer = makeBlock(spec.footer)
  const pages = spec.pages.map((page, index) => ({
    id: newId('page'),
    name: page.name,
    path: index === 0 ? '/' : `/${page.slug || page.layout}`,
    showInMenu: page.showInMenu ?? page.layout !== '404',
    blocks: pageBlocks(page),
  }))
  const site: SiteConfig = {
    name: spec.name || 'My website',
    header: header ? [header] : [],
    footer: footer ? [footer] : [],
    pages,
    blocks: pages[0]?.blocks ?? [],
  }
  return syncMenu(site)
}

export function defaultOptions(layout: LayoutDef): PageOptions {
  return { reverse: false, columns: 3, sidebar: 'right', order: layout.rows.map((row) => row.id), ...layout.defaults }
}
