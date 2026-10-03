import type { OriginalTheme, SiteConfig } from '@/blocks/types'
import {
  buildThemeRules,
  colorsIn,
  detectPalette,
  effectivePalette,
  remapStyleAttribute,
  roleOfProperty,
  type Observation,
  type Palette,
} from './original-palette'
import { presetVars, sectionsCss } from './original-sections'
import { THEME_TOKENS } from './theme-tokens'

/**
 * Theme colours for imported HTML designs, from reading to painting.
 *
 * The pure logic lives in `original-palette.ts` and `original-sections.ts`.
 * This file is the part that touches documents: it reads a template's
 * stylesheets, and it lays the result over a page — in the editor's canvas and
 * in the exported files alike, through the same function, so what is edited is
 * what is published.
 */

const TOKEN_IDS = THEME_TOKENS.map((token) => token.id)

/** The stored palette, if it is complete enough to use. */
export function detectedPalette(theme: OriginalTheme | undefined): Palette | null {
  const detected = theme?.detected
  if (!detected || !TOKEN_IDS.every((id) => typeof detected[id] === 'string')) return null
  return detected as Palette
}

/** The palette the design currently wears: what was detected, under the owner's choices. */
export function currentPalette(theme: OriginalTheme | undefined): Palette | null {
  const detected = detectedPalette(theme)
  return detected ? effectivePalette(detected, (theme?.tokens ?? {}) as Partial<Palette>) : null
}

/** The CSS variables and rules a page needs to wear the theme. Empty when nothing has been read yet. */
export function originalThemeCss(theme: OriginalTheme | undefined): string {
  const palette = currentPalette(theme)
  if (!palette) return ''
  return `:root{${presetVars(palette)}}\n${theme?.rules ?? ''}`
}

const hasInlineColours = (el: Element) => {
  const style = el.getAttribute('style') ?? ''
  return /color|background|border|fill|stroke/i.test(style)
}

/**
 * Lays the theme over a parsed page: the owner's palette, then any section
 * colours. Inline styles are repainted in place, since no stylesheet rule can
 * reach them; everything else goes into style elements added last.
 */
export function applyOriginalTheme(doc: Document, theme: OriginalTheme | undefined): void {
  const palette = currentPalette(theme)
  const detected = detectedPalette(theme)
  if (!palette || !detected) return

  const tokens = (theme?.tokens ?? {}) as Partial<Palette>
  if (Object.keys(tokens).length) {
    doc.querySelectorAll('[style]').forEach((el) => {
      if (!hasInlineColours(el)) return
      const before = el.getAttribute('style') ?? ''
      const after = remapStyleAttribute(before, detected, tokens)
      if (after !== before) el.setAttribute('style', after)
    })
  }

  const host = doc.head ?? doc.documentElement
  const themeStyle = doc.createElement('style')
  themeStyle.id = 'pt-theme'
  themeStyle.textContent = originalThemeCss(theme)
  host.append(themeStyle)

  const sections = sectionsCss(doc, palette)
  if (sections) {
    const sectionStyle = doc.createElement('style')
    sectionStyle.id = 'pt-sections'
    sectionStyle.textContent = sections
    host.append(sectionStyle)
  }
}

/** The inline `style` attributes of a page after the theme is applied, keyed by editor node id. */
export function themedInlineStyles(doc: Document, theme: OriginalTheme | undefined, nodeAttr: string): { id: string; style: string }[] {
  const detected = detectedPalette(theme)
  const tokens = (theme?.tokens ?? {}) as Partial<Palette>
  if (!detected) return []
  const out: { id: string; style: string }[] = []
  doc.querySelectorAll(`[style][${nodeAttr}]`).forEach((el) => {
    if (!hasInlineColours(el)) return
    const before = el.getAttribute('style') ?? ''
    out.push({ id: el.getAttribute(nodeAttr)!, style: Object.keys(tokens).length ? remapStyleAttribute(before, detected, tokens) : before })
  })
  return out
}

/** The same, for a page that is still a string — the exported file. */
export function applyOriginalThemeToHtml(html: string, theme: OriginalTheme | undefined): string {
  if (!detectedPalette(theme)) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  applyOriginalTheme(doc, theme)
  const doctype = /^\s*<!doctype[^>]*>/i.exec(html)?.[0] ?? '<!DOCTYPE html>'
  return `${doctype}\n${doc.documentElement.outerHTML}`
}

/* ------------------------------------------------------------------ */
/* Reading a template's stylesheets                                   */
/* ------------------------------------------------------------------ */

/** Turns CSS text into the colour-carrying declarations in it, using the browser's own parser. */
export function parseObservations(css: string): Observation[] {
  const style = document.createElement('style')
  // Parsed but never applied to the editor itself.
  style.media = 'not all'
  style.textContent = css
  document.head.append(style)
  const out: Observation[] = []
  try {
    const walk = (rules: CSSRuleList, wrappers: string[]) => {
      for (const rule of Array.from(rules)) {
        const styled = rule as CSSStyleRule
        if (typeof styled.selectorText === 'string' && styled.style) {
          for (let i = 0; i < styled.style.length; i += 1) {
            const property = styled.style[i]
            const role = roleOfProperty(property)
            if (!role) continue
            const value = styled.style.getPropertyValue(property)
            // Declarations with no colour in them still matter: `transparent` or
            // `inherit` may be what makes a later colour lose, and the copies
            // have to compete the way the originals did.
            const carriesColour = colorsIn(value).length > 0
            if (value && (carriesColour || property !== 'background-image' || /^none$/i.test(value))) out.push({ wrappers, selector: styled.selectorText, property, value, role, important: styled.style.getPropertyPriority(property) === 'important' })
          }
          continue
        }
        const grouping = rule as CSSGroupingRule & { conditionText?: string }
        if (!grouping.cssRules) continue
        // Animations and font faces hold declarations that are not page styles.
        if (/^@(-webkit-)?(keyframes|font-face|page|property)/i.test(rule.cssText)) continue
        if (/^@media/i.test(rule.cssText)) walk(grouping.cssRules, [...wrappers, `@media ${grouping.conditionText ?? ''}`])
        else if (/^@supports/i.test(rule.cssText)) walk(grouping.cssRules, [...wrappers, `@supports ${grouping.conditionText ?? ''}`])
        else walk(grouping.cssRules, wrappers)
      }
    }
    if (style.sheet) walk(style.sheet.cssRules, [])
  } finally {
    style.remove()
  }
  return out
}

