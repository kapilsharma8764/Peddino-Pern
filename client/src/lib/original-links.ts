import type { SiteConfig } from '@/blocks/types'
import { pageForButton } from './auto-link-buttons'

/** Keep original markup, but store internal destinations by immutable page id. */
export function normalizeOriginalLinks(site: SiteConfig): SiteConfig {
  if (typeof DOMParser === 'undefined' || !site.pages) return site
  const pages = site.pages.map(page => ({ ...page, blocks: page.blocks.map(block => {
    if (!block.props.originalTemplate || typeof block.props.html !== 'string') return block
    const doc = new DOMParser().parseFromString(block.props.html, 'text/html')
    let changed = false
    doc.querySelectorAll('a,button').forEach(el => {
      const href = el.getAttribute('href') ?? ''
      if (href.startsWith('page:') || el.hasAttribute('onclick') || el.hasAttribute('data-toggle') || el.hasAttribute('data-bs-toggle')) return
      let target, hash = ''
      if (href && !href.startsWith('#')) {
        try {
          const url = new URL(href, String(block.props.sourceUrl))
          hash = url.hash
          url.hash = ''
          url.search = ''
          const canonical = (value: string) => value.replace(/(?:index\.html?)?\/?$/i, '')
          const homeSource = site.pages?.[0]?.blocks.find(b => b.props.originalTemplate)?.props.sourceUrl
          const rooted = href.startsWith('/') && typeof homeSource === 'string'
            ? new URL(href.slice(1), new URL('.', homeSource)).href.split(/[?#]/)[0] : ''
          target = site.pages?.find(p => p.blocks.some(b => typeof b.props.sourceUrl === 'string' &&
            (canonical(b.props.sourceUrl) === canonical(url.href) || (rooted && canonical(b.props.sourceUrl) === canonical(rooted)))))
        } catch { /* External/custom destinations stay untouched. */ }
      } else if (!href && !(site.migrationVersion ?? 0) && (el.tagName === 'BUTTON' || el.matches('.btn,.button'))) {
        if (el.closest('form')) return
        target = pageForButton(el.textContent ?? '', site.pages!, true)
      }
      if (target) { el.setAttribute('href', `page:${target.id}${hash}`); changed = true }
    })
    return changed ? { ...block, props: { ...block.props, html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML } } : block
  }) }))
  return { ...site, pages, blocks: pages[0].blocks }
}
