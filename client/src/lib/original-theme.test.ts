// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { SiteConfig } from '@/blocks/types'
import { patchOriginal, originalModel } from '@/editor/original-model'
import { exportOriginalDocument } from './original-document'
import {
  buildThemeRules,
  colorsIn,
  detectPalette,
  effectivePalette,
  formatColor,
  makeMapper,
  parseColor,
  remapStyleAttribute,
  replaceColors,
  type Observation,
  type Palette,
} from './original-palette'
import { applyOriginalThemeToHtml, currentPalette } from './original-theme'
import { presetPalette, resolvedOriginalSectionPalette, sectionsCss, ATTR } from './original-sections'
import { contrast } from './color'

const obs = (selector: string, property: string, value: string, role: Observation['role'], extra: Partial<Observation> = {}): Observation => ({
  wrappers: [],
  selector,
  property,
  value,
  role,
  ...extra,
})

/** A small design: white page, dark text, orange brand, and a blue framework default nobody uses. */
const OBSERVATIONS: Observation[] = [
  obs('body', 'background-color', 'rgb(255, 255, 255)', 'bg', { used: 1 }),
  obs('body', 'color', 'rgb(51, 51, 51)', 'text', { used: 1 }),
  obs('a', 'color', 'rgb(230, 100, 20)', 'text', { used: 12 }),
  obs('.btn-cta', 'background-color', 'rgb(230, 100, 20)', 'bg', { used: 3 }),
  obs('.btn-cta', 'color', 'rgb(255, 255, 255)', 'text', { used: 3 }),
  obs('.alert-info', 'background-color', 'rgb(0, 123, 255)', 'bg', { used: 0 }),
  obs('.band', 'background-color', 'rgb(240, 240, 240)', 'bg', { used: 4 }),
  obs('.band h2', 'color', 'rgb(51, 51, 51)', 'text', { used: 4 }),
  obs('.hero h2', 'color', 'rgb(255, 255, 255)', 'text', { used: 1 }),
  obs('.card', 'border-top-color', 'rgb(221, 221, 221)', 'border', { used: 6 }),
  obs('.muted', 'color', 'rgb(119, 119, 119)', 'text', { used: 5 }),
]

describe('colour parsing', () => {
  it('reads hex, rgb, rgba and hsl in either syntax', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 })
    expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 })
    expect(parseColor('rgb(1 2 3 / 50%)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 })
    expect(parseColor('rgba(1,2,3,.25)')?.a).toBe(0.25)
    expect(parseColor('hsl(0, 100%, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 1 })
    expect(parseColor('not a colour')).toBeNull()
  })

  it('finds colours inside a gradient and leaves url() alone', () => {
    expect(colorsIn('linear-gradient(#fff, rgba(0,0,0,.5)), url(images/white.png)')).toHaveLength(2)
    expect(replaceColors('url(white.png)', () => '#000000')).toBe('url(white.png)')
  })
})