const sheetCache = new Map<string, Promise<string | null>>()

async function fetchCss(url: string): Promise<string | null> {
  if (!sheetCache.has(url)) {
    sheetCache.set(
      url,
      fetch(url)
        .then((response) => (response.ok ? response.text() : null))
        .then((text) => (text && text.length < 2_000_000 ? text : null))
        .catch(() => null),
    )
  }
  return sheetCache.get(url)!
}

/** Follows `@import` one or two levels deep, since some templates keep their real CSS there. */
async function withImports(text: string, from: string, depth = 0): Promise<string[]> {
  const sheets = [text]
  if (depth >= 2) return sheets
  for (const match of text.matchAll(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/gi)) {
    let url: string
    try {
      url = new URL(match[1], from).href
    } catch {
      continue
    }
    if (!/^https?:/i.test(url)) continue
    const imported = await fetchCss(url)
    if (imported) sheets.push(...(await withImports(imported, url, depth + 1)))
  }
  return sheets
}

/**
 * Notes how many elements each observation's selector matches across the
 * site's pages. State selectors (`:hover`, `::before`) are judged by the
 * element they belong to, and a selector the browser cannot evaluate counts as
 * used, so nothing is discarded on a technicality.
 */
function countUsage(observations: Observation[], htmls: string[]): Observation[] {
  const docs = [...new Set(htmls)].map((html) => new DOMParser().parseFromString(html, 'text/html'))
  const cache = new Map<string, number>()
  const count = (selector: string): number => {
    if (cache.has(selector)) return cache.get(selector)!
    let total = 0
    for (const part of selector.split(',')) {
      const stripped = part
        .replace(/::?(?:hover|focus|active|visited|focus-within|focus-visible|before|after|first-letter|first-line|selection|placeholder|-[\w-]+|[\w-]+-(?:thumb|track|button))/gi, '')
        .trim() || '*'
      for (const doc of docs) {
        try {
          total += Math.min(doc.querySelectorAll(stripped).length, 50)
        } catch {
          total += 1
        }
      }
    }
    cache.set(selector, total)
    return total
  }
  return observations.map((o) => ({ ...o, used: /^(html|body|:root)$/i.test(o.selector.trim()) ? 50 : count(o.selector) }))
}

const observationCache = new Map<string, Promise<Observation[]>>()

/**
 * Every colour declaration in every stylesheet the site's pages use, in the
 * order the browser would apply them. Cached, because the same files serve
 * every page and the owner may change a colour many times in a minute.
 */
export function loadObservations(config: SiteConfig): Promise<Observation[]> {
  const blocks = [...config.blocks, ...(config.pages ?? []).flatMap((page) => page.blocks)].filter(
    (block) => block.props.originalTemplate && typeof block.props.html === 'string',
  )
  const key = blocks.map((block) => `${block.props.sourceUrl}:${String(block.props.html).length}`).join('|')
  if (!observationCache.has(key)) {
    observationCache.clear()
    observationCache.set(
      key,
      (async () => {
        const texts: string[] = []
        const seen = new Set<string>()
        for (const block of blocks) {
          const source = String(block.props.sourceUrl)
          const doc = new DOMParser().parseFromString(String(block.props.html), 'text/html')
          for (const element of Array.from(doc.querySelectorAll('style,link[rel~="stylesheet"]'))) {
            if (element.tagName === 'STYLE') {
              const text = element.textContent ?? ''
              if (text && !seen.has(`inline:${text}`)) {
                seen.add(`inline:${text}`)
                texts.push(...(await withImports(text, source)))
              }
              continue
            }
            let url: string
            try {
              url = new URL(element.getAttribute('href') ?? '', source).href
            } catch {
              continue
            }
            if (!/^https?:/i.test(url) || seen.has(url)) continue
            seen.add(url)
            const text = await fetchCss(url)
            if (text) texts.push(...(await withImports(text, url)))
          }
        }
        const observations = texts.flatMap((text) => parseObservations(text))
        return countUsage(observations, blocks.map((block) => String(block.props.html)))
      })(),
    )
  }
  return observationCache.get(key)!
}

/** Reads the palette out of a site's stylesheets. */
export async function readOriginalPalette(config: SiteConfig): Promise<Palette> {
  return detectPalette(await loadObservations(config))
}

/** The stored theme after the owner changes some tokens: new choices, and the CSS that carries them. */
export async function withTokenChange(
  config: SiteConfig,
  change: Partial<Palette> | null,
): Promise<OriginalTheme | null> {
  const detected = detectedPalette(config.originalTheme)
  if (!detected) return null
  const tokens: Partial<Palette> = change === null ? {} : { ...(config.originalTheme?.tokens as Partial<Palette>), ...change }
  // A token put back to the template's own colour is no longer a choice.
  for (const id of TOKEN_IDS) if (tokens[id] === detected[id]) delete tokens[id]
  const rules = Object.keys(tokens).length ? buildThemeRules(await loadObservations(config), detected, tokens) : ''
  return { ...config.originalTheme, tokens, rules }
}
