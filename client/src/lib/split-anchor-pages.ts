import { findChrome } from '@/editor/original-model'
import { newId } from './id'
import type { BlockConfig, PageConfig } from '@/blocks/types'

/**
 * Many one-page templates never had separate About/Services/Contact files —
 * their nav just scrolls to `#about`, `#services`, `#contact` sections
 * stacked on the one page. That reads fine on the original site, but in this
 * builder it means the "Service" page a visitor expects to open never
 * existed: clicking it here just scrolled the same Home page.
 *
 * This turns each of those nav-linked sections into a real page of its own —
 * header and footer copied in (the same "include" every other page here
 * carries), the section's own content in the middle — and rewrites every
 * `#id` link, on Home and on the new pages alike, to point at the page it
 * now leads to. Home keeps whatever the nav never linked to (its hero,
 * usually) plus the header and footer.
 */

interface Candidate { id: string; name: string }

/** Nav links that point at a same-page section worth splitting off, in nav order, deduplicated. */
function anchorCandidates(doc: Document, header: Element | null, footer: Element | null): Candidate[] {
  const { menu } = findChrome(doc)
  if (!menu) return []
  const seen = new Set<string>()
  const candidates: Candidate[] = []
  for (const link of [...menu.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]) {
    const id = (link.getAttribute('href') || '').slice(1)
    const name = link.textContent?.trim() || ''
    // "Home" itself is not a section to split out — it is wherever the nav's
    // own hero content already sits, and splitting it would just duplicate it.
    if (!id || !name || seen.has(id) || /^home$/i.test(id) || /^home$/i.test(name)) continue
    const target = doc.getElementById(id)
    if (!target || target === header || target === footer || header?.contains(target) || footer?.contains(target)) continue
    seen.add(id)
    candidates.push({ id, name })
  }
  return candidates
}

/** Removes every child of `parent` that is not the header, the footer, or an ancestor of `keep`. */
function stripSiblings(parent: Element, header: Element | null, footer: Element | null, keep: Set<Element>) {
  for (const child of [...parent.children]) {
    if (child === header || child === footer || keep.has(child)) continue
    if (header?.contains(child) || footer?.contains(child)) continue
    child.remove()
  }
}

/** A page built from just the header, footer, and the single `#id` section, everything else stripped. */
function pageAroundSection(html: string, id: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const { header, footer } = findChrome(doc)
  const target = doc.getElementById(id)
  if (!target) return null
  const keep = new Set<Element>()
  for (let node: Element | null = target; node; node = node.parentElement) keep.add(node)
  stripSiblings(doc.body, header, footer, keep)
  for (let node: Element | null = target.parentElement; node && node !== doc.body; node = node.parentElement) {
    stripSiblings(node, header, footer, keep)
  }
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

/** Home's own HTML with the now-split-off sections removed. */
function pageWithoutSections(html: string, ids: string[]): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const id of ids) doc.getElementById(id)?.remove()
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

/** Every `#id` nav link rewritten to the real page path it now leads to. */
function withLinksRewritten(html: string, hrefMap: Map<string, string>): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    const next = hrefMap.get(link.getAttribute('href') || '')
    if (next) link.setAttribute('href', next)
  })
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'page'
}

/**
 * If `homePage` is really a one-page template whose nav points at sections
 * on itself, returns the equivalent multi-page site — Home plus one page per
 * linked section. Returns `null` when there is nothing to split (fewer than
 * two distinct nav-linked sections), so callers can fall back to the single
 * page exactly as they found it.
 */
export function splitAnchorPages(homePage: PageConfig, sourceUrl: string): PageConfig[] | null {
  const homeBlock = homePage.blocks.find((item) => item.props.originalTemplate)
  if (!homeBlock) return null
  const html = String(homeBlock.props.html)
  const probe = new DOMParser().parseFromString(html, 'text/html')
  const { header, footer } = findChrome(probe)
  const candidates = anchorCandidates(probe, header, footer)
  if (candidates.length < 2) return null

  const hrefMap = new Map<string, string>()
  const split: { candidate: Candidate; path: string; html: string }[] = []
  for (const candidate of candidates) {
    const pageHtml = pageAroundSection(html, candidate.id)
    if (!pageHtml) continue
    const path = `/${slugify(candidate.name)}`
    hrefMap.set(`#${candidate.id}`, path)
    split.push({ candidate, path, html: pageHtml })
  }
  if (split.length < 2) return null

  const homeHtml = withLinksRewritten(pageWithoutSections(html, split.map((s) => s.candidate.id)), hrefMap)
  const homeBlockRewritten: BlockConfig = { ...homeBlock, props: { ...homeBlock.props, html: homeHtml } }
  const pages: PageConfig[] = [{ ...homePage, blocks: [homeBlockRewritten] }]

  for (const { candidate, path, html: sectionHtml } of split) {
    const rewritten = withLinksRewritten(sectionHtml, hrefMap)
    const block: BlockConfig = {
      id: newId('original'),
      type: homeBlock.type,
      variant: homeBlock.variant,
      props: { title: candidate.name, html: rewritten, sourceUrl, originalTemplate: true, height: 1000 },
    }
    pages.push({ id: newId('page'), name: candidate.name, path, showInMenu: true, blocks: [block] })
  }
  return pages
}
