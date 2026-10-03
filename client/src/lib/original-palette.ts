import {
  contrast,
  hslToRgb,
  hueDistance,
  mix,
  parseHex,
  readableOn,
  rgbToHsl,
  toHex,
  type Rgb,
} from './color'
import type { ThemeTokenId } from './theme-tokens'

/**
 * Reading a palette out of an imported HTML design, and repainting it.
 *
 * Those designs are somebody else's stylesheets full of literal colours, so
 * there is no variable to change. What can be done is to look at how the colours
 * are used, name the handful that carry the design — its page colour, its text,
 * its brand colour — and then, when the owner picks a different one, emit CSS
 * that repeats every declaration using the old colour with the new one in its
 * place. The template's own files are never edited; the CSS is laid over them.
 *
 * Everything here is pure text-and-numbers work so it can be tested without a
 * browser. Turning a stylesheet into `Observation`s needs a CSS parser, which
 * `original-theme.ts` borrows from the browser.
 */

export type Palette = Record<ThemeTokenId, string>
export type ColorRole = 'text' | 'bg' | 'border' | 'any'

/** One declaration in the template's CSS that carries a colour. */
export interface Observation {
  /** Enclosing at-rules, outermost first, e.g. `@media (max-width: 600px)`. */
  wrappers: string[]
  selector: string
  property: string
  value: string
  role: ColorRole
  /** Whether the template declared it `!important`; the copy must match. */
  important?: boolean
  /**
   * How many elements in the site's pages this selector matches, when known.
   * A framework stylesheet carries colours for every component it offers, used
   * or not; counting only what the pages actually contain is what stops a
   * design that never shows an error alert from being read as "red".
   */
  used?: number
}

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

const NAMED: Record<string, string> = {
  white: '#ffffff', black: '#000000', red: '#ff0000', blue: '#0000ff', green: '#008000', yellow: '#ffff00',
  orange: '#ffa500', gray: '#808080', grey: '#808080', silver: '#c0c0c0', navy: '#000080', teal: '#008080',
  purple: '#800080', pink: '#ffc0cb', maroon: '#800000', brown: '#a52a2a', gold: '#ffd700', lime: '#00ff00',
}

const COLOR_RE = new RegExp(
  '#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![0-9a-z])|rgba?\\([^)]*\\)|hsla?\\([^)]*\\)|\\b(?:' +
    Object.keys(NAMED).join('|') +
    ')\\b',
  'gi',
)

export function parseColor(text: string): Rgba | null {
  const t = text.trim().toLowerCase()
  if (NAMED[t]) return parseColor(NAMED[t])
  if (t.startsWith('#')) {
    let h = t.slice(1)
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('')
    if (h.length !== 6 && h.length !== 8) return null
    if (!/^[0-9a-f]+$/.test(h)) return null
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    }
  }
  const match = t.match(/^(rgba?|hsla?)\(([^)]*)\)$/)
  if (!match) return null
  const parts = match[2].split(/[\s,/]+/).filter(Boolean)
  if (parts.length < 3) return null
  const alphaPart = parts[3]
  const a = alphaPart === undefined ? 1 : alphaPart.endsWith('%') ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart)
  if (!Number.isFinite(a)) return null
  if (match[1].startsWith('rgb')) {
    const channel = (p: string) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p))
    const [r, g, b] = parts.slice(0, 3).map(channel)
    if (![r, g, b].every(Number.isFinite)) return null
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a }
  }
  const h = parseFloat(parts[0])
  const s = parseFloat(parts[1]) / 100
  const l = parseFloat(parts[2]) / 100
  if (![h, s, l].every(Number.isFinite)) return null
  const [r, g, b] = hslToRgb([h, s, l])
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a }
}

export function formatColor(c: Rgba): string {
  const hex = toHex([c.r, c.g, c.b])
  if (c.a >= 0.999) return hex
  return `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${+c.a.toFixed(3)})`
}

const rgbOf = (c: Rgba): Rgb => [c.r, c.g, c.b]
const hexOf = (c: Rgba) => toHex(rgbOf(c))
const distance = (a: Rgb, b: Rgb) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]))

/**
 * Replaces each colour in a CSS value with whatever `change` returns, leaving
 * the rest of the value alone. `url(...)` is skipped so a file called
 * `white.png` is not mistaken for a colour.
 */
export function replaceColors(value: string, change: (color: Rgba) => string | null): string {
  return value
    .split(/(url\([^)]*\))/gi)
    .map((part) =>
      /^url\(/i.test(part)
        ? part
        : part.replace(COLOR_RE, (token) => {
            const color = parseColor(token)
            return color ? change(color) ?? token : token
          }),
    )
    .join('')
}

