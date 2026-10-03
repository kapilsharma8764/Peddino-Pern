import { describe, expect, it } from 'vitest'
import type { SiteConfig } from '@/blocks/types'
import { buildTemplate, templates } from '@/templates/library'
import { syncMenu, splitHeaderFooter } from '@/store/site-shape'
import { contrast, normalizeHex } from './color'
import { exportSitePages } from './export-html'
import {
  hasSectionColors,
  normalizeSectionColors,
  resolvedSectionPalette,
  safeImageUrl,
  sectionColorCss,
  themeRulesCss,
} from './section-colors'
import { resolveTheme, themeToCSS } from './theme-presets'
import { THEME_TOKENS, themeTokenChange, themeTokenIsCustom } from './theme-tokens'

const light = templates.find((t) => t.theme.bg1 === '#ffffff') ?? templates[0]
const dark = templates.find((t) => t.theme.text0.toLowerCase() > '#e0e0e0' && t.theme.bg1 < '#333333') ?? templates[1]

describe('colour helpers', () => {
  it('accepts 3 and 6 digit hex, with or without the hash, and nothing else', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
    expect(normalizeHex('10405b')).toBe('#10405b')
    expect(normalizeHex('red')).toBeNull()
    expect(normalizeHex('#12345')).toBeNull()
    expect(normalizeHex('#fff;background:url(x)')).toBeNull()
  })
})

describe('normalizeSectionColors', () => {
  it('returns undefined for sites saved before section colours existed', () => {
    expect(normalizeSectionColors(undefined)).toBeUndefined()
    expect(normalizeSectionColors({})).toBeUndefined()
    expect(hasSectionColors(undefined)).toBe(false)
  })

  it('drops unknown presets, non-hex colours and stray keys', () => {
    const clean = normalizeSectionColors({
      preset: 'rainbow',
      overrides: { background: 'javascript:1', heading: '#FFF', nonsense: '#000000' },
      image: { overlayColor: 'url(x)', overlayOpacity: 900 },
    })
    expect(clean).toEqual({ overrides: { heading: '#ffffff' }, image: { overlayOpacity: 100 } })
  })

  it('refuses image addresses that could break out of the stylesheet', () => {
    expect(safeImageUrl('https://x.test/a.jpg')).toBe('https://x.test/a.jpg')
    expect(safeImageUrl('javascript:alert(1)')).toBeNull()
    expect(safeImageUrl('https://x.test/a.jpg");background:red;/*')).not.toContain('"')
    expect(safeImageUrl('data:image/png;base64,iVBOR')).toBe('data:image/png;base64,iVBOR')
    expect(safeImageUrl('data:text/html;base64,AAAA')).toBeNull()
  })
})

describe('section presets follow the template theme', () => {
  for (const template of [light, dark]) {
    describe(template.name, () => {
      const theme = template.theme
      const resolved = resolveTheme(theme)

      it('Style 1 keeps the theme as designed', () => {
        const css = sectionColorCss(theme, { preset: 'style1' })!
        expect(css.style['--color-bg-1']).toBe(resolved.bg1)
        expect(css.style['--color-text-0']).toBe(resolved.text0)
        expect(css.style['--color-brand']).toBe(resolved.accent)
      })

      it('Style 2 swaps to the surface colour and stays readable', () => {
        const css = sectionColorCss(theme, { preset: 'style2' })!
        expect(css.style['--color-bg-1']).toBe(resolved.bg2)
        expect(contrast(css.style['--color-text-0'], css.style['--color-bg-1'])).toBeGreaterThanOrEqual(4.5)
        expect(contrast(css.style['--color-text-1'], css.style['--color-bg-1'])).toBeGreaterThanOrEqual(4.5)
      })

      it('Style 3 is a band in the primary colour with readable text and inverted buttons', () => {
        const css = sectionColorCss(theme, { preset: 'style3' })!
        const ground = css.style['--color-bg-1']
        expect(ground).toBe(resolved.accent)
        expect(contrast(css.style['--color-text-0'], ground)).toBeGreaterThanOrEqual(4.5)
        expect(contrast(css.style['--color-text-1'], ground)).toBeGreaterThanOrEqual(4.5)
        expect(css.style['--color-button']).toBe(css.style['--color-text-0'])
        expect(contrast(css.style['--color-button-text'], css.style['--color-button'])).toBeGreaterThanOrEqual(4.5)
      })

      it('changing the theme changes what a preset produces', () => {
        const before = sectionColorCss(theme, { preset: 'style3' })!.style['--color-bg-1']
        const after = sectionColorCss({ ...theme, accent: '#b91c1c' }, { preset: 'style3' })!.style['--color-bg-1']
        expect(before).not.toBe(after)
        expect(after).toBe('#b91c1c')
      })
    })
  }
})

describe('image sections', () => {
  const colors = { preset: 'image' as const, image: { src: 'https://x.test/p.jpg', overlayColor: '#102030', overlayOpacity: 60 } }

  it('layers the overlay over the photo and keeps text readable against it', () => {
    const css = sectionColorCss(light.theme, colors)!
    expect(css.image).toBe(true)
    expect(css.style.backgroundImage).toBe('linear-gradient(rgba(16,32,48,0.6),rgba(16,32,48,0.6)),url("https://x.test/p.jpg")')
    const palette = resolvedSectionPalette(light.theme, colors)
    expect(contrast(palette.heading, palette.background)).toBeGreaterThanOrEqual(4.5)
  })

  it('shows the tint alone until a photo is chosen', () => {
    const css = sectionColorCss(light.theme, { preset: 'image' })!
    expect(css.style.backgroundImage).toBeUndefined()
    expect(css.style.backgroundColor).toBeTruthy()
  })
})

