import { applyOriginalColors } from './original-colors'
import type { SiteConfig } from '@/blocks/types'
import { ensurePages } from '@/store/site-shape'
import { pageHref, resolveLink } from './site-links'
import { applyOriginalThemeToHtml } from './original-theme'

/**
 * Rewrite relative assets before the original document leaves its download directory.
 *
 * With `assetOrigin` (a published site), the template's stylesheets, scripts,
 * pictures and fonts are pointed at that server — the API, which serves them out
 * of MongoDB right next to the published page — instead of the address the
 * template happened to be opened from. Links to the site's other pages are not
 * affected: they are still matched against the page addresses.
 */
export function exportOriginalDocument(config: SiteConfig, base = '', asFiles = false, assetOrigin = ''): string | null {
  const block = config.blocks.length === 1 ? config.blocks[0] : null
  if (!block?.props.originalTemplate || typeof block.props.html !== 'string') return null
  const source = String(block.props.sourceUrl)
  const pages = ensurePages(config)
  const served = (() => {
    try { const from = new URL(source); return assetOrigin ? new URL(from.pathname + from.search, assetOrigin).href : source } catch { return source }
  })()
  const asset = (value: string, from = served) => {
    if (!value || /^(#|data:|blob:|mailto:|tel:|javascript:)/i.test(value)) return value
    try { return new URL(value.replaceAll('&amp;', '&'), from).href } catch { return value }
  }
  const css = (value: string) => value.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (_match, _quote, url: string) => `url("${asset(url)}")`)
  let html = block.props.html.replace(/<base\b[^>]*>/gi, '')
  html = html.replace(/<(?:a|button|link|img|script|source|video|audio|input|iframe)\b[^>]*>/gi, tag => tag.replace(/\b(href|src|poster|data-src|data-background)\s*=\s*(["'])(.*?)\2/gi, (_attribute, key: string, quote: string, value: string) => {
    const isLink = /^<(a|button)\b/i.test(tag)
    let url = asset(value, isLink ? source : served)
    if (isLink && key.toLowerCase() === 'href' && value && !value.startsWith('#')) {
      const target = pages.find(page => page.blocks.some(item => item.props.sourceUrl === url.split('#')[0]))
      if (target) url = pageHref(target, pages, base, asFiles) + (url.includes('#') ? '#' + url.split('#')[1] : '')
    }
    if (isLink && key.toLowerCase() === 'href' && value.startsWith('page:')) url = resolveLink(value, pages, base, asFiles).href
    return `${key}=${quote}${url.replaceAll('&', '&amp;').replaceAll(quote, quote === '"' ? '&quot;' : '&#39;')}${quote}`
  }))
  html = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, start, text, end) => start + css(text) + end)
  html = html.replace(/\bstyle=(["'])(.*?)\1/gi, (_m, quote: string, text: string) => {
    const decoded = text.replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
    return `style=${quote}${css(decoded).replaceAll('&', '&amp;').replaceAll(quote, quote === '"' ? '&quot;' : '&#39;')}${quote}`
  })
  // Last, so the owner's theme and section colours sit over the template's own CSS.
  html = applyOriginalThemeToHtml(html, config.originalTheme)
  if (!config.pageColors && !config.theme?.headerBackground && !config.theme?.headerText && !config.theme?.footerBackground && !config.theme?.footerText) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  applyOriginalColors(doc, config.pageColors, config.theme)
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

/**
 * Where `inlineOriginalDocument` reads a local asset's bytes from.
 *
 * The catalog's 146 templates live under `/original-templates/` on this app's
 * own server, so the default source just fetches them. A freshly uploaded zip
 * or folder has no such URL — its files exist only as in-memory data the
 * upload screen already read — so that path is given a source backed by a
 * plain map instead. Either way the CSS, `@import` and `url()` rewriting
 * below is the same code, because a stylesheet does not care where its bytes
 * came from.
 */
export interface AssetSource {
  /** True if this absolute URL is one this source can actually serve. */
  has(url: string): boolean
  /** Raw text — for a stylesheet or script. */
  text(url: string): Promise<string>
  /** A data: URI — for an image, font or other binary file. */
  dataUrl(url: string): Promise<string>
}

/** The default: assets served from this app's own `/original-templates/` folder. */
export function fetchAssetSource(origin: string, prefix = '/original-templates/'): AssetSource {
  async function get(url: string): Promise<Response> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Missing template asset: ${url}`)
    return response
  }
  return {
    has: (url) => { try { const resolved = new URL(url); return resolved.origin === origin && resolved.pathname.startsWith(prefix) } catch { return false } },
    text: async (url) => (await get(url)).text(),
    dataUrl: async (url) => {
      const blob = await (await get(url)).blob()
      return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob) })
    },
  }
}

/** Package original local CSS, scripts, fonts and images into a portable HTML document. */
export async function inlineOriginalDocument(html: string, sourceUrl: string, cache: Map<string, Promise<string>>, source: AssetSource = fetchAssetSource(new URL(sourceUrl).origin)): Promise<string> {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const local = (url: string) => {
    try { const resolved = new URL(url, sourceUrl).href; return source.has(resolved) ? resolved : null } catch { return null }
  }
  const data = (url: string) => {
    if (!cache.has(url)) cache.set(url, source.dataUrl(url))
    return cache.get(url)!
  }
  async function css(text: string, from: string, visited = new Set<string>()): Promise<string> {
    for (const match of [...text.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?\s*;/gi)]) {
      const url = local(new URL(match[1], from).href)
      if (url && !visited.has(url)) {
        visited.add(url)
        try { text = text.replace(match[0], await css(await source.text(url), url, visited)) }
        catch { /* A missing optional import must not prevent opening the site. */ }
      }
    }
    for (const match of [...text.matchAll(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi)]) {
      const url = local(new URL(match[2], from).href)
      if (url) { try { text = text.replace(match[0], `url("${await data(url)}")`) } catch { /* Legacy CSS often lists unused font fallbacks. Keep the original URL. */ } }
    }
    return text
  }
  for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')) {
    const url = local(link.getAttribute('href') || '')
    if (url) {
      try { const style = document.createElement('style'); style.textContent = await css(await source.text(url), url); link.replaceWith(style) }
      catch { /* Preserve the source URL when an optional stylesheet is unavailable. */ }
    }
  }
  for (const script of document.querySelectorAll<HTMLScriptElement>('script[src]')) {
    const url = local(script.getAttribute('src') || '')
    if (url) {
      try {
        const text = await source.text(url)
        script.removeAttribute('src'); script.removeAttribute('integrity'); script.textContent = text.replace(/<\/script/gi, '<\\/script')
      } catch { /* Keep other scripts and the document usable. */ }
    }
  }
  for (const element of document.querySelectorAll<HTMLElement>('img,source,video,audio,input')) {
    for (const attribute of ['src', 'poster', 'data-src', 'data-original']) {
      const value = element.getAttribute(attribute), url = value ? local(value) : null
      if (url) { try { element.setAttribute(attribute, await data(url)) } catch { /* Keep the remaining page usable. */ } }
    }
    // Responsive images otherwise keep selecting a missing archive-relative file
    // even when their fallback src has already been packaged.
    for (const attribute of ['srcset', 'data-srcset']) {
      const value = element.getAttribute(attribute)
      if (!value || value.includes('data:')) continue
      const candidates = await Promise.all(value.split(',').map(async candidate => {
        const [path, ...descriptor] = candidate.trim().split(/\s+/)
        const url = local(path)
        try { return [url ? await data(url) : path, ...descriptor].join(' ') }
        catch { return candidate.trim() }
      }))
      element.setAttribute(attribute, candidates.join(', '))
    }
  }
  for (const element of document.querySelectorAll<HTMLElement>('[style]')) element.setAttribute('style', await css(element.getAttribute('style') || '', sourceUrl))
  for (const style of document.querySelectorAll('style')) style.textContent = await css(style.textContent || '', sourceUrl)
  return '<!DOCTYPE html>\n' + document.documentElement.outerHTML
}
