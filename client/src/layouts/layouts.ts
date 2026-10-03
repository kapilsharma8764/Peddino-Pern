import type { BlockConfig, BlockStyle } from '@/blocks/types'
import { newId } from '@/lib/id'

/**
 * The layout library: structural skeletons only.
 *
 * A layout is a section made of containers. Every cell is an empty container —
 * a drop zone — so nothing here carries words, pictures or a design. That is
 * what keeps layouts, widgets and templates three separate things: the layout
 * says WHERE content goes, a widget is WHAT goes there, and a template is a
 * finished page. Layouts are plain `container` blocks, so everything already
 * built for containers (drag-and-drop, nesting, styling, undo, export) works
 * on them unchanged.
 */

export type LayoutCategory = 'Basic' | 'Columns' | 'Grid' | 'Hero' | 'Content' | 'Sidebar' | 'Cards' | 'Advanced'
export const layoutCategories: LayoutCategory[] = ['Basic', 'Columns', 'Grid', 'Hero', 'Content', 'Sidebar', 'Cards', 'Advanced']

/** One box in the miniature picture of a layout. `w` is its share of the row. */
export interface WireCell { w: number; tag?: string; fill?: 'media' | 'form' }
export type WireRow = WireCell[]

export interface LayoutDef {
  id: string
  label: string
  category: LayoutCategory
  /** Plain-language hint under the name. */
  hint?: string
  /** The wireframe: rows of cells. */
  wire: WireRow[]
  build: () => BlockConfig
}

const cell = (style?: BlockStyle, label?: string): BlockConfig => ({
  id: newId('block-container'),
  type: 'container',
  variant: 'grid',
  props: { columns: 1, gap: 16, align: 'start', ...(label ? { sectionLabel: label } : {}) },
  ...(style ? { style } : {}),
  children: [],
})

const sectionStyle = (extra: BlockStyle = {}): BlockStyle => ({ width: 'centered', paddingTop: 48, paddingBottom: 48, paddingLeft: 24, paddingRight: 24, ...extra })

const fr = (ratios: number[]) => ratios.map((r) => `minmax(0, ${r}fr)`).join(' ')

interface SectionOptions {
  gap?: number
  align?: string
  style?: BlockStyle
  /** Below this many columns on tablet. Omit to keep the desktop columns until mobile. */
  tablet?: 2
  stack?: boolean
  label?: string
  cellStyles?: (BlockStyle | undefined)[]
  template?: string
}

/** A section: one grid container whose cells are empty containers. */
function section(ratios: number[], count: number, options: SectionOptions = {}): BlockConfig {
  const columns = ratios.length
  return {
    id: newId('block-container'),
    type: 'container',
    variant: 'grid',
    props: {
      columns,
      template: options.template ?? fr(ratios),
      gap: options.gap ?? 24,
      align: options.align ?? 'stretch',
      stackOnMobile: options.stack ?? true,
      ...(options.tablet ? { tabletColumns: options.tablet } : {}),
      ...(options.label ? { sectionLabel: options.label } : {}),
    },
    style: options.style ?? sectionStyle(),
    children: Array.from({ length: count }, (_, i) => cell(options.cellStyles?.[i])),
  }
}

/** A section whose columns are not all the same share, e.g. 30 / 70. */
const cols = (ratios: number[], options?: SectionOptions) => () => section(ratios, ratios.length, options)
/** An equal grid of `columns` x `rows` cells. */
const grid = (columns: number, rows: number, options?: SectionOptions) => () => section(Array(columns).fill(1), columns * rows, { tablet: columns > 2 ? 2 : undefined, ...options })

const wireCols = (ratios: number[], tags?: (string | undefined)[], fills?: (WireCell['fill'])[]): WireRow[] => [ratios.map((w, i) => ({ w, tag: tags?.[i], fill: fills?.[i] }))]
const wireGrid = (columns: number, rows: number, tag?: string): WireRow[] => Array.from({ length: rows }, () => Array.from({ length: columns }, () => ({ w: 1, tag })))
const eq = (n: number) => Array(n).fill(1)

