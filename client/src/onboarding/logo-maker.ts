/**
 * Making a logo for a business that does not have one.
 *
 * Most small businesses have no logo file. Asking them to upload one is the
 * first place the flow used to stop dead — so the flow now offers to make a
 * plain, decent one out of the name they already typed.
 *
 * The result is an SVG, for two reasons: it stays sharp at any size, from a
 * favicon to a printed board, and it is a few hundred bytes rather than the
 * hundreds of kilobytes a photograph would be — which matters because the logo
 * travels inside the site on every save.
 */

export type LogoShape = 'circle' | 'square' | 'rounded' | 'none'
export type LogoLayout = 'markLeft' | 'markAbove' | 'markOnly' | 'nameOnly'

export interface LogoDesign {
  name: string
  /** One or two letters. Worked out from the name unless overridden. */
  initials: string
  layout: LogoLayout
  shape: LogoShape
  background: string
  foreground: string
  font: string
  /** Letter spacing on the name, in ems. Wide spacing reads as considered. */
  tracking: number
  bold: boolean
}

/** Colour pairs that read well together and print acceptably. */
export const LOGO_PALETTES: { name: string; background: string; foreground: string }[] = [
  { name: 'Indigo', background: '#4f46e5', foreground: '#ffffff' },
  { name: 'Ink', background: '#111827', foreground: '#ffffff' },
  { name: 'Forest', background: '#166534', foreground: '#ffffff' },
  { name: 'Crimson', background: '#b91c1c', foreground: '#ffffff' },
  { name: 'Ocean', background: '#0369a1', foreground: '#ffffff' },
  { name: 'Amber', background: '#b45309', foreground: '#ffffff' },
  { name: 'Plum', background: '#6d28d9', foreground: '#ffffff' },
  { name: 'Teal', background: '#0f766e', foreground: '#ffffff' },
  { name: 'Sand', background: '#e7e5e4', foreground: '#1c1917' },
  { name: 'Gold on ink', background: '#111827', foreground: '#d4af37' },
]

export const LOGO_FONTS: { name: string; stack: string }[] = [
  { name: 'Modern', stack: "'Inter', system-ui, sans-serif" },
  { name: 'Friendly', stack: "'DM Sans', system-ui, sans-serif" },
  { name: 'Rounded', stack: "'Poppins', system-ui, sans-serif" },
  { name: 'Classic', stack: "'Playfair Display', Georgia, serif" },
  { name: 'Strong', stack: "'Space Grotesk', system-ui, sans-serif" },
]

/**
 * The letters that go in the mark.
 *
 * Two words give two initials — "Sharma Coaching" becomes SC. One word gives
 * its first letter only, because two letters of the same word ("SH") reads as
 * an abbreviation of nothing.
 */
export function initialsFrom(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word))
    // "and", "of", "the" are not part of anybody's initials.
    .filter((word) => !['and', 'of', 'the', '&'].includes(word.toLowerCase()))

  if (words.length === 0) return '?'
  if (words.length === 1) return words[0][0].toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function defaultDesign(name: string): LogoDesign {
  return {
    name: name.trim() || 'Your business',
    initials: initialsFrom(name),
    layout: 'markLeft',
    shape: 'circle',
    background: LOGO_PALETTES[0].background,
    foreground: LOGO_PALETTES[0].foreground,
    font: LOGO_FONTS[0].stack,
    tracking: 0,
    bold: true,
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * How wide the name will actually be.
 *
 * SVG cannot size itself to its text, so the box has to be worked out in
 * advance — and guessing a width per character cuts the name off, badly for a
 * serif where letter widths vary most. The browser can measure it exactly, so
 * it does; the estimate is only the fallback for tests, which run with no DOM.
 */
function nameWidth(design: LogoDesign): number {
  const size = 42
  const weight = design.bold ? 700 : 500
  const spacing = design.tracking * size * design.name.length

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (context) {
      context.font = `${weight} ${size}px ${design.font}`
      const measured = context.measureText(design.name).width
      // A little air on each side so nothing touches the edge of the box.
      return Math.ceil(measured + spacing) + 24
    }
  }

  // Generous on purpose: too wide leaves whitespace, too narrow cuts the name.
  return Math.ceil(design.name.length * size * 0.62 + spacing) + 24
}

function mark(design: LogoDesign, x: number, y: number, size: number): string {
  const half = size / 2
  const letters = escapeXml(design.initials)
  const text = `<text x="${x + half}" y="${y + half}" font-family="${escapeXml(design.font)}" font-size="${size * 0.44}" font-weight="700" fill="${design.foreground}" text-anchor="middle" dominant-baseline="central">${letters}</text>`

  if (design.shape === 'none') {
    // No plate behind it, so the letters take the background colour instead.
    return `<text x="${x + half}" y="${y + half}" font-family="${escapeXml(design.font)}" font-size="${size * 0.52}" font-weight="700" fill="${design.background}" text-anchor="middle" dominant-baseline="central">${letters}</text>`
  }

  const plate =
    design.shape === 'circle'
      ? `<circle cx="${x + half}" cy="${y + half}" r="${half}" fill="${design.background}" />`
      : `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${design.shape === 'rounded' ? size * 0.22 : 0}" fill="${design.background}" />`

  return plate + text
}

/**
 * The finished logo, as SVG markup.
 *
 * `square` produces the version used for a favicon and small placements: the
 * mark alone, centred, on its own plate.
 */
export function logoSvg(design: LogoDesign, square = false): string {
  const colour = design.shape === 'none' ? design.background : design.foreground
  void colour

  if (square || design.layout === 'markOnly') {
    const size = 256
    const inset = design.shape === 'none' ? 0 : 24
    const markSize = size - inset * 2
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${mark(design, inset, inset, markSize)}</svg>`
  }

  const nameText = (x: number, y: number, anchor: 'start' | 'middle') =>
    `<text x="${x}" y="${y}" font-family="${escapeXml(design.font)}" font-size="42" font-weight="${design.bold ? 700 : 500}" letter-spacing="${design.tracking}em" fill="${design.background}" text-anchor="${anchor}" dominant-baseline="central">${escapeXml(design.name)}</text>`

  if (design.layout === 'nameOnly') {
    const width = nameWidth(design)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 72" width="${width}" height="72">${nameText(12, 36, 'start')}</svg>`
  }

  if (design.layout === 'markAbove') {
    const markSize = 72
    const width = Math.max(nameWidth(design), markSize + 24)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 150" width="${width}" height="150">${mark(design, (width - markSize) / 2, 0, markSize)}${nameText(width / 2, 118, 'middle')}</svg>`
  }

  // markLeft — the usual arrangement in a header
  const markSize = 64
  const gap = 16
  const width = markSize + gap + nameWidth(design)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${markSize}" width="${width}" height="${markSize}">${mark(design, 0, 0, markSize)}${nameText(markSize + gap, markSize / 2, 'start')}</svg>`
}

/** The SVG as a data URL, which is what the site stores. */
export function logoDataUrl(design: LogoDesign, square = false): string {
  const svg = logoSvg(design, square)
  // encodeURIComponent rather than base64: it keeps the markup readable in the
  // saved site and avoids the third-of-a-size penalty base64 adds.
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
