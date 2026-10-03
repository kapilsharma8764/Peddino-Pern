import type { SectionColorKey, SectionColors } from '@/blocks/types'
import { ensureContrast, mix, normalizeHex, readableOn, contrast } from './color'
import { DEFAULT_OVERLAY, normalizeSectionColors, safeImageUrl } from './section-colors'
import type { Palette } from './original-palette'

/**
 * Section colours for imported HTML designs.
 *
 * The block editor recolours a section by re-pointing CSS variables its widgets
 * read. An imported design's markup reads no variables, so here the same
 * presets are expressed as rules that name the section's own elements —
 * headings, body text, links, buttons, cards, borders — and win over the
 * template's stylesheet by being more specific and `!important`.
 *
 * The presets are computed from the design's palette and published as
 * `--pt-*` variables (see `presetVars`), and the rules point at those. That is
 * what lets Style 3 stay "the primary colour" when the primary colour is later
 * changed in Theme Colors, without touching the saved page.
 */

/** The colours one section wears. */
export interface SectionPalette {
  bg: string
  heading: string
  text: string
  muted: string
  link: string
  button: string
  buttonText: string
  border: string
  surface: string
}

export type CssPreset = 'style2' | 'style3'

export const ATTR = 'data-pt-s'
export const COLORS_ATTR = 'data-pt-colors'

export function presetPalette(p: Palette, preset: CssPreset): SectionPalette {
  if (preset === 'style2') {
    const bg = p.surface
    return {
      bg,
      heading: ensureContrast(p.text, bg, 4.5),
      text: ensureContrast(mix(p.text, bg, 0.12), bg, 4.5),
      muted: ensureContrast(p.muted, bg, 3.5),
      link: ensureContrast(p.primary, bg, 3),
      button: p.buttonBg,
      buttonText: p.buttonText,
      border: p.border,
      surface: p.background,
    }
  }
  const bg = p.primary
  const on = readableOn(bg)
  return {
    bg,
    heading: on,
    text: ensureContrast(mix(on, bg, 0.1), bg, 4.5),
    muted: ensureContrast(mix(on, bg, 0.28), bg, 3.5),
    link: on,
    button: on,
    buttonText: ensureContrast(bg, on, 4.5),
    border: mix(bg, on, 0.28),
    surface: mix(bg, on, 0.1),
  }
}

/** The `--pt-*` variables that carry every preset, defined once per page. */
export function presetVars(p: Palette): string {
  const out: string[] = []
  for (const [id, color] of Object.entries(p)) out.push(`--pt-${id}:${color}`)
  for (const preset of ['style2', 'style3'] as const) {
    for (const [key, color] of Object.entries(presetPalette(p, preset))) out.push(`--pt-${preset}-${key}:${color}`)
  }
  return out.join(';')
}

const PHOTO_MIDTONE = '#808080'

function imagePalette(p: Palette, colors: SectionColors): SectionPalette {
  const color = normalizeHex(colors.image?.overlayColor) ?? DEFAULT_OVERLAY.color
  const opacity = (colors.image?.overlayOpacity ?? DEFAULT_OVERLAY.opacity) / 100
  const seen = mix(PHOTO_MIDTONE, color, opacity)
  const on = readableOn(seen)
  return {
    bg: seen,
    heading: on,
    text: ensureContrast(mix(on, seen, 0.1), seen, 4.5),
    muted: ensureContrast(mix(on, seen, 0.28), seen, 3.5),
    link: contrast(p.primary, seen) >= 3 ? p.primary : on,
    button: p.buttonBg,
    buttonText: p.buttonText,
    border: mix(seen, on, 0.28),
    surface: mix(seen, on, 0.12),
  }
}

/** What a section actually shows, for swatches, blank fields and the contrast note. */
export function resolvedOriginalSectionPalette(p: Palette, input: SectionColors | undefined): Record<SectionColorKey, string> {
  const colors = normalizeSectionColors(input)
  const base: SectionPalette =
    colors?.preset === 'style2' || colors?.preset === 'style3'
      ? presetPalette(p, colors.preset)
      : colors?.preset === 'image'
        ? imagePalette(p, colors)
        : {
            bg: p.background,
            heading: p.text,
            text: p.text,
            muted: p.muted,
            link: p.primary,
            button: p.buttonBg,
            buttonText: p.buttonText,
            border: p.border,
            surface: p.surface,
          }
  const o = colors?.overrides ?? {}
  return {
    background: o.background ?? base.bg,
    surface: o.surface ?? base.surface,
    heading: o.heading ?? base.heading,
    text: o.text ?? base.text,
    muted: o.muted ?? base.muted,
    link: o.link ?? base.link,
    button: o.button ?? base.button,
    buttonText: o.buttonText ?? (o.button ? readableOn(o.button) : base.buttonText),
    border: o.border ?? base.border,
  }
}

/**
 * How many times the section's attribute is repeated in each selector. Each
 * repeat adds a class-weight of specificity, which is what lets these rules
 * beat a theme rule written for a deeply nested template selector.
 */
const SPECIFICITY = 4

const BUTTON_PARTS = '.btn,[class*="btn-"],[class*="button"],button,input[type="submit"],input[type="button"]'
const HEADINGS = 'h1,h2,h3,h4,h5,h6,[class*="title"],[class*="heading"]'
const CARDS = '.card,[class*="card"],.panel,.well'