describe('detecting a design’s palette', () => {
  const palette = detectPalette(OBSERVATIONS)

  it('names the page, text, brand and card colours from how they are used', () => {
    expect(palette.background).toBe('#ffffff')
    expect(palette.text).toBe('#333333')
    expect(palette.primary).toBe('#e66414')
    expect(palette.muted).toBe('#777777')
    expect(palette.border).toBe('#dddddd')
  })

  it('ignores colours for components the pages never use', () => {
    expect(Object.values(palette)).not.toContain('#007bff')
  })

  it('gives every token a value even from an empty stylesheet', () => {
    const empty = detectPalette([])
    for (const value of Object.values(empty)) expect(value).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('does not choose white text on a white page when the page colour is a photograph', () => {
    const result = detectPalette([obs('body', 'color', 'rgb(255, 255, 255)', 'text', { used: 1 })])
    expect(contrast(result.text, result.background)).toBeGreaterThanOrEqual(3)
  })
})

describe('repainting', () => {
  const detected = detectPalette(OBSERVATIONS)

  it('emits nothing while the owner has changed nothing', () => {
    expect(buildThemeRules(OBSERVATIONS, detected, {})).toBe('')
  })

  it('moves the brand colour wherever it is used, and nothing else', () => {
    const rules = buildThemeRules(OBSERVATIONS, detected, { primary: '#2563eb' })
    expect(rules).toContain('a{color:#2563eb}')
    expect(rules).toContain('.btn-cta{background-color:#2563eb}')
    // The white button label and the grey text are not brand colours.
    expect(rules).not.toContain('.btn-cta{color:#2563eb}')
  })

  it('keeps a hover shade a step darker than the colour it belongs to', () => {
    const withHover = [...OBSERVATIONS, obs('a:hover', 'color', 'rgb(200, 80, 10)', 'text', { used: 12 })]
    const rules = buildThemeRules(withHover, detectPalette(withHover), { primary: '#2563eb' })
    const hover = /a:hover\{color:(#[0-9a-f]{6})\}/.exec(rules)?.[1]
    expect(hover).toBeTruthy()
    expect(hover).not.toBe('#2563eb')
    expect(contrast(hover!, '#ffffff')).toBeGreaterThan(contrast('#2563eb', '#ffffff') - 0.01)
  })

  it('copies competing rules in the template’s own order so the cascade is unchanged', () => {
    // `.section h2` is brand-coloured, `.dark h2` overrides it with white later on.
    const cascade = [
      obs('body', 'color', 'rgb(51, 51, 51)', 'text', { used: 1 }),
      obs('a', 'color', 'rgb(230, 100, 20)', 'text', { used: 5 }),
      obs('.section h2', 'color', 'rgb(230, 100, 20)', 'text', { used: 2 }),
      obs('.dark h2', 'color', 'rgb(255, 255, 255)', 'text', { used: 2 }),
    ]
    const rules = buildThemeRules(cascade, detectPalette(cascade), { primary: '#2563eb' })
    expect(rules.indexOf('.section h2')).toBeLessThan(rules.indexOf('.dark h2'))
  })

  it('does not mark copies important unless the template did', () => {
    const rules = buildThemeRules(
      [...OBSERVATIONS, obs('.force', 'color', 'rgb(230, 100, 20)', 'text', { used: 1, important: true })],
      detected,
      { primary: '#2563eb' },
    )
    expect(rules).toContain('.force{color:#2563eb!important}')
    expect(rules).not.toContain('a{color:#2563eb!important}')
  })

  it('keeps media queries around the rules that were in them', () => {
    const media = [...OBSERVATIONS, obs('.nav a', 'color', 'rgb(230, 100, 20)', 'text', { used: 3, wrappers: ['@media (max-width: 600px)'] })]
    expect(buildThemeRules(media, detectPalette(media), { primary: '#2563eb' })).toContain('@media (max-width: 600px){.nav a{color:#2563eb}}')
  })

  it('turning the page dark turns dark text light but leaves white headings alone', () => {
    const rules = buildThemeRules(OBSERVATIONS, detected, { background: '#0f172a', text: '#e2e8f0' })
    expect(rules).toContain('body{background-color:#0f172a}')
    expect(rules).toContain('body{color:#e2e8f0}')
    expect(rules).not.toContain('.hero h2{color:#0f172a')
  })

  it('moves cards, muted text and borders with the page so a dark page does not keep light cards', () => {
    const effective = effectivePalette(detected, { background: '#0f172a', text: '#e2e8f0' })
    expect(effective.surface).not.toBe(detected.surface)
    expect(contrast(effective.text, effective.surface)).toBeGreaterThanOrEqual(4.5)
    // Unless they were chosen by hand.
    expect(effectivePalette(detected, { background: '#0f172a', text: '#e2e8f0', surface: '#333333' }).surface).toBe('#333333')
  })

  it('leaves a faint white wash over a photograph out of the page-background family', () => {
    const map = makeMapper(detected, { ...detected, background: '#0f172a' })
    expect(map({ r: 255, g: 255, b: 255, a: 0.1 }, 'bg')).toBeNull()
    expect(formatColor(map({ r: 255, g: 255, b: 255, a: 1 }, 'bg')!)).toBe('#0f172a')
  })

  it('repaints inline styles but not colours the owner set by hand', () => {
    const style = 'color:#e66414;background-color:#e66414 !important;padding:4px'
    expect(remapStyleAttribute(style, detected, { primary: '#2563eb' })).toBe('color:#2563eb;background-color:#e66414 !important;padding:4px')
  })
})

describe('section colours on an imported design', () => {
  const detected = detectPalette(OBSERVATIONS)

  it('Style 2 and 3 stay readable and follow the palette', () => {
    for (const preset of ['style2', 'style3'] as const) {
      const p = presetPalette(detected, preset)
      expect(contrast(p.heading, p.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(p.text, p.bg)).toBeGreaterThanOrEqual(4.5)
    }
    expect(presetPalette(detected, 'style3').bg).toBe(detected.primary)
  })

  it('reports what an image section will show, for the contrast note', () => {
    const shown = resolvedOriginalSectionPalette(detected, { preset: 'image', image: { overlayColor: '#000000', overlayOpacity: 70 } })
    expect(contrast(shown.heading, shown.background)).toBeGreaterThanOrEqual(4.5)
  })

  const page = '<!DOCTYPE html><html><head><title>t</title></head><body><header><nav><a href="#">Home</a></nav></header><section><h2>About</h2><p>Text</p></section><footer>f</footer></body></html>'

  function styledPage() {
    const model = originalModel(page)
    const section = model.sections.find((s) => s.kind === 'section')!
    return patchOriginal(page, section.id, { ptColors: { preset: 'style3' } })
  }

  it('is stored on the element, so it survives saving and reloading the page', () => {
    const html = styledPage()
    expect(html).toContain('data-pt-colors')
    const reloaded = originalModel(html)
    const section = reloaded.sections.find((s) => s.kind === 'section')!
    expect(reloaded.nodes.get(section.id)?.ptColors?.preset).toBe('style3')
  })

  it('can be cleared, returning the section to the design as shipped', () => {
    const html = styledPage()
    const id = originalModel(html).sections.find((s) => s.kind === 'section')!.id
    const cleared = patchOriginal(html, id, { ptColors: null })
    expect(cleared).not.toContain('data-pt-colors')
    expect(cleared).not.toContain(ATTR)
  })

  it('Style 1 is the design as shipped and stores nothing', () => {
    const id = originalModel(page).sections.find((s) => s.kind === 'section')!.id
    expect(patchOriginal(page, id, { ptColors: { preset: 'style1' } })).not.toContain('data-pt-colors')
  })

  it('only touches the section it was applied to', () => {
    const css = sectionsCss(new DOMParser().parseFromString(styledPage(), 'text/html'), detected)
    expect(css).toContain('background-color:var(--pt-style3-bg')
    expect(css.match(/\[data-pt-s="[^"]+"\]/g)?.every((selector) => selector === css.match(/\[data-pt-s="[^"]+"\]/)![0])).toBe(true)
  })

  it('rejects a colour that is not a colour rather than writing it into the stylesheet', () => {
    const id = originalModel(page).sections.find((s) => s.kind === 'section')!.id
    const html = patchOriginal(page, id, { ptColors: { overrides: { background: 'red;}body{display:none' } } })
    expect(html).not.toContain('display:none')
  })

  describe('in the published file', () => {
    const block = (html: string) => ({ id: 'b', type: 'hero' as const, variant: 'x', props: { originalTemplate: true, sourceUrl: 'https://x.test/index.html', html } })
    const config = (html: string, theme?: SiteConfig['originalTheme']): SiteConfig => ({ name: 'x', blocks: [block(html)], originalTheme: theme })

    it('is untouched when no theme has been read or chosen', () => {
      const out = exportOriginalDocument(config(page))!
      expect(out).not.toContain('pt-theme')
    })

    it('carries the palette variables, the owner’s colour rules and the section rules', () => {
      const theme = { detected: detected as unknown as Record<string, string>, tokens: { primary: '#2563eb' }, rules: 'a{color:#2563eb}' }
      const out = exportOriginalDocument(config(styledPage(), theme))!
      expect(out).toContain('id="pt-theme"')
      expect(out).toContain('--pt-primary:#2563eb')
      expect(out).toContain('a{color:#2563eb}')
      expect(out).toContain('id="pt-sections"')
      expect(out).toMatch(/data-pt-s="[^"]+"/)
      // Style 3 is the primary colour, so it moves with the palette.
      expect(out).toContain('--pt-style3-bg:#2563eb')
    })

    it('applies to a page given as a string, and repaints its inline styles', () => {
      const html = '<!DOCTYPE html><html><head></head><body><p style="color:#e66414">x</p></body></html>'
      const theme = { detected: detected as unknown as Record<string, string>, tokens: { primary: '#2563eb' }, rules: '' }
      expect(applyOriginalThemeToHtml(html, theme)).toContain('color:#2563eb')
      expect(currentPalette(theme)?.primary).toBe('#2563eb')
    })
  })
})

// Kept so the type import is used and the shape is checked.
export type _Palette = Palette
