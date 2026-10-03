import type { BlockConfig, PageConfig, SiteConfig, SiteRegion } from '@/blocks/types'
import { resolveLink } from '@/lib/site-links'
import { walk } from '@/lib/block-tree'

/**
 * Rules about the shape of a site: what belongs to the header, what belongs to
 * a page, and how the navigation stays in step with the pages that exist.
 *
 * Kept apart from the store so it can be reasoned about and tested on its own.
 */

/** Block types that belong above every page rather than inside one. */
const HEADER_TYPES = new Set(['navbar', 'banner'])

/**
 * Types that belong below every page. The floating WhatsApp button is here
 * rather than in the page flow because it is an overlay pinned to the window —
 * it should follow the visitor from page to page like the footer does.
 */
const FOOTER_TYPES = new Set(['footer', 'whatsapp'])

export function ensurePages(config: SiteConfig): PageConfig[] {
  if (config.pages && config.pages.length > 0) return config.pages
  return [{ id: 'page-home', name: 'Home', path: '/', blocks: config.blocks, showInMenu: true }]
}

/**
 * Lifts the header and footer out of a page's blocks.
 *
 * Templates and older saved sites keep the navbar and footer inside the page,
 * because that is how a single-page builder works. Splitting them out once, on
 * load, is what lets one header serve every page.
 */
export function splitHeaderFooter(config: SiteConfig): SiteConfig {
  if (config.header && config.footer) return { ...config, pages: ensurePages(config) }

  const pages = ensurePages(config)
  const first = pages[0]?.blocks ?? []

  const header: BlockConfig[] = []
  let start = 0
  while (start < first.length && HEADER_TYPES.has(first[start].type)) {
    header.push(first[start])
    start += 1
  }

  const footer: BlockConfig[] = []
  let end = first.length
  while (end > start && FOOTER_TYPES.has(first[end - 1].type)) {
    footer.unshift(first[end - 1])
    end -= 1
  }

  // Whatever was lifted off the first page is stripped from the others too, so
  // a multi-page template does not end up with two headers on page two.
  const strippedPages = pages.map((page, index) => ({
    ...page,
    showInMenu: page.showInMenu ?? true,
    blocks:
      index === 0
        ? page.blocks.slice(start, end)
        : page.blocks.filter((b) => !HEADER_TYPES.has(b.type) && !FOOTER_TYPES.has(b.type)),
  }))

  return {
    ...config,
    header: config.header ?? header,
    footer: config.footer ?? footer,
    pages: strippedPages,
    blocks: strippedPages[0]?.blocks ?? [],
  }
}

export function regionBlocks(
  config: SiteConfig,
  region: SiteRegion,
  activePageId: string,
): BlockConfig[] {
  if (region === 'header') return config.header ?? []
  if (region === 'footer') return config.footer ?? []
  const pages = ensurePages(config)
  return (pages.find((p) => p.id === activePageId) ?? pages[0]).blocks
}

/**
 * Which region holds a given block — needed because selection is by id alone.
 *
 * The whole tree is searched, not just the top level: a heading three
 * containers deep inside the footer still belongs to the footer, and editing
 * it must write back there rather than into the page.
 */
export function regionOfBlock(
  config: SiteConfig,
  blockId: string,
  activePageId: string,
): SiteRegion {
  const holds = (blocks: BlockConfig[] | undefined) =>
    Boolean(blocks && walk(blocks).some((block) => block.id === blockId))

  if (holds(config.header)) return 'header'
  if (holds(config.footer)) return 'footer'
  void activePageId
  return 'page'
}

export function mutateRegion(
  config: SiteConfig,
  region: SiteRegion,
  activePageId: string,
  mutator: (blocks: BlockConfig[]) => BlockConfig[],
): SiteConfig {
  if (region === 'header') return { ...config, header: mutator([...(config.header ?? [])]) }
  if (region === 'footer') return { ...config, footer: mutator([...(config.footer ?? [])]) }

  const pages = ensurePages(config)
  const nextPages = pages.map((page) =>
    page.id === activePageId ? { ...page, blocks: mutator([...page.blocks]) } : page,
  )
  const active = nextPages.find((p) => p.id === activePageId) ?? nextPages[0]
  return { ...config, pages: nextPages, blocks: active.blocks }
}

/**
 * Keeps the navigation showing exactly the pages that exist.
 *
 * This is the "dynamic menu" part: add a page and it appears in the menu, remove
 * it and it disappears, without anyone editing the header. Pages can opt out
 * individually — a thank-you page should not be in the menu.
 */
export function syncMenu(config: SiteConfig): SiteConfig {
  const header = config.header

  const links = ensurePages(config)
    .filter((page) => page.showInMenu !== false)
    .map((page) => page.name)

  return {
    ...config,
    header: header?.map((block) =>
      block.type === 'navbar' && block.props.autoPageLinks !== false ? { ...block, props: { ...block.props, linkUrls: ensurePages(config).filter(page => page.showInMenu !== false).map(page => `page:${page.id}`), links: [...links, ...(Array.isArray(block.props.links) ? block.props.links.filter((link): link is string => typeof link === 'string' && (resolveLink(link, []).external || /^(mailto:|tel:)/i.test(link))) : [])] } } : block,
    ),
    footer: config.footer?.map((block) => block.type === 'footer' && block.props.autoPageLinks === true ? {
      ...block, props: { ...block.props, links, columns: [{ title: 'Pages', links }] },
    } : block),
  }
}

/** A URL path from a page name: "Our Services" becomes "/our-services". */
export function pathFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug ? `/${slug}` : '/page'
}

export function uniquePagePath(name: string, pages: PageConfig[], excludeId?: string): string {
  const base = pathFromName(name)
  const used = new Set(pages.filter((page) => page.id !== excludeId).map((page) => page.path))
  let path = base
  let suffix = 2
  while (used.has(path)) path = `${base}-${suffix++}`
  return path
}
