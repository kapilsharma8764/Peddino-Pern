/**
 * Small colour maths for the theme system: parsing, blending and contrast.
 *
 * Only hex colours are accepted anywhere in the theme, which keeps these
 * functions total and — because the values are written into published CSS —
 * makes a stored colour impossible to abuse as an injection.
 */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

export type Rgb = [number, number, number]

/** A tidy `#rrggbb`, or null for anything that is not a 3- or 6-digit hex. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  let v = value.trim()
  if (!v.startsWith('#')) v = `#${v}`
  if (!HEX.test(v)) return null
  if (v.length === 4) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  return v.toLowerCase()
}

export function parseHex(value: string): Rgb {
  const hex = normalizeHex(value) ?? '#000000'
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

export function toHex([r, g, b]: Rgb): string {
  const part = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

/** `amount` of `b` blended into `a`: 0 gives a, 1 gives b. */
export function mix(a: string, b: string, amount: number): string {
  const x = parseHex(a)
  const y = parseHex(b)
  const t = Math.max(0, Math.min(1, amount))
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = parseHex(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const LIGHT = '#ffffff'
const DARK = '#0d0d12'

/** Whichever of white or near-black reads better on this colour. */
export function readableOn(background: string): string {
  return contrast(LIGHT, background) >= contrast(DARK, background) ? LIGHT : DARK
}

/**
 * Nudges `foreground` toward whatever reads best on `background` until it
 * reaches `min` contrast, and leaves it alone if it already does.
 */
export function ensureContrast(foreground: string, background: string, min: number): string {
  if (contrast(foreground, background) >= min) return foreground
  const target = readableOn(background)
  for (let step = 1; step <= 10; step += 1) {
    const candidate = mix(foreground, target, step / 10)
    if (contrast(candidate, background) >= min) return candidate
  }
  return target
}

/** `r g b` channels, for CSS that needs an alpha channel added later. */
export function rgbChannels(hex: string): string {
  const [r, g, b] = parseHex(hex)
  return `${r} ${g} ${b}`
}

export type Hsl = [number, number, number]

/** Hue in degrees, saturation and lightness from 0 to 1. */
export function rgbToHsl([r, g, b]: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

export function hslToRgb([h, s, l]: Hsl): Rgb {
  const hue = ((h % 360) + 360) % 360 / 360
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return [channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255]
}

/** Shortest distance between two hues, 0 to 180. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