function sectionRules(id: string, inputColors: SectionColors, p: Palette): string {
  const colors = normalizeSectionColors(inputColors)
  if (!colors || (!colors.preset && !colors.overrides)) return ''
  const safeId = id.replace(/[^\w-]/g, '')
  const s = Array(SPECIFICITY).fill(`[${ATTR}="${safeId}"]`).join('')

  // Presets read the page's variables, with the value as a fallback so a page
  // that somehow lacks them still draws the colours it was styled with.
  const preset = colors.preset === 'style2' || colors.preset === 'style3' ? colors.preset : null
  const literal = resolvedOriginalSectionPalette(p, { ...colors, overrides: undefined })
  const pick = (key: keyof SectionPalette, literalKey: SectionColorKey): string =>
    preset ? `var(--pt-${preset}-${key},${literal[literalKey]})` : literal[literalKey]
  const o = colors.overrides ?? {}
  const c = {
    bg: o.background ?? pick('bg', 'background'),
    surface: o.surface ?? pick('surface', 'surface'),
    heading: o.heading ?? pick('heading', 'heading'),
    text: o.text ?? pick('text', 'text'),
    muted: o.muted ?? pick('muted', 'muted'),
    link: o.link ?? pick('link', 'link'),
    button: o.button ?? pick('button', 'button'),
    buttonText: o.buttonText ?? (o.button ? readableOn(o.button) : pick('buttonText', 'buttonText')),
    border: o.border ?? pick('border', 'border'),
  }

  const rules: string[] = []
  const paintsGround = Boolean(colors.preset && colors.preset !== 'style1') || Boolean(o.background)
  const image = colors.preset === 'image' && !o.background ? safeImageUrl(colors.image?.src) : null

  if (paintsGround) {
    const ground = [`background-color:${c.bg}!important`, `color:${c.text}!important`]
    if (image) {
      const overlay = normalizeHex(colors.image?.overlayColor) ?? DEFAULT_OVERLAY.color
      const alpha = (colors.image?.overlayOpacity ?? DEFAULT_OVERLAY.opacity) / 100
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(overlay.slice(i, i + 2), 16))
      const tint = `rgba(${r},${g},${b},${alpha})`
      ground.push(
        `background-image:linear-gradient(${tint},${tint}),url("${image}")!important`,
        'background-size:cover!important',
        'background-position:center!important',
        'background-repeat:no-repeat!important',
      )
    }
    rules.push(`${s}{${ground.join(';')}}`)
  } else if (o.text) {
    rules.push(`${s}{color:${c.text}!important}`)
  }

  // Order matters: at equal specificity the later rule wins, so the most
  // specific kinds of element — buttons, then links — come last.
  const inside = (selector: string) => `${s} ${selector}`
  const notInControl = `:not(:where(a,${BUTTON_PARTS}) *)`
  const set = paintsGround || o.text || o.heading || o.muted || o.link || o.button || o.buttonText || o.border || o.surface
  if (set) {
    rules.push(
      `${inside(`:where(p,li,span,small,label,td,th,dt,dd,blockquote,figcaption,em,strong,b,i)${notInControl}`)}{color:${c.text}!important}`,
      `${inside(`:where(small,figcaption,.text-muted,[class*="muted"],[class*="meta"])${notInControl}`)}{color:${c.muted}!important}`,
      `${inside(`:where(${HEADINGS})`)}{color:${c.heading}!important}`,
      `${inside(`:where(a):not(:where(${BUTTON_PARTS}))`)}{color:${c.link}!important}`,
      `${inside(`:where(${BUTTON_PARTS})`)}{background-color:${c.button}!important;color:${c.buttonText}!important;border-color:${c.button}!important}`,
      `${inside(`:where(${BUTTON_PARTS}) :where(span,i,svg,em,strong)`)}{color:${c.buttonText}!important}`,
      `${inside(`:where(${CARDS})`)}{background-color:${c.surface}!important;border-color:${c.border}!important}`,
      `${inside(`:where(hr,table,th,td,input,textarea,select,[class*="border"])`)}{border-color:${c.border}!important}`,
    )
  }
  return rules.join('\n')
}

/** The stylesheet for every section styled in a document, read from its attributes. */
export function sectionsCss(doc: Document, p: Palette): string {
  const out: string[] = []
  doc.querySelectorAll(`[${COLORS_ATTR}]`).forEach((el) => {
    const id = el.getAttribute(ATTR)
    if (!id) return
    try {
      out.push(sectionRules(id, JSON.parse(el.getAttribute(COLORS_ATTR) ?? 'null') as SectionColors, p))
    } catch {
      // A hand-edited attribute that is not valid JSON styles nothing.
    }
  })
  return out.filter(Boolean).join('\n')
}

/** Reads the colours stored on an element, if any. */
export function readSectionColors(el: Element | null | undefined): SectionColors | undefined {
  const raw = el?.getAttribute(COLORS_ATTR)
  if (!raw) return undefined
  try {
    return normalizeSectionColors(JSON.parse(raw))
  } catch {
    return undefined
  }
}

let counter = 0
/** Stores (or, given nothing, removes) the colours on an element of a parsed page. */
export function writeSectionColors(el: Element, colors: SectionColors | undefined | null): void {
  const clean = normalizeSectionColors(colors)
  // Style 1 is the design as it shipped, so it stores nothing.
  const effective = clean && (clean.preset === 'style1' ? { ...clean, preset: undefined } : clean)
  const keep = effective && (effective.preset || effective.overrides || effective.image) ? effective : undefined
  if (!keep || (!keep.preset && !keep.overrides)) {
    el.removeAttribute(COLORS_ATTR)
    el.removeAttribute(ATTR)
    return
  }
  if (!el.getAttribute(ATTR)) el.setAttribute(ATTR, `s${Date.now().toString(36)}${(counter += 1).toString(36)}`)
  el.setAttribute(COLORS_ATTR, JSON.stringify(keep))
}
