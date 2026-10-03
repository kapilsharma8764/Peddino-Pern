import type { SectionColorKey, SectionColorPreset, SectionColors, ThemeConfig } from '@/blocks/types'
import { colorVarsToRgb, hexToRgb, resolveTheme, semanticColors } from './theme-presets'
import { contrast, ensureContrast, mix, normalizeHex, readableOn } from './color'

/**
 * Section colours: how one section is coloured on top of the site's theme.
 *
 * Resolution order, lowest to highest:
 *
 *   1. the template's own palette          (`theme` as first built)
 *   2. the site's theme tokens             (`config.theme`, edited in Theme Colors)
 *   3. the section's style preset          (`colors.preset`)
 *   4. the section's own overrides         (`colors.overrides`)
 *   5. explicit box styling                (`style.background`, `style.textColor`,
 *                                            per-element styles) — plain CSS
 *                                            set on the section, which wins.
 *
 * Steps 3 and 4 work by re-pointing the same CSS variables the widgets already
 * read (`--color-bg-1`, `--color-text-0`, `--color-brand`, …) on the section's
 * wrapper. Nothing inside a widget knows about presets; it just reads
 * variables, so headings, body copy, links, buttons, borders and cards inside
 * a section all follow together, and a widget dropped into it later inherits
 * the same colours for free.
 *
 * This file is pure: the editor and the published page both call it, so a
 * section cannot look one way while editing and another once live.
 */

export const SECTION_PRESETS: { value: SectionColorPreset; label: string; hint: string }[] = [
  { value: 'style1', label: 'Style 1', hint: 'The theme as designed' },
  { value: 'style2', label: 'Style 2', hint: 'Soft alternate surface' },
  { value: 'style3', label: 'Style 3', hint: 'Bold band in the primary colour' },
  { value: 'image', label: 'Image', hint: 'Photo background with a tinted overlay' },
]

export const OVERRIDE_KEYS: { key: SectionColorKey; label: string }[] = [
  { key: 'background', label: 'Background' },
  { key: 'surface', label: 'Cards and panels' },
  { key: 'heading', label: 'Headings' },
  { key: 'text', label: 'Body text' },
  { key: 'muted', label: 'Muted text' },
  { key: 'link', label: 'Links and icons' },
  { key: 'button', label: 'Button' },
  { key: 'buttonText', label: 'Button text' },
  { key: 'border', label: 'Borders' },
]

export const DEFAULT_OVERLAY = { color: '#000000', opacity: 55 }

type Vars = Record<string, string>

const PRESETS = new Set<string>(['style1', 'style2', 'style3', 'image'])
const OVERRIDE_SET = new Set<string>(OVERRIDE_KEYS.map((entry) => entry.key))

/**
 * Cleans whatever was stored into something safe to draw and to publish.
 *
 * Saved sites are user data and end up inside a stylesheet, so nothing is
 * trusted: presets must be known, colours must be hex, opacity is clamped, and
 * an image address must be an http(s), data-image or site-relative URL. Older
 * sites have no `colors` at all, which comes back as undefined — "follow the
 * theme".
 */
export function normalizeSectionColors(input: unknown): SectionColors | undefined {
  if (!input || typeof input !== 'object') return undefined
  const raw = input as Record<string, unknown>
  const out: SectionColors = {}

  if (typeof raw.preset === 'string' && PRESETS.has(raw.preset)) out.preset = raw.preset as SectionColorPreset

  if (raw.image && typeof raw.image === 'object') {
    const image = raw.image as Record<string, unknown>
    const clean: NonNullable<SectionColors['image']> = {}
    const src = safeImageUrl(image.src)
    if (src) clean.src = src
    const overlay = normalizeHex(image.overlayColor)
    if (overlay) clean.overlayColor = overlay
    if (typeof image.overlayOpacity === 'number' && Number.isFinite(image.overlayOpacity)) {
      clean.overlayOpacity = Math.max(0, Math.min(100, Math.round(image.overlayOpacity)))
    }
    if (Object.keys(clean).length) out.image = clean
  }

  if (raw.overrides && typeof raw.overrides === 'object') {
    const overrides: NonNullable<SectionColors['overrides']> = {}
    for (const [key, value] of Object.entries(raw.overrides as Record<string, unknown>)) {
      const hex = OVERRIDE_SET.has(key) ? normalizeHex(value) : null
      if (hex) overrides[key as SectionColorKey] = hex
    }
    if (Object.keys(overrides).length) out.overrides = overrides
  }

  return Object.keys(out).length ? out : undefined
}

