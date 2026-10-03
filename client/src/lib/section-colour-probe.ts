import { normalizeHex, parseHex, rgbToHsl, toHex, type Rgb } from './color'

/**
 * The colours actually used inside one selected part of an imported template, and a way to
 * swap one of them for another inside that part only.
 *
 * Nothing here knows about a particular template. The open page reports what each element in
 * the selection really looks like (computed styles), this file ranks it into a main background,
 * an accent and the rest, and turns "change #9be9e2 to #e8e2ff" into a list of inline style
 * edits for exactly the elements, in exactly this selection, that use that colour. The edits are
 * written into the saved page, so they save, preview and export with it, and undo like any edit.
 *
 * Images are never touched: only colour properties are read or written.
 */

export type ColourRole = 'background' | 'buttonBg' | 'heading' | 'text' | 'buttonText' | 'link' | 'icon' | 'border'

/** One colour property of one element: the CSS property, the colour as the browser reports it, and what it is used for. */
export interface ProbeProp { p: string; c: string; r: ColourRole }
/** `hidden` entries (not on screen right now) take part in a change, but not in ranking what the colours are. */
export interface ProbeEntry { id: string; area: number; props: ProbeProp[]; hidden?: boolean }
export interface SectionProbe {
  /** The node the colours were read from. */
  id: string
  area: number
  /** The selection's own background colour as reported (may be transparent). */
  rootBg: string
  rootGradient: boolean
  rootImage: boolean
  entries: ProbeEntry[]
}

/** The only properties that are ever read or written, and the only values accepted for them. */
export const COLOUR_PROPERTIES = ['background-color', 'color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'fill', 'stroke'] as const
export type ColourEdits = Record<string, Record<string, string>>

export interface DetectedColour {
  hex: string
  label: string
  /** Elements using this colour in the selection. */
  count: number
  weight: number
  roles: Partial<Record<ColourRole, number>>
}

export interface SectionColours {
  /** The main background; `hex` is null when the selection paints nothing of its own. */
  background: { hex: string | null; transparent: boolean; gradient: boolean; image: boolean; derived: boolean }
  accent: DetectedColour | null
  more: DetectedColour[]
}

/** A colour from computed style (`rgb()`, `rgba()`, `color(srgb …)`) or a hex string, as `#rrggbb` plus its opacity. */
export function parseCssColor(value: string): { hex: string; alpha: number } | null {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text || text === 'transparent') return null
  const hex = normalizeHex(text)
  if (hex && text.startsWith('#')) return { hex, alpha: 1 }
  const rgb = text.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (rgb) {
    const alpha = rgb[4] === undefined ? 1 : rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4])
    return { hex: toHex([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])]), alpha }
  }
  const srgb = text.match(/^color\(\s*srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/)
  if (srgb) {
    const alpha = srgb[4] === undefined ? 1 : srgb[4].endsWith('%') ? parseFloat(srgb[4]) / 100 : parseFloat(srgb[4])
    return { hex: toHex([Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255]), alpha }
  }
  return null
}

const OPAQUE = 0.05

/** White, black and greys carry no brand: an accent is something with some colour in it. */
export function isNeutral(hex: string): boolean {
  const [, s, l] = rgbToHsl(parseHex(hex) as Rgb)
  return s < 0.14 || l < 0.07 || l > 0.95
}

const LABELS: Record<ColourRole, string> = {
  background: 'Other background', buttonBg: 'Button', heading: 'Headings', text: 'Text', buttonText: 'Button text', link: 'Links', icon: 'Icons', border: 'Borders',
}

function weightOf(role: ColourRole, entry: ProbeEntry, area: number): number {
  switch (role) {
    case 'background': return 1 + Math.min(100, (entry.area / Math.max(1, area)) * 100)
    case 'buttonBg': return 12
    case 'link': case 'icon': return 6
    case 'buttonText': case 'heading': return 3
    case 'border': return 2
    default: return 1
  }
}

/** Every distinct colour of the selection with how it is used, strongest first. */
export function detectColours(probe: SectionProbe): DetectedColour[] {
  const found = new Map<string, DetectedColour>()
  for (const entry of probe.entries) {
    if (entry.hidden) continue
    for (const prop of entry.props) {
      const parsed = parseCssColor(prop.c)
      if (!parsed || parsed.alpha < OPAQUE) continue
      const item = found.get(parsed.hex) ?? { hex: parsed.hex, label: '', count: 0, weight: 0, roles: {} }
      item.count += 1
      item.weight += weightOf(prop.r, entry, probe.area)
      item.roles[prop.r] = (item.roles[prop.r] ?? 0) + 1
      found.set(parsed.hex, item)
    }
  }
  for (const item of found.values()) {
    const top = (Object.entries(item.roles) as [ColourRole, number][]).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'text'
    item.label = LABELS[top]
  }
  return [...found.values()].sort((a, b) => b.weight - a.weight)
}