/** Every colour in a CSS value. */
export function colorsIn(value: string): Rgba[] {
  const found: Rgba[] = []
  replaceColors(value, (color) => {
    found.push(color)
    return null
  })
  return found
}

/** What a CSS property's colour is doing, or null if it is not a colour property. */
export function roleOfProperty(property: string): ColorRole | null {
  const p = property.toLowerCase()
  if (p.startsWith('--')) return 'any'
  if (p === 'color' || p === 'fill' || p === 'stroke' || p === 'caret-color' || p === 'text-decoration-color') return 'text'
  if (p === 'background-color' || p === 'background-image' || p === 'background') return 'bg'
  if (/^border(-(top|right|bottom|left|inline|block)(-(start|end))?)?-color$/.test(p) || p === 'outline-color') return 'border'
  return null
}

/* ------------------------------------------------------------------ */
/* Detection                                                          */
/* ------------------------------------------------------------------ */

const STATE_SELECTOR = /:(hover|focus|active|visited|checked|disabled)|\.(active|open|disabled|focus)(?![\w-])|\[disabled\]/i
const isBodySelector = (selector: string) =>
  selector.split(',').some((s) => /^(html|body|:root|html\s*,\s*body)$/i.test(s.trim()))
const isButtonSelector = (selector: string) => /\.btn\b|\.btn-|\.button\b|button|\[type=["']?(submit|button)/i.test(selector)
const isLinkSelector = (selector: string) => selector.split(',').some((s) => /(^|[\s>+~])a(?![\w-])/i.test(s.trim()))
const isHeadingSelector = (selector: string) => /(^|[\s>+~])h[1-6](?![\w-])/i.test(selector)

type Tally = Map<string, number>
const bump = (map: Tally, key: string, weight: number) => map.set(key, (map.get(key) ?? 0) + weight)
const top = (map: Tally, exclude: (hex: string) => boolean = () => false): string | undefined =>
  [...map.entries()].filter(([hex]) => !exclude(hex)).sort((a, b) => b[1] - a[1])[0]?.[0]

const saturation = (hex: string) => rgbToHsl(parseHex(hex))[1]
const lightness = (hex: string) => rgbToHsl(parseHex(hex))[2]
const isChromatic = (hex: string) => {
  const [, s, l] = rgbToHsl(parseHex(hex))
  return s >= 0.25 && l >= 0.12 && l <= 0.9
}

/**
 * Names the palette a design is built on.
 *
 * Counts how each colour is used, weighting what defines a design — the page's
 * own background and text, links, buttons — above what merely occurs in it.
 * Anything it cannot find it derives from what it did, so every token always
 * has a value and a reasonable one.
 */
export function detectPalette(observations: Observation[]): Palette {
  const text: Tally = new Map()
  const bg: Tally = new Map()
  const border: Tally = new Map()
  const bodyText: Tally = new Map()
  const bodyBg: Tally = new Map()
  const buttonBg: Tally = new Map()
  const buttonText: Tally = new Map()
  const chroma: Tally = new Map()

  for (const o of observations) {
    if (o.used === 0) continue
    // A selector matching many elements says more about the design than one matching a few.
    // Hover, focus and active colours are shades of a base colour, not new ones.
    const reach = Math.sqrt(Math.min(o.used ?? 1, 25)) * (STATE_SELECTOR.test(o.selector) ? 0.15 : 1)
    const body = isBodySelector(o.selector)
    const button = isButtonSelector(o.selector)
    const link = isLinkSelector(o.selector)
    const heading = isHeadingSelector(o.selector)
    for (const color of colorsIn(o.value)) {
      if (color.a < 0.6) continue
      const hex = hexOf(color)
      let weight = reach
      if (o.role === 'text') {
        if (link) weight = 3 * reach
        else if (heading) weight = 2 * reach
        bump(text, hex, weight)
        if (body) bump(bodyText, hex, 25)
        if (button) bump(buttonText, hex, 4)
      } else if (o.role === 'bg') {
        // A gradient stop says less about the design than a flat colour does.
        if (/gradient/i.test(o.value)) weight = 0.4 * reach
        bump(bg, hex, weight)
        if (body) bump(bodyBg, hex, 25)
        if (button) bump(buttonBg, hex, 4)
      } else if (o.role === 'border') {
        bump(border, hex, weight)
        if (button) bump(buttonBg, hex, 1)
      }
      if (isChromatic(hex)) {
        let w = reach
        if (button) w *= 2
        if (link && o.role === 'text') w *= 2
        if (o.role === 'bg' && !/gradient/i.test(o.value)) w *= 1.5
        bump(chroma, hex, w)
      }
    }
  }

  let background = top(bodyBg) ?? top(bg, (hex) => isChromatic(hex)) ?? '#ffffff'
  const textColor =
    top(bodyText) ??
    top(text, (hex) => saturation(hex) > 0.4 || contrast(hex, background) < 4) ??
    readableOn(background)
  // A design whose page colour is a photograph has no body colour to read, and
  // white text on the default white would be invisible.
  if (contrast(textColor, background) < 3) {
    background = top(bg, (hex) => isChromatic(hex) || contrast(hex, textColor) < 4.5) ?? (readableOn(textColor) === '#ffffff' ? '#ffffff' : '#0d0d12')
  }

  // Colour families, heaviest first, so a hover shade does not outrank its base.
  const clusters: { hex: string; weight: number }[] = []
  for (const [hex, weight] of [...chroma.entries()].sort((a, b) => b[1] - a[1])) {
    const [h, s] = rgbToHsl(parseHex(hex))
    const family = clusters.find((cluster) => {
      const [ch, cs] = rgbToHsl(parseHex(cluster.hex))
      return hueDistance(h, ch) < 14 && Math.abs(s - cs) < 0.4
    })
    if (family) family.weight += weight
    else clusters.push({ hex, weight })
  }
  clusters.sort((a, b) => b.weight - a.weight)

  const primary = clusters[0]?.hex ?? '#4f46e5'
  const differs = (hex: string, others: string[]) =>
    others.every((other) => hueDistance(rgbToHsl(parseHex(hex))[0], rgbToHsl(parseHex(other))[0]) >= 25)
  const secondary = clusters.find((c) => differs(c.hex, [primary]))?.hex ?? mix(primary, '#000000', 0.25)
  const accent = clusters.find((c) => differs(c.hex, [primary, secondary]))?.hex ?? secondary

  const surface =
    top(
      bg,
      (hex) => hex === background || saturation(hex) > 0.25 || Math.abs(lightness(hex) - lightness(background)) > 0.25,
    ) ?? mix(background, textColor, 0.05)
  const borderColor =
    top(border, (hex) => saturation(hex) > 0.3 || hex === background) ?? mix(background, textColor, 0.15)
  const muted =
    top(text, (hex) => hex === textColor || saturation(hex) > 0.3 || contrast(hex, background) < 2.5 || contrast(hex, background) > 8) ??
    mix(textColor, background, 0.4)

  const button = top(buttonBg, (hex) => hex === background || hex === '#ffffff' || hex === '#000000') ?? primary
  const buttonLabel = top(buttonText, (hex) => contrast(hex, button) < 3) ?? readableOn(button)

  return {
    primary,
    secondary,
    accent,
    background,
    surface,
    text: textColor,
    muted,
    border: borderColor,
    buttonBg: button,
    buttonText: buttonLabel,
  }
}

/* ------------------------------------------------------------------ */
/* Repainting                                                         */
/* ------------------------------------------------------------------ */

const HUE_FAMILY = 16
/** Two colours are the same family when they share a hue and are both coloured, not grey. */
function sameFamily(a: Rgb, b: Rgb): boolean {
  const [ah, as] = rgbToHsl(a)
  const [bh, bs] = rgbToHsl(b)
  return as >= 0.2 && bs >= 0.2 && hueDistance(ah, bh) <= 25
}

/** Where `color`, a shade of `from`, lands when `from` is replaced by `to`: same offset in lightness, same relative saturation. */
function shiftFamily(color: Rgb, from: Rgb, to: Rgb): Rgb {
  const [, s, l] = rgbToHsl(color)
  const [, ds, dl] = rgbToHsl(from)
  const [nh, ns, nl] = rgbToHsl(to)
  return hslToRgb([
    nh,
    Math.max(0, Math.min(1, ns * (s / Math.max(ds, 0.05)))),
    Math.max(0.04, Math.min(0.97, nl + (l - dl))),
  ])
}

/**
 * The palette in force: the owner's choices over what the template had.
 * Buttons follow the primary colour until given one of their own, because in
 * most designs that is what they are — so changing Primary should not leave
 * the Button swatch showing a colour the buttons no longer have.
 */
export function effectivePalette(detected: Palette, tokens: Partial<Palette> = {}): Palette {
  const merged = { ...detected, ...tokens } as Palette
  if (!tokens.buttonBg && detected.buttonBg === detected.primary) merged.buttonBg = merged.primary

  // A design with one brand colour has no separate secondary or accent: what
  // was detected for them is a darker or lighter shade of the brand colour.
  // Those follow it, rather than staying put and leaving a stray old-coloured
  // hover state behind.
  const primaryFrom = parseHex(detected.primary)
  const primaryTo = parseHex(merged.primary)
  for (const id of ['secondary', 'accent'] as const) {
    if (tokens[id]) continue
    const shade = parseHex(detected[id])
    if (sameFamily(shade, primaryFrom)) merged[id] = toHex(shiftFamily(shade, primaryFrom, primaryTo))
  }

  // The neutrals are one system: moving the page colour or the text colour
  // and leaving the card colour, the muted grey and the hairlines where they
  // were gives light grey cards under white text. So while those are not set
  // by hand they keep the same place between the (new) background and text
  // that they had between the old ones.
  if (tokens.background || tokens.text) {
    const bg = merged.background
    const fg = merged.text
    const spread = lightness(detected.text) - lightness(detected.background)
    const place = (id: 'surface' | 'muted' | 'border') => {
      if (tokens[id] || Math.abs(spread) < 0.05) return
      const at = (lightness(detected[id]) - lightness(detected.background)) / spread
      merged[id] = mix(bg, fg, Math.max(0.02, Math.min(0.85, at)))
    }
    place('surface')
    place('muted')
    place('border')
  }
  return merged
}

/**
 * Neutral tokens, in the order they are tried, with the roles they apply to and
 * how near in lightness a colour must be to belong to them.
 *
 * Neutrals are matched by lightness rather than by exact value: a design's
 * "text" is not one grey but #000, #222 and #333 used in different places, and
 * moving the text colour has to move all of them. The match is still bound to
 * the role and to the side of the scale, so white headings on a dark banner are
 * never mistaken for a light page background.
 */
const NEUTRAL_TOKENS: { id: ThemeTokenId; roles: ColorRole[]; near: (l: number, detected: number) => boolean; opaque: boolean }[] = [
  { id: 'text', roles: ['text', 'any'], near: (l, d) => (d < 0.5 ? l <= d + 0.06 : l >= d - 0.06), opaque: false },
  { id: 'muted', roles: ['text', 'any'], near: (l, d) => Math.abs(l - d) <= 0.08, opaque: false },
  { id: 'border', roles: ['border', 'any'], near: (l, d) => Math.abs(l - d) <= 0.05, opaque: false },
  { id: 'background', roles: ['bg', 'any'], near: (l, d) => Math.abs(l - d) <= 0.05, opaque: true },
  { id: 'surface', roles: ['bg', 'any'], near: (l, d) => Math.abs(l - d) <= 0.07, opaque: true },
]

/**
 * Decides what a colour in the template should become.
 *
 * Brand colours are matched by family, not just by value: a hover shade a few
 * steps darker than the brand colour moves with it and keeps its offset.
 */
export function makeMapper(detected: Palette, effective: Palette) {
  const rgbDetected = (id: ThemeTokenId) => parseHex(detected[id])

  return (color: Rgba, role: ColorRole): Rgba | null => {
    if (color.a === 0) return null
    const rgb = rgbOf(color)
    const [h, s, l] = rgbToHsl(rgb)

    if (s >= 0.2 && l > 0.06 && l < 0.97) {
      // Only families the design really has: a "secondary" that is just a
      // shade of the primary belongs to the primary.
      const primary = rgbDetected('primary')
      const separate = (id: ThemeTokenId, others: Rgb[]) => !others.some((other) => sameFamily(rgbDetected(id), other))
      const families: ThemeTokenId[] = ['primary']
      if (separate('secondary', [primary])) families.push('secondary')
      if (separate('accent', [primary, ...(families.includes('secondary') ? [rgbDetected('secondary')] : [])])) families.push('accent')
      const candidates = families
        .map((id) => ({ id, det: rgbDetected(id) }))
        .filter(({ det }) => {
          const [dh, ds] = rgbToHsl(det)
          return ds >= 0.2 && hueDistance(h, dh) <= HUE_FAMILY
        })
        .sort((a, b) => distance(rgb, a.det) - distance(rgb, b.det))
      const chosen = candidates[0]
      if (chosen) {
        if (effective[chosen.id] === detected[chosen.id]) return null
        const next = parseHex(effective[chosen.id])
        if (distance(rgb, chosen.det) <= 6) return { r: next[0], g: next[1], b: next[2], a: color.a }
        const shifted = shiftFamily(rgb, chosen.det, next)
        return { r: shifted[0], g: shifted[1], b: shifted[2], a: color.a }
      }
    }

    if (s < 0.2) {
      for (const { id, roles, near, opaque } of NEUTRAL_TOKENS) {
        if (!roles.includes(role)) continue
        if (effective[id] === detected[id]) continue
        // A faint white wash over a photograph is not the page background.
        if (opaque && color.a < 0.85) continue
        const [, ds, dl] = rgbToHsl(rgbDetected(id))
        if (ds >= 0.2 || !near(l, dl)) continue
        const next = parseHex(effective[id])
        return { r: next[0], g: next[1], b: next[2], a: color.a }
      }
    }
    return null
  }
}

/** Buttons are recoloured directly, by class, since their colours are rarely a token of their own. */
const NL = String.fromCharCode(10)
const BUTTONS = '.btn,button,input[type="submit"],input[type="button"],a[class*="btn-"],a[class*="button"]'

/**
 * The CSS that carries the owner's colour choices over the template's own.
 *
 * Each changed declaration is repeated under its original selector and
 * at-rule, and the copies are laid after the template's own CSS. Same
 * selector means same specificity, so a copy beats exactly the rule it copies
 * and nothing else: a more specific rule that was not touched still wins, as it
 * always did. Marking the copies `!important` would break that — a bare `a`
 * rule would beat every more specific link rule in the template — so only
 * declarations the template itself marked important are marked again.
 */
export function buildThemeRules(
  observations: Observation[],
  detected: Palette,
  tokens: Partial<Palette>,
): string {
  const effective = effectivePalette(detected, tokens)
  const map = makeMapper(detected, effective)

  // First find what changes, then repeat everything that competes with it.
  const changed = new Map<Observation, string>()
  const touched = new Set<string>()
  for (const o of observations) {
    const next = replaceColors(o.value, (color) => {
      const to = map(color, o.role)
      return to ? formatColor(to) : null
    })
    if (next !== o.value) {
      changed.set(o, next)
      touched.add(o.property)
    }
  }

  // The copies are laid after the template's own CSS, so where two rules of
  // equal weight disagree the later one wins. Copying only the rules that
  // changed would move them after rules that used to come after them — a
  // white heading on a dark band turning brand-coloured because the brand
  // rule was copied and the white one was not. So every rule setting a
  // property that changed anywhere is copied, in the template's own order.
  const blocks: { key: string; wrappers: string[]; rules: string[] }[] = []
  for (const o of observations) {
    const next = changed.get(o)
    if (next === undefined && !(touched.has(o.property) && o.used !== 0)) continue
    const key = o.wrappers.join('|')
    let block = blocks[blocks.length - 1]
    if (!block || block.key !== key) {
      block = { key, wrappers: o.wrappers, rules: [] }
      blocks.push(block)
    }
    const value = (next ?? o.value).replace(/[{}<]/g, '')
    block.rules.push(`${o.selector}{${o.property}:${value}${o.important ? '!important' : ''}}`)
  }

  // Buttons chosen on their own.
  const buttonRules: string[] = []
  if (tokens.buttonBg && tokens.buttonBg !== detected.buttonBg) {
    const hover = mix(tokens.buttonBg, '#000000', 0.15)
    buttonRules.push(
      `${BUTTONS}{background-color:${tokens.buttonBg}!important;border-color:${tokens.buttonBg}!important}`,
      `:is(${BUTTONS}):hover,:is(${BUTTONS}):focus{background-color:${hover}!important;border-color:${hover}!important}`,
    )
  }
  if (tokens.buttonText && tokens.buttonText !== detected.buttonText) {
    buttonRules.push(`:is(${BUTTONS}),:is(${BUTTONS}):hover{color:${tokens.buttonText}!important}`)
  }

  const out = blocks.map(({ wrappers, rules }) =>
    wrappers.reduceRight((inner, wrapper) => `${wrapper}{${inner}}`, rules.join(NL)),
  )
  out.push(...buttonRules)
  return out.join(NL)
}

/**
 * Applies the same replacement to a run of inline `style="…"` text.
 *
 * Declarations marked `!important` are left alone: that is what the editor's
 * own controls write, so it is a colour the owner chose by hand, and a palette
 * change must not overwrite it.
 */
export function remapStyleAttribute(style: string, detected: Palette, tokens: Partial<Palette>): string {
  const map = makeMapper(detected, effectivePalette(detected, tokens))
  return style.replace(/([\w-]+)\s*:\s*([^;]+)/g, (whole, property: string, value: string) => {
    const role = roleOfProperty(property)
    if (!role || /!important/i.test(value)) return whole
    const next = replaceColors(value, (color) => {
      const changed = map(color, role)
      return changed ? formatColor(changed) : null
    })
    return next === value ? whole : `${property}:${next}`
  })
}