export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const url = value.trim()
  if (!url || url.length > 4_000_000) return null
  if (/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml);base64,[a-z0-9+/=]+$/i.test(url)) return url
  if (/^(https?:)?\/\//i.test(url) || /^\.{0,2}\//.test(url) || /^[a-z0-9][\w./%~-]*$/i.test(url)) {
    // Anything that could close the CSS url("…") or the attribute is refused.
    return /["'()<>\\\s]/.test(url) ? encodeURI(url).replace(/["'()<>\\]/g, (c) => `%${c.charCodeAt(0).toString(16)}`) : url
  }
  return null
}

/** True when the section carries nothing that changes how it is coloured. */
export function hasSectionColors(colors: SectionColors | undefined): boolean {
  const clean = normalizeSectionColors(colors)
  return Boolean(clean && (clean.preset || clean.overrides))
}

/** Sets one colour variable and its `--rgb-*` twin. */
function put(vars: Vars, name: string, hex: string) {
  vars[`--color-${name}`] = hex
}

/** The theme's own colours as a variable map, used to reset a nested scope. */
function themeVars(theme: ThemeConfig): Vars {
  const semantic = semanticColors(theme)
  const vars: Vars = {}
  ;(['bg-0', 'bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-5'] as const).forEach((name, i) =>
    put(vars, name, theme[`bg${i}` as keyof ThemeConfig] as string),
  )
  ;(['text-0', 'text-1', 'text-2', 'text-3'] as const).forEach((name, i) =>
    put(vars, name, theme[`text${i}` as keyof ThemeConfig] as string),
  )
  put(vars, 'brand', theme.accent)
  put(vars, 'brand-dim', theme.accentDim)
  put(vars, 'highlight', semantic.highlight)
  put(vars, 'button', semantic.button)
  put(vars, 'button-text', semantic.buttonText)
  put(vars, 'button-hover', semantic.buttonHover)
  put(vars, 'border-default', theme.borderDefault)
  put(vars, 'border-subtle', theme.borderSubtle)
  put(vars, 'border-hover', theme.borderHover)
  return vars
}

/** Style 2: the theme's card surface becomes the ground, and the ground the cards. */
function style2(theme: ThemeConfig): { vars: Vars; ground: string } {
  const ground = theme.bg2
  const cards = theme.bg1 === theme.bg2 ? theme.bg3 : theme.bg1
  const vars = themeVars(theme)
  put(vars, 'bg-0', ground)
  put(vars, 'bg-1', ground)
  put(vars, 'bg-2', cards)
  put(vars, 'text-0', ensureContrast(theme.text0, ground, 4.5))
  put(vars, 'text-1', ensureContrast(theme.text1, ground, 4.5))
  put(vars, 'text-2', ensureContrast(theme.text2, ground, 3.5))
  put(vars, 'text-3', ensureContrast(theme.text3, ground, 3))
  return { vars, ground }
}

/**
 * A section drawn light-on-dark or dark-on-light over a chosen ground.
 *
 * The text ramp and the card and border steps are blended from the reading
 * colour into the ground, so they keep the same relationship to each other
 * that the theme's own ramp has, whatever the ground turns out to be.
 */