/** A section holding a heading cell above a nested grid of cards. */
const textAndCards = (cards: number) => (): BlockConfig => {
  const outer = section([1], 0, { gap: 32 })
  outer.children = [cell(undefined), section(eq(cards), cards, { gap: 24, tablet: cards > 2 ? 2 : undefined, style: { width: 'full', paddingTop: 0, paddingBottom: 0 } })]
  return outer
}

/** A grid whose right-hand cell holds a nested grid. */
const nested = (inner: number) => (): BlockConfig => {
  const outer = section([3, 7], 0, { gap: 24 })
  outer.children = [cell(), section(eq(inner), inner, { gap: 16, style: { width: 'full', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 } })]
  return outer
}

const full = { width: 'full' as const }

export const layouts: LayoutDef[] = [
  // ── Basic ───────────────────────────────────────────────
  { id: 'one-column', label: '1 Column', category: 'Basic', wire: wireCols([1]), build: cols([1]) },
  { id: 'two-equal', label: '2 Equal Columns', category: 'Basic', hint: '50 / 50', wire: wireCols([1, 1]), build: cols([1, 1]) },
  { id: 'three-equal', label: '3 Equal Columns', category: 'Basic', hint: '33 / 33 / 33', wire: wireCols(eq(3)), build: cols(eq(3), { tablet: 2 }) },
  { id: 'four-equal', label: '4 Equal Columns', category: 'Basic', hint: '25 each', wire: wireCols(eq(4)), build: cols(eq(4), { tablet: 2 }) },

  // ── Columns: two ────────────────────────────────────────
  { id: 'c-30-70', label: '30 / 70', category: 'Columns', wire: wireCols([3, 7]), build: cols([3, 7]) },
  { id: 'c-70-30', label: '70 / 30', category: 'Columns', wire: wireCols([7, 3]), build: cols([7, 3]) },
  { id: 'c-40-60', label: '40 / 60', category: 'Columns', wire: wireCols([4, 6]), build: cols([4, 6]) },
  { id: 'c-60-40', label: '60 / 40', category: 'Columns', wire: wireCols([6, 4]), build: cols([6, 4]) },
  { id: 'c-25-75', label: '25 / 75', category: 'Columns', wire: wireCols([1, 3]), build: cols([1, 3]) },
  { id: 'c-75-25', label: '75 / 25', category: 'Columns', wire: wireCols([3, 1]), build: cols([3, 1]) },
  { id: 'c-33-67', label: '33 / 67', category: 'Columns', wire: wireCols([1, 2]), build: cols([1, 2]) },
  { id: 'c-67-33', label: '67 / 33', category: 'Columns', wire: wireCols([2, 1]), build: cols([2, 1]) },
  // ── Columns: three ──────────────────────────────────────
  { id: 'c-25-50-25', label: '25 / 50 / 25', category: 'Columns', wire: wireCols([1, 2, 1]), build: cols([1, 2, 1], { tablet: 2 }) },
  { id: 'c-20-60-20', label: '20 / 60 / 20', category: 'Columns', wire: wireCols([1, 3, 1]), build: cols([1, 3, 1], { tablet: 2 }) },
  { id: 'c-25-25-50', label: '25 / 25 / 50', category: 'Columns', wire: wireCols([1, 1, 2]), build: cols([1, 1, 2], { tablet: 2 }) },
  { id: 'c-50-25-25', label: '50 / 25 / 25', category: 'Columns', wire: wireCols([2, 1, 1]), build: cols([2, 1, 1], { tablet: 2 }) },
  { id: 'c-20-40-40', label: '20 / 40 / 40', category: 'Columns', wire: wireCols([1, 2, 2]), build: cols([1, 2, 2], { tablet: 2 }) },
  { id: 'c-40-40-20', label: '40 / 40 / 20', category: 'Columns', wire: wireCols([2, 2, 1]), build: cols([2, 2, 1], { tablet: 2 }) },

  // ── Grid ────────────────────────────────────────────────
  { id: 'g-2x2', label: '2 × 2 Grid', category: 'Grid', wire: wireGrid(2, 2), build: grid(2, 2) },
  { id: 'g-3x2', label: '3 × 2 Grid', category: 'Grid', wire: wireGrid(3, 2), build: grid(3, 2) },
  { id: 'g-3x3', label: '3 × 3 Grid', category: 'Grid', wire: wireGrid(3, 3), build: grid(3, 3) },
  { id: 'g-4x2', label: '4 × 2 Grid', category: 'Grid', wire: wireGrid(4, 2), build: grid(4, 2) },
  { id: 'g-4x3', label: '4 × 3 Grid', category: 'Grid', wire: wireGrid(4, 3), build: grid(4, 3) },
  {
    id: 'g-auto', label: 'Auto-fit Grid', category: 'Grid', hint: 'Fits as many as the screen allows', wire: wireGrid(3, 2),
    build: () => section([1], 6, { template: 'repeat(auto-fit, minmax(240px, 1fr))', stack: false }),
  },
  { id: 'g-cards', label: 'Responsive Card Grid', category: 'Grid', hint: '3 on desktop, 2 on tablet, 1 on mobile', wire: wireGrid(3, 2, 'CARD'), build: grid(3, 2) },

  // ── Sidebar ─────────────────────────────────────────────
  { id: 's-left', label: 'Left Sidebar', category: 'Sidebar', wire: wireCols([1, 3], ['SIDE', 'CONTENT']), build: cols([1, 3], { align: 'start' }) },
  { id: 's-right', label: 'Right Sidebar', category: 'Sidebar', wire: wireCols([3, 1], ['CONTENT', 'SIDE']), build: cols([3, 1], { align: 'start' }) },
  { id: 's-double', label: 'Double Sidebar', category: 'Sidebar', wire: wireCols([1, 3, 1], ['LEFT', 'CONTENT', 'RIGHT']), build: cols([1, 3, 1], { align: 'start', tablet: 2 }) },

  // ── Hero ────────────────────────────────────────────────
  { id: 'h-centered', label: 'Hero — Centered', category: 'Hero', wire: wireCols([1]), build: cols([1], { style: sectionStyle({ minHeight: 420, paddingTop: 96, paddingBottom: 96 }), label: 'Hero' }) },
  { id: 'h-left-right', label: 'Hero — Left / Right', category: 'Hero', wire: wireCols([1, 1], ['TEXT', 'MEDIA']), build: cols([1, 1], { align: 'center', style: sectionStyle({ minHeight: 420, paddingTop: 72, paddingBottom: 72 }), label: 'Hero' }) },
  { id: 'h-right-left', label: 'Hero — Right / Left', category: 'Hero', wire: wireCols([1, 1], ['MEDIA', 'TEXT']), build: cols([1, 1], { align: 'center', style: sectionStyle({ minHeight: 420, paddingTop: 72, paddingBottom: 72 }), label: 'Hero' }) },
  { id: 'h-full', label: 'Hero — Full Width', category: 'Hero', wire: wireCols([1]), build: cols([1], { style: { ...full, minHeight: 520, paddingTop: 96, paddingBottom: 96, paddingLeft: 32, paddingRight: 32 }, label: 'Hero' }) },
  { id: 'h-content-media', label: 'Hero — Content + Media', category: 'Hero', wire: wireCols([3, 2], ['TEXT', 'MEDIA'], [undefined, 'media']), build: cols([3, 2], { align: 'center', style: sectionStyle({ minHeight: 420, paddingTop: 72, paddingBottom: 72 }), label: 'Hero' }) },
  { id: 'h-content-form', label: 'Hero — Content + Form', category: 'Hero', wire: wireCols([3, 2], ['TEXT', 'FORM'], [undefined, 'form']), build: cols([3, 2], { align: 'center', style: sectionStyle({ minHeight: 420, paddingTop: 72, paddingBottom: 72 }), label: 'Hero' }) },
  { id: 'h-40-60', label: 'Hero — Split 40/60', category: 'Hero', wire: wireCols([4, 6]), build: cols([4, 6], { align: 'center', style: sectionStyle({ minHeight: 420, paddingTop: 72, paddingBottom: 72 }), label: 'Hero' }) },
  { id: 'h-60-40', label: 'Hero — Split 60/40', category: 'Hero', wire: wireCols([6, 4]), build: cols([6, 4], { align: 'center', style: sectionStyle({ minHeight: 420, paddingTop: 72, paddingBottom: 72 }), label: 'Hero' }) },
  { id: 'h-three', label: 'Hero — Three Column', category: 'Hero', wire: wireCols(eq(3)), build: cols(eq(3), { align: 'center', tablet: 2, style: sectionStyle({ minHeight: 420, paddingTop: 72, paddingBottom: 72 }), label: 'Hero' }) },
  {
    id: 'h-overlay', label: 'Hero — Content Overlay', category: 'Hero', hint: 'Content sits over a background image', wire: [[{ w: 1, tag: 'OVER', fill: 'media' }]],
    build: cols([1], { style: { ...full, minHeight: 560, paddingTop: 120, paddingBottom: 120, paddingLeft: 32, paddingRight: 32 }, label: 'Hero' }),
  },

  // ── Content ─────────────────────────────────────────────
  { id: 'ct-image-content', label: 'Image + Content', category: 'Content', wire: wireCols([1, 1], ['IMAGE', 'CONTENT'], ['media']), build: cols([1, 1], { align: 'center' }) },
  { id: 'ct-content-image', label: 'Content + Image', category: 'Content', wire: wireCols([1, 1], ['CONTENT', 'IMAGE'], [undefined, 'media']), build: cols([1, 1], { align: 'center' }) },
  { id: 'ct-heading-content', label: 'Heading + Content', category: 'Content', wire: [[{ w: 1, tag: 'HEADING' }], [{ w: 1, tag: 'CONTENT' }]], build: () => section([1], 2, { gap: 24 }) },
  { id: 'ct-content-sidebar', label: 'Content + Sidebar', category: 'Content', wire: wireCols([7, 3], ['CONTENT', 'SIDE']), build: cols([7, 3], { align: 'start' }) },
  { id: 'ct-full', label: 'Full-width Content', category: 'Content', wire: wireCols([1], ['CONTENT']), build: cols([1], { style: { ...full, paddingTop: 48, paddingBottom: 48, paddingLeft: 32, paddingRight: 32 } }) },
  { id: 'ct-narrow', label: 'Centered Narrow Content', category: 'Content', wire: [[{ w: 1, tag: 'NARROW' }]], build: cols([1], { style: { width: 'narrow', paddingTop: 48, paddingBottom: 48, paddingLeft: 24, paddingRight: 24 } }) },
  { id: 'ct-two', label: 'Two Content Columns', category: 'Content', wire: wireCols([1, 1], ['TEXT', 'TEXT']), build: cols([1, 1], { gap: 40 }) },
  { id: 'ct-three', label: 'Three Content Columns', category: 'Content', wire: wireCols(eq(3), ['TEXT', 'TEXT', 'TEXT']), build: cols(eq(3), { gap: 32, tablet: 2 }) },
  { id: 'ct-four', label: 'Four Content Columns', category: 'Content', wire: wireCols(eq(4), ['TEXT', 'TEXT', 'TEXT', 'TEXT']), build: cols(eq(4), { gap: 24, tablet: 2 }) },
  { id: 'ct-text-cards', label: 'Text + Cards', category: 'Content', hint: 'A heading above three cards', wire: [[{ w: 1, tag: 'TEXT' }], [{ w: 1, tag: 'CARD' }, { w: 1, tag: 'CARD' }, { w: 1, tag: 'CARD' }]], build: textAndCards(3) },
  { id: 'ct-media-details', label: 'Media + Details', category: 'Content', wire: wireCols([4, 6], ['MEDIA', 'DETAILS'], ['media']), build: cols([4, 6], { align: 'center' }) },
  { id: 'ct-details-media', label: 'Details + Media', category: 'Content', wire: wireCols([6, 4], ['DETAILS', 'MEDIA'], [undefined, 'media']), build: cols([6, 4], { align: 'center' }) },

  // ── Cards ───────────────────────────────────────────────
  { id: 'cd-2', label: '2 Cards', category: 'Cards', wire: wireCols([1, 1], ['CARD', 'CARD']), build: cols([1, 1], { gap: 24 }) },
  { id: 'cd-3', label: '3 Cards', category: 'Cards', wire: wireCols(eq(3), ['CARD', 'CARD', 'CARD']), build: cols(eq(3), { tablet: 2 }) },
  { id: 'cd-4', label: '4 Cards', category: 'Cards', wire: wireCols(eq(4), ['CARD', 'CARD', 'CARD', 'CARD']), build: cols(eq(4), { tablet: 2 }) },
  { id: 'cd-6', label: '6 Cards', category: 'Cards', wire: wireGrid(3, 2, 'CARD'), build: grid(3, 2) },
  { id: 'cd-feature', label: 'Feature Grid', category: 'Cards', wire: wireGrid(3, 2, 'FEATURE'), build: grid(3, 2, { gap: 32 }) },
  { id: 'cd-pricing', label: 'Pricing Grid', category: 'Cards', wire: wireCols(eq(3), ['PLAN', 'PLAN', 'PLAN']), build: cols(eq(3), { gap: 28, align: 'start', tablet: 2 }) },
  { id: 'cd-team', label: 'Team Grid', category: 'Cards', wire: wireCols(eq(4), ['PERSON', 'PERSON', 'PERSON', 'PERSON']), build: cols(eq(4), { gap: 24, tablet: 2 }) },
  { id: 'cd-portfolio', label: 'Portfolio Grid', category: 'Cards', wire: wireGrid(3, 2, 'WORK'), build: grid(3, 2, { gap: 16 }) },
  { id: 'cd-service', label: 'Service Grid', category: 'Cards', wire: wireGrid(3, 2, 'SERVICE'), build: grid(3, 2) },
  { id: 'cd-product', label: 'Product Grid', category: 'Cards', wire: wireGrid(4, 2, 'ITEM'), build: grid(4, 2, { gap: 20 }) },
  { id: 'cd-testimonial', label: 'Testimonial Grid', category: 'Cards', wire: wireCols(eq(3), ['QUOTE', 'QUOTE', 'QUOTE']), build: cols(eq(3), { tablet: 2 }) },

  // ── Advanced ────────────────────────────────────────────
  { id: 'a-full-section', label: 'Full-width Section', category: 'Advanced', wire: [[{ w: 1, tag: 'FULL' }]], build: cols([1], { style: { ...full, paddingTop: 64, paddingBottom: 64, paddingLeft: 32, paddingRight: 32 } }) },
  { id: 'a-boxed', label: 'Boxed Container', category: 'Advanced', wire: [[{ w: 1, tag: 'BOX' }]], build: cols([1], { style: sectionStyle({ maxWidth: 1100 }) }) },
  { id: 'a-full-container', label: 'Full-width Container', category: 'Advanced', wire: [[{ w: 1, tag: 'FULL' }]], build: cols([1], { style: { ...full, paddingTop: 0, paddingBottom: 0 } }) },
  {
    id: 'a-nested', label: 'Nested Container', category: 'Advanced', hint: 'A container inside a container', wire: [[{ w: 1, tag: '▢ ▢' }]],
    build: () => { const outer = section([1], 0); outer.children = [section([1], 1, { style: { width: 'full', paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 } })]; return outer },
  },
  {
    id: 'a-horizontal', label: 'Horizontal Container', category: 'Advanced', hint: 'Widgets side by side', wire: [[{ w: 1, tag: '→' }]],
    build: () => ({ id: newId('block-container'), type: 'container', variant: 'flex', props: { direction: 'row', gap: 16, align: 'center', justify: 'start', wrap: true }, style: sectionStyle({ paddingTop: 24, paddingBottom: 24 }), children: [] }),
  },
  {
    id: 'a-vertical', label: 'Vertical Container', category: 'Advanced', hint: 'Widgets one above the other', wire: [[{ w: 1, tag: '↓' }]],
    build: () => ({ id: newId('block-container'), type: 'container', variant: 'flex', props: { direction: 'column', gap: 16, align: 'stretch', justify: 'start', wrap: false }, style: sectionStyle({ paddingTop: 24, paddingBottom: 24 }), children: [] }),
  },
  { id: 'a-sticky', label: 'Sticky Sidebar', category: 'Advanced', hint: 'The sidebar stays in view while scrolling', wire: wireCols([1, 3], ['STICKY', 'CONTENT']), build: cols([1, 3], { align: 'start', cellStyles: [{ position: 'sticky', top: 24 }, undefined] }) },
  { id: 'a-split-screen', label: 'Split-screen', category: 'Advanced', hint: 'Two halves, full height', wire: wireCols([1, 1], ['HALF', 'HALF'], ['media']), build: cols([1, 1], { gap: 0, align: 'stretch', style: { ...full, minHeight: 520, paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }, cellStyles: [{ minHeight: 520 }, { minHeight: 520 }] }) },
  { id: 'a-stacked', label: 'Stacked Sections', category: 'Advanced', wire: [[{ w: 1, tag: '1' }], [{ w: 1, tag: '2' }], [{ w: 1, tag: '3' }]], build: () => section([1], 3, { gap: 32 }) },
  {
    id: 'a-overlap', label: 'Overlapping Structure', category: 'Advanced', hint: 'The second box overlaps the first', wire: [[{ w: 1, tag: 'BACK', fill: 'media' }], [{ w: 1, tag: 'FRONT' }]],
    build: () => section([1], 2, { gap: 0, cellStyles: [{ minHeight: 280 }, { marginTop: -72, paddingLeft: 32, paddingRight: 32, background: 'var(--color-bg-1)', radius: 12, shadow: 'soft' }] }),
  },
  { id: 'a-media-split', label: 'Media / Content Split', category: 'Advanced', wire: wireCols([1, 1], ['MEDIA', 'CONTENT'], ['media']), build: cols([1, 1], { gap: 48, align: 'center' }) },
  { id: 'a-centered', label: 'Centered Content Container', category: 'Advanced', wire: [[{ w: 1, tag: 'CENTER' }]], build: cols([1], { style: sectionStyle({ maxWidth: 800 }) }) },
  { id: 'a-narrow-reading', label: 'Narrow Reading Container', category: 'Advanced', hint: 'Comfortable for long text', wire: [[{ w: 1, tag: 'READ' }]], build: cols([1], { style: { width: 'narrow', paddingTop: 48, paddingBottom: 48, paddingLeft: 24, paddingRight: 24, maxWidth: 680 } }) },
  { id: 'a-wide', label: 'Wide Content Container', category: 'Advanced', wire: [[{ w: 1, tag: 'WIDE' }]], build: cols([1], { style: sectionStyle({ maxWidth: 1400 }) }) },
  { id: 'a-multirow', label: 'Multi-row Grid', category: 'Advanced', wire: wireGrid(3, 3), build: grid(3, 3, { gap: 20 }) },
  {
    id: 'a-auto', label: 'Responsive Auto Grid', category: 'Advanced', wire: wireGrid(4, 2),
    build: () => section([1], 8, { template: 'repeat(auto-fit, minmax(200px, 1fr))', stack: false, gap: 20 }),
  },
  { id: 'a-nested-two', label: 'Nested Two-column', category: 'Advanced', hint: '30/70 with two columns inside the right side', wire: [[{ w: 3, tag: 'LEFT' }, { w: 7, tag: '▢ ▢' }]], build: nested(2) },
  { id: 'a-nested-three', label: 'Nested Three-column', category: 'Advanced', hint: '30/70 with three columns inside the right side', wire: [[{ w: 3, tag: 'LEFT' }, { w: 7, tag: '▢ ▢ ▢' }]], build: nested(3) },
]

export const layoutMap = new Map(layouts.map((layout) => [layout.id, layout]))

/** The starting choices shown on an empty page. */
export const quickLayoutIds = ['one-column', 'two-equal', 'three-equal', 's-right', 'g-2x2', 'h-left-right']

export function buildLayout(id: string): BlockConfig {
  const layout = layoutMap.get(id)
  if (!layout) throw new Error(`Unknown layout: ${id}`)
  return layout.build()
}

export function matchesLayoutSearch(layout: LayoutDef, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return `${layout.label} ${layout.category} ${layout.hint ?? ''}`.toLowerCase().includes(q)
}