describe('overrides', () => {
  it('apply on top of the preset and only touch what they name', () => {
    const css = sectionColorCss(light.theme, { preset: 'style2', overrides: { heading: '#ff0000', button: '#00aa00' } })!
    expect(css.style['--color-text-0']).toBe('#ff0000')
    expect(css.style['--color-button']).toBe('#00aa00')
    // Body text is still the preset's.
    expect(css.style['--color-text-1']).toBe(sectionColorCss(light.theme, { preset: 'style2' })!.style['--color-text-1'])
  })

  it('with no preset, change nothing else', () => {
    const css = sectionColorCss(light.theme, { overrides: { link: '#123456' } })!
    expect(css.style['--color-brand']).toBe('#123456')
    expect(css.style['--color-bg-1']).toBeUndefined()
    expect(css.style.backgroundColor).toBeUndefined()
  })

  it('a section with nothing set produces no wrapper', () => {
    expect(sectionColorCss(light.theme, undefined)).toBeNull()
    expect(sectionColorCss(light.theme, { image: { src: 'https://x.test/p.jpg' } })).toBeNull()
  })
})

describe('theme tokens', () => {
  const theme = light.theme

  it('Background moves both grounds and Text carries its body shade with it', () => {
    const bg = themeTokenChange(theme, theme, 'background', '#101820')
    expect(bg.bg1).toBe('#101820')
    expect(bg.bg0).toBeTruthy()
    const text = themeTokenChange(theme, theme, 'text', '#eeeeee')
    expect(text.text0).toBe('#eeeeee')
    expect(text.text1).toBeTruthy()
  })

  it('leaves a shade alone once it has been set by hand', () => {
    const custom = { ...theme, accentDim: '#123456' }
    const change = themeTokenChange(custom, theme, 'primary', '#ff0000')
    expect(change.accent).toBe('#ff0000')
    expect(change.accentDim).toBeUndefined()
  })

  it('knows when a token differs from the template palette', () => {
    expect(THEME_TOKENS.some((t) => themeTokenIsCustom(theme, theme, t.id))).toBe(false)
    expect(themeTokenIsCustom({ ...theme, accent: '#ff0000' }, theme, 'primary')).toBe(true)
  })

  it('exposes every token as a variable plus its rgb channels for the published page', () => {
    const css = themeToCSS(resolveTheme(theme))
    expect(css['--color-button']).toBeTruthy()
    expect(css['--rgb-brand']).toMatch(/^\d+ \d+ \d+$/)
  })

  it('defaults buttons to the accent with white text, as they have always been', () => {
    const css = themeToCSS(resolveTheme(theme))
    expect(css['--color-button']).toBe(theme.accent)
    expect(css['--color-button-text']).toBe('#ffffff')
  })
})

describe('published output', () => {
  function site(): SiteConfig {
    const built = syncMenu(splitHeaderFooter(buildTemplate(light)))
    const pages = built.pages!
    const target = pages[0].blocks.find((b) => b.type === 'features') ?? pages[0].blocks[1]
    const image = pages[0].blocks.find((b) => b.id !== target.id && b.type !== 'navbar') ?? pages[0].blocks[2]
    target.colors = { preset: 'style3' }
    image.colors = { preset: 'image', image: { src: 'https://x.test/p.jpg', overlayColor: '#000000', overlayOpacity: 50 } }
    return { ...built, theme: { ...built.theme, accent: '#b91c1c' } }
  }

  it('carries the theme as variables, on every page', () => {
    const pages = exportSitePages(site())
    expect(pages.length).toBeGreaterThan(1)
    for (const page of pages) {
      expect(page.html).toContain('--brand-primary: #b91c1c')
      expect(page.html).toContain('--color-brand: var(--brand-primary)')
      expect(page.html).toContain('--rgb-brand: 185 28 28')
      // Tailwind reads the variable, so a section can re-point it.
      expect(page.html).toContain("rgb(var(--rgb-brand) / <alpha-value>)")
      expect(page.html).toContain(themeRulesCss().split('\n')[0])
    }
  })

  it('publishes section colours as a rule on the section, and a photo section flagged', () => {
    const html = exportSitePages(site())[0].html
    expect(html).toMatch(/\.s-[\w-]+\{[^}]*--color-bg-1:#b91c1c[^}]*\}/)
    expect(html).toMatch(/<div class="s-[^"]*" data-section-image/)
    expect(html).toContain('url("https://x.test/p.jpg")')
  })

  it('leaves untouched sites exactly as they were', () => {
    const plain = syncMenu(splitHeaderFooter(buildTemplate(light)))
    const html = exportSitePages(plain)[0].html
    expect(html).not.toMatch(/<div class="s-[^"]*" data-section-image/)
    expect(html).not.toMatch(/\.s-[\w-]+\{[^}]*--color-/)
  })
})