function onGround(theme: ThemeConfig, ground: string, keepAccent: boolean, solidGround: string): Vars {
  const on = readableOn(ground)
  const vars = themeVars(theme)

  put(vars, 'bg-0', solidGround)
  put(vars, 'bg-1', solidGround)
  put(vars, 'bg-2', mix(solidGround, on, 0.1))
  put(vars, 'bg-3', mix(solidGround, on, 0.16))
  put(vars, 'bg-4', mix(solidGround, on, 0.22))
  put(vars, 'bg-5', mix(solidGround, on, 0.3))

  put(vars, 'text-0', on)
  put(vars, 'text-1', ensureContrast(mix(on, ground, 0.1), ground, 4.5))
  put(vars, 'text-2', ensureContrast(mix(on, ground, 0.28), ground, 3.5))
  put(vars, 'text-3', ensureContrast(mix(on, ground, 0.45), ground, 3))

  put(vars, 'border-default', mix(ground, on, 0.28))
  put(vars, 'border-subtle', mix(ground, on, 0.18))
  put(vars, 'border-hover', mix(ground, on, 0.4))

  if (keepAccent) {
    // The theme's accent stays where it stands out against the ground.
    const accent = contrast(theme.accent, ground) >= 3 ? theme.accent : on
    put(vars, 'brand', accent)
    put(vars, 'brand-dim', mix(accent, ground, 0.25))
    put(vars, 'highlight', accent)
  } else {
    // On the primary colour itself the accent would vanish, so links and icons
    // take the reading colour — or the Accent token, if one was chosen that
    // stands out against the band.
    const chosen = normalizeHex(theme.highlight)
    const accent = chosen && contrast(chosen, ground) >= 3 ? chosen : on
    put(vars, 'brand', accent)
    put(vars, 'brand-dim', mix(accent, ground, 0.25))
    put(vars, 'highlight', accent)
    // Buttons invert: the reading colour as fill, the ground as label.
    put(vars, 'button', on)
    put(vars, 'button-text', ensureContrast(ground, on, 4.5))
    put(vars, 'button-hover', mix(on, ground, 0.15))
  }
  return vars
}

/** The colour a photo is assumed to average out to, before the overlay goes on. */
const PHOTO_MIDTONE = '#808080'

function overlayOf(colors: SectionColors | undefined) {
  const color = normalizeHex(colors?.image?.overlayColor) ?? DEFAULT_OVERLAY.color
  const opacity = colors?.image?.overlayOpacity ?? DEFAULT_OVERLAY.opacity
  return { color, opacity: Math.max(0, Math.min(100, opacity)) }
}

interface Built {
  vars: Vars
  /** The variable holding the section's ground, or undefined to leave it alone. */
  css: Record<string, string>
  image: boolean
}

function build(themeInput: Partial<ThemeConfig> | undefined, input: SectionColors | undefined): Built | null {
  const colors = normalizeSectionColors(input)
  if (!colors || (!colors.preset && !colors.overrides)) return null
  const theme = resolveTheme(themeInput)
  const css: Record<string, string> = {}
  let vars: Vars = {}
  let image = false

  switch (colors.preset) {
    case 'style1':
      vars = themeVars(theme)
      break
    case 'style2':
      vars = style2(theme).vars
      css.backgroundColor = 'var(--color-bg-1)'
      css.color = 'var(--color-text-0)'
      break
    case 'style3':
      vars = onGround(theme, theme.accent, false, theme.accent)
      css.backgroundColor = 'var(--color-bg-1)'
      css.color = 'var(--color-text-0)'
      break
    case 'image': {
      const { color, opacity } = overlayOf(colors)
      // What a reader actually sees behind the text: the overlay over a photo
      // of unknown brightness, approximated as mid-grey.
      const seen = mix(PHOTO_MIDTONE, color, opacity / 100)
      vars = onGround(theme, seen, true, mix(theme.bg1, color, opacity / 100))
      css.backgroundColor = mix(PHOTO_MIDTONE, color, 1)
      css.color = 'var(--color-text-0)'
      image = true
      const src = safeImageUrl(colors.image?.src)
      if (src) {
        const [r, g, b] = hexToRgb(color).split(',').map((n) => Number(n.trim()))
        const tint = `rgba(${r},${g},${b},${opacity / 100})`
        css.backgroundImage = `linear-gradient(${tint},${tint}),url("${src}")`
        css.backgroundSize = 'cover'
        css.backgroundPosition = 'center'
        css.backgroundRepeat = 'no-repeat'
      } else {
        // No photo yet: the tint alone, so choosing Image is never a blank box.
        css.backgroundColor = mix(theme.bg1, color, opacity / 100)
      }
      break
    }
    default:
      vars = {}
  }

  const overrides = colors.overrides
  if (overrides) {
    const base = { ...themeVars(theme), ...vars }
    const ground = overrides.background ?? base['--color-bg-1']
    if (overrides.background) {
      put(vars, 'bg-0', overrides.background)
      put(vars, 'bg-1', overrides.background)
      css.backgroundColor = 'var(--color-bg-1)'
      // A hand-picked ground removes any photo: the two would fight.
      delete css.backgroundImage
      if (colors.preset === 'image') image = false
    }
    if (overrides.surface) put(vars, 'bg-2', overrides.surface)
    if (overrides.heading) put(vars, 'text-0', overrides.heading)
    if (overrides.text) put(vars, 'text-1', overrides.text)
    if (overrides.muted) put(vars, 'text-2', overrides.muted)
    if (overrides.link) {
      put(vars, 'brand', overrides.link)
      put(vars, 'brand-dim', mix(overrides.link, ground, 0.25))
      put(vars, 'highlight', overrides.link)
    }
    if (overrides.button) {
      put(vars, 'button', overrides.button)
      put(vars, 'button-hover', mix(overrides.button, '#000000', 0.15))
      if (!overrides.buttonText) put(vars, 'button-text', readableOn(overrides.button))
    }
    if (overrides.buttonText) put(vars, 'button-text', overrides.buttonText)
    if (overrides.border) {
      put(vars, 'border-default', overrides.border)
      put(vars, 'border-hover', mix(overrides.border, readableOn(ground), 0.2))
    }
    if (overrides.background || overrides.heading) css.color = 'var(--color-text-0)'
  }

  return { vars, css, image }
}

