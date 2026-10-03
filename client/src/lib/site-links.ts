import type { PageConfig } from '@/blocks/types'

/**
 * Working out where a link points.
 *
 * A menu is typed as plain words — "About", "Services", "Contact" — because
 * asking a shop owner to fill in a URL for every menu item would be absurd.
 * So the words are matched against the pages that exist, and only if nothing
 * matches is the text treated as an address of its own.
 *
 * This is what makes a multi-page site actually work: the pages have existed
 * for a while, but nothing linked to them, so every menu item was decoration.
 */

export interface LinkTarget {
  href: string
  /** Set when the link opens a page of this site, rather than leaving it. */
  pageId?: string
  external: boolean
}

export interface NavigationLink { label: string; url: string }

/** Old string menus stay readable; explicit links live separately from auto pages. */
export function navigationLinks(props: Record<string, unknown>): NavigationLink[] {
  const links = Array.isArray(props.links) ? props.links : []
  const extra = Array.isArray(props.extraLinks) ? props.extraLinks : []
  return [
    ...links.filter((link): link is string => typeof link === 'string').map((label) => ({ label, url: label })),
    ...extra.filter((link): link is NavigationLink => Boolean(link && typeof link.label === 'string' && typeof link.url === 'string' && link.label.trim() && link.url.trim())),
  ]
}

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Where one link goes.
 *
 * `base` is the prefix a published site sits under — empty in the editor,
 * "/site/sharma-coaching" once published — so the same resolver serves both.
 */
export function resolveLink(
  raw: string,
  pages: PageConfig[],
  base = '',
  asFiles = false,
): LinkTarget {
  const text = String(raw ?? '').trim()

  if (!text) return { href: '#', external: false }

  // A link made from the page dropdown: `page:<id>`, optionally with a `#section`.
  // Stored by id so renaming the page does not break it.
  const byId = /^page:([^#]+)(#.*)?$/.exec(text)
  if (byId) {
    const page = pages.find((candidate) => candidate.id === byId[1])
    return page
      ? { href: pageHref(page, pages, base, asFiles) + (byId[2] ?? ''), pageId: page.id, external: false }
      : { href: '#', external: false }
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(text) && !/^(https?:\/\/|mailto:|tel:)/i.test(text)) return { href: '#', external: false }
  // Resolve page anchors before treating slash-prefixed URLs as raw paths.
  const hash = text.indexOf('#')
  if (hash > 0) {
    const before = resolveLink(text.slice(0, hash), pages, base, asFiles)
    if (before.pageId) return { ...before, href: before.href + text.slice(hash) }
  }

  // Absolute local page paths must resolve under the published site's base too.
  const localPage = pages.find((page) => page.path === text || pageHref(page, pages, base) === text)
  if (localPage) return { href: pageHref(localPage, pages, base, asFiles), pageId: localPage.id, external: false }

  if (text.startsWith('//')) return { href: `https:${text}`, external: true }
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(text)) {
    return { href: text, external: /^https?:/i.test(text) }
  }

  const wanted = normalise(text)
  const page =
    pages.find((candidate) => normalise(candidate.name) === wanted) ??
    pages.find((candidate) => normalise(candidate.path) === wanted)

  if (page) {
    return { href: pageHref(page, pages, base, asFiles), pageId: page.id, external: false }
  }

  // Something like "example.com" typed without the scheme.
  if (/^(?:[\w-]+\.)+[a-z]{2,}(?:[/?#]|$)/i.test(text)) {
    return { href: `https://${text}`, external: true }
  }

  // Nothing matched — most likely a page that has not been made yet.
  return { href: '#', external: false }
}

/**
 * The address of a page within a published site.
 *
 * The first page is the site's front door and lives at the root; the rest sit
 * under it by name. A visitor should land on the home page at the bare
 * address, not at "/home".
 */
export function pageHref(
  page: PageConfig,
  pages: PageConfig[],
  base = '',
  asFiles = false,
): string {
  // A site saved to disk is a folder of files opened directly, with no server
  // to map "/about" onto anything, so there the pages link by file name.
  if (asFiles) return pageFileName(page, pages)

  const isHome = pages[0]?.id === page.id
  if (isHome) return base || '/'

  const slug = page.path.replace(/^\/+/, '') || normalise(page.name)
  return `${base}/${slug}`
}

/** The file each page is published as. The home page becomes index.html. */
export function pageFileName(page: PageConfig, pages: PageConfig[]): string {
  const isHome = pages[0]?.id === page.id
  if (isHome) return 'index.html'
  const slug = page.path.replace(/^\/+/, '') || normalise(page.name)
  return `${slug}.html`
}
