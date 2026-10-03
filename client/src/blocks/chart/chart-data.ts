/**
 * Turning the numbers someone typed into shapes a chart can draw.
 *
 * Business owners type "1,200", "85%", "₹4.5L" and sometimes nothing at all,
 * so the parsing is forgiving and the layout code never receives a NaN — a
 * single bad row should not blank out the whole chart.
 */

export interface ChartRow {
  label: string
  value: string
  color?: string
}

export interface ChartSlice {
  label: string
  value: number
  /** Share of the total, 0 to 1. Zero when every value is zero. */
  fraction: number
  /** What the user typed, kept for the label so "85%" stays "85%". */
  display: string
  color: string
}

/** Used when a row has no colour of its own. Distinct but not clownish. */
const PALETTE = ['#6366f1', '#a855f7', '#0d9488', '#ea7317', '#3f8f45', '#e0533d', '#1d4ed8']

export function parseValue(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  if (typeof raw !== 'string') return 0

  // Keep digits, a decimal point and a leading minus; drop ₹, %, commas, "L".
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) ? value : 0
}

export function toSlices(rows: unknown): ChartSlice[] {
  if (!Array.isArray(rows)) return []

  const parsed = rows
    .filter((row): row is ChartRow => Boolean(row) && typeof row === 'object')
    .map((row, index) => ({
      label: typeof row.label === 'string' ? row.label : '',
      display: typeof row.value === 'string' ? row.value : String(row.value ?? ''),
      value: Math.max(0, parseValue(row.value)),
      color: typeof row.color === 'string' && row.color ? row.color : PALETTE[index % PALETTE.length],
    }))

  const total = parsed.reduce((sum, row) => sum + row.value, 0)
  const largest = parsed.reduce((max, row) => Math.max(max, row.value), 0)

  return parsed.map((row) => ({
    ...row,
    // Bars are measured against the largest value, pie slices against the
    // total; `fraction` here is the share, and bars scale separately.
    fraction: total > 0 ? row.value / total : 0,
    barFraction: largest > 0 ? row.value / largest : 0,
  })) as (ChartSlice & { barFraction: number })[]
}

/** Points for a donut segment, as an SVG path. */
export function donutSegment(
  startFraction: number,
  endFraction: number,
  radius = 40,
  thickness = 16,
): string {
  const inner = radius - thickness
  const start = startFraction * Math.PI * 2 - Math.PI / 2
  const end = endFraction * Math.PI * 2 - Math.PI / 2
  const large = endFraction - startFraction > 0.5 ? 1 : 0

  const x = (r: number, angle: number) => (50 + r * Math.cos(angle)).toFixed(3)
  const y = (r: number, angle: number) => (50 + r * Math.sin(angle)).toFixed(3)

  return [
    `M ${x(radius, start)} ${y(radius, start)}`,
    `A ${radius} ${radius} 0 ${large} 1 ${x(radius, end)} ${y(radius, end)}`,
    `L ${x(inner, end)} ${y(inner, end)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${x(inner, start)} ${y(inner, start)}`,
    'Z',
  ].join(' ')
}
