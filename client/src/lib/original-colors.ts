import type { PageColors, ThemeConfig } from '@/blocks/types'
import { findChrome } from '@/editor/original-model'
import { normalizeHex } from './color'

/** Mark scopes without introducing wrappers that change template layout. */
export function markOriginalColorScopes(doc: Document) {
  const { header, footer } = findChrome(doc)
  header?.setAttribute('data-pt-region-root', 'header')
  footer?.setAttribute('data-pt-region-root', 'footer')
  doc.body.querySelectorAll('*').forEach(el => {
    const scope = header?.contains(el) ? 'header' : footer?.contains(el) ? 'footer' : 'page'
    if (scope === 'page' && (el.contains(header) || el.contains(footer))) return
    el.setAttribute('data-pt-scope', scope)
    if (scope === 'page' && el.parentElement?.getAttribute('data-pt-scope') !== 'page') el.setAttribute('data-pt-page-root', '')
  })
}

export function originalColorCss(colors?: PageColors, theme?: Partial<ThemeConfig>): string {
  const rules: string[] = []
  const rule = (selector: string, prop: string, value?: string) => {
    const hex = value && normalizeHex(value)
    if (hex) rules.push(`${selector}{${prop}:${hex}!important}`)
  }
  rule('[data-pt-page-root]', 'background-color', colors?.background)
  rule('[data-pt-scope="page"]', 'color', colors?.text)
  rule('[data-pt-scope="page"]:is(h1,h2,h3,h4,h5,h6)', 'color', colors?.heading)
  for (const region of ['header', 'footer'] as const) {
    rule(`[data-pt-region-root="${region}"]`, 'background-color', theme?.[`${region}Background`])
    rule(`[data-pt-scope="${region}"]`, 'color', theme?.[`${region}Text`])
  }
  return rules.join('\n')
}

export function applyOriginalColors(doc: Document, colors?: PageColors, theme?: Partial<ThemeConfig>) {
  markOriginalColorScopes(doc)
  const style = doc.createElement('style')
  style.id = 'pt-page-colors'
  style.textContent = originalColorCss(colors, theme)
  doc.head.append(style)
}