/** The main background, the accent and the rest, from what the page reports. */
export function summarizeSection(probe: SectionProbe): SectionColours {
  const colours = detectColours(probe)
  const own = parseCssColor(probe.rootBg)
  let background: SectionColours['background']
  if (own && own.alpha >= OPAQUE) {
    background = { hex: own.hex, transparent: false, gradient: probe.rootGradient, image: probe.rootImage, derived: false }
  } else {
    // The selection paints nothing itself; what shows through is usually the largest painted area inside it.
    const areaBy = new Map<string, number>()
    for (const entry of probe.entries) {
      if (entry.hidden) continue
      for (const prop of entry.props) {
        if (prop.r !== 'background') continue
        const parsed = parseCssColor(prop.c)
        if (parsed && parsed.alpha >= OPAQUE) areaBy.set(parsed.hex, (areaBy.get(parsed.hex) ?? 0) + entry.area)
      }
    }
    const best = [...areaBy.entries()].sort((a, b) => b[1] - a[1])[0]
    background = best
      ? { hex: best[0], transparent: false, gradient: probe.rootGradient, image: probe.rootImage, derived: true }
      : { hex: null, transparent: true, gradient: probe.rootGradient, image: probe.rootImage, derived: false }
  }
  const rest = colours.filter((colour) => colour.hex !== background.hex)
  const accentScore = (colour: DetectedColour) =>
    (colour.roles.buttonBg ?? 0) * 10 + (colour.roles.link ?? 0) * 6 + (colour.roles.icon ?? 0) * 6 + (colour.roles.border ?? 0) * 3 + (colour.roles.background ?? 0) * 4 + (colour.roles.heading ?? 0) * 2
  const accent = rest.filter((colour) => !isNeutral(colour.hex) && accentScore(colour) > 0).sort((a, b) => accentScore(b) - accentScore(a))[0] ?? null
  return { background, accent, more: rest.filter((colour) => colour.hex !== accent?.hex) }
}

const SAFE_VALUE = /^#[0-9a-f]{6}$/

/** Every use of `from` inside the selection, as the inline edits that give it `to` instead. */
export function recolorEdits(probe: SectionProbe, from: string, to: string): ColourEdits {
  const source = normalizeHex(from)
  const target = normalizeHex(to)
  const edits: ColourEdits = {}
  if (!source || !target || source === target) return edits
  for (const entry of probe.entries) {
    for (const prop of entry.props) {
      if (parseCssColor(prop.c)?.hex !== source) continue
      ;(edits[entry.id] ??= {})[prop.p] = target
    }
  }
  return edits
}

/** Gives the selection itself a background colour (an image stays; a gradient is replaced only by this deliberate choice). */
export function backgroundEdits(probe: SectionProbe, to: string): ColourEdits {
  const target = normalizeHex(to)
  if (!target) return {}
  return { [probe.id]: { 'background-color': target, ...(probe.rootGradient ? { 'background-image': 'none' } : {}) } }
}

/** The probe as it will read once `edits` are applied, so the panel shows the new colour at once. */
export function withEdits(probe: SectionProbe, edits: ColourEdits): SectionProbe {
  const rootEdit = edits[probe.id]?.['background-color']
  return {
    ...probe,
    rootBg: rootEdit ?? probe.rootBg,
    rootGradient: edits[probe.id]?.['background-image'] === 'none' ? false : probe.rootGradient,
    entries: probe.entries.map((entry) => {
      const changed = edits[entry.id]
      if (!changed) return entry
      const props = entry.props.map((prop) => (changed[prop.p] ? { ...prop, c: changed[prop.p] } : prop))
      // A background the selection did not paint before is now one.
      if (changed['background-color'] && !entry.props.some((prop) => prop.p === 'background-color')) props.push({ p: 'background-color', c: changed['background-color'], r: 'background' })
      return { ...entry, props }
    }),
  }
}

/** Keeps only edits this feature may make: known colour properties, real colours, node ids of the form n12. */
export function safeEdits(edits: ColourEdits): ColourEdits {
  const clean: ColourEdits = {}
  for (const [id, props] of Object.entries(edits)) {
    if (!/^n\d+$/.test(id)) continue
    for (const [prop, value] of Object.entries(props)) {
      const allowed = (COLOUR_PROPERTIES as readonly string[]).includes(prop) ? SAFE_VALUE.test(value) : prop === 'background-image' && value === 'none'
      if (allowed) (clean[id] ??= {})[prop] = value
    }
  }
  return clean
}

/** Reads the page's report of the selection (a message from the canvas) into a probe, or null if it is not one. */
export function readProbe(data: unknown): SectionProbe | null {
  const d = data as Partial<Record<string, unknown>> | null
  if (!d || typeof d.id !== 'string' || !Array.isArray(d.entries)) return null
  const entries: ProbeEntry[] = []
  for (const raw of d.entries.slice(0, 4000)) {
    const e = raw as { id?: unknown; area?: unknown; props?: unknown; h?: unknown }
    if (typeof e.id !== 'string' || !/^n\d+$/.test(e.id) || !Array.isArray(e.props)) continue
    const props = (e.props as { p?: unknown; c?: unknown; r?: unknown }[])
      .filter((x) => typeof x.p === 'string' && (COLOUR_PROPERTIES as readonly string[]).includes(x.p) && typeof x.c === 'string' && typeof x.r === 'string' && x.r in LABELS)
      .map((x) => ({ p: x.p as string, c: x.c as string, r: x.r as ColourRole }))
    entries.push({ id: e.id, area: Number.isFinite(e.area) ? Number(e.area) : 0, props, ...(e.h === 1 ? { hidden: true } : {}) })
  }
  return {
    id: d.id,
    area: Number.isFinite(d.area) ? Number(d.area) : 0,
    rootBg: typeof d.rootBg === 'string' ? d.rootBg : '',
    rootGradient: d.rootGradient === true,
    rootImage: d.rootImage === true,
    entries,
  }
}