/**
 * Everything a section's wrapper needs: the re-pointed colour variables, the
 * `--rgb-*` twins the published page's Tailwind reads, and the plain CSS for
 * background and text. Null when the section has nothing to say, so the common
 * case adds no wrapper at all.
 */
export function sectionColorCss(
  theme: Partial<ThemeConfig> | undefined,
  colors: SectionColors | undefined,
): { style: Record<string, string>; image: boolean } | null {
  const built = build(theme, colors)
  if (!built) return null
  return {
    style: { ...built.vars, ...colorVarsToRgb(built.vars), ...built.css },
    image: built.image,
  }
}

/** A custom property or camelCase property as `name:value` CSS text. */
export function styleMapToCssText(style: Record<string, string>): string {
  return Object.entries(style)
    .map(([name, value]) => `${name.startsWith('--') ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${value}`)
    .join(';')
}

/**
 * The hex colours a reader will actually get in this section, one per
 * override slot — for swatches, for showing what a blank field currently
 * resolves to, and for the contrast warning. Over a photo the background is an
 * estimate: the overlay laid over a mid-grey.
 */
export function resolvedSectionPalette(
  theme: Partial<ThemeConfig> | undefined,
  colors: SectionColors | undefined,
): Record<SectionColorKey, string> {
  const resolved = resolveTheme(theme)
  const vars: Vars = { ...themeVars(resolved), ...(build(theme, colors)?.vars ?? {}) }
  const { color, opacity } = overlayOf(colors)
  return {
    background: sectionShowsImage(colors) ? mix(PHOTO_MIDTONE, color, opacity / 100) : vars['--color-bg-1'],
    surface: vars['--color-bg-2'],
    heading: vars['--color-text-0'],
    text: vars['--color-text-1'],
    muted: vars['--color-text-2'],
    link: vars['--color-brand'],
    button: vars['--color-button'],
    buttonText: vars['--color-button-text'],
    border: vars['--color-border-default'],
  }
}

/**
 * Rules the widgets' own classes cannot express on their own.
 *
 * Buttons are `bg-brand text-white` throughout the widgets; pointing that pair
 * at the button variables is what lets the Button colours (and a section's
 * inverted buttons) work without touching each widget. The image rule lets a
 * photo show through the widget backgrounds drawn over it.
 */
export function themeRulesCss(scope = ''): string {
  const s = scope ? `${scope} ` : ''
  return [
    `${s}.bg-brand.text-white{background-color:var(--color-button);color:var(--color-button-text)}`,
    `${s}.bg-brand.text-white:hover{background-color:var(--color-button-hover)}`,
    `${s}[data-section-image] .bg-bg-0,${s}[data-section-image] .bg-bg-1{background-color:transparent}`,
    `${s}::selection{background:var(--color-highlight);color:var(--color-bg-1)}`,
    `${s}:focus-visible{outline-color:var(--color-highlight)}`,
  ].join('\n')
}

/** True when the section draws a photo, which lets widget backgrounds go clear. */
export function sectionShowsImage(colors: SectionColors | undefined): boolean {
  const clean = normalizeSectionColors(colors)
  return clean?.preset === 'image' && !clean.overrides?.background
}

export { contrast }
