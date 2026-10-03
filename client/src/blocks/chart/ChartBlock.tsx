import { BarChart3 } from 'lucide-react'
import type { BlockConfig } from '../types'
import { donutSegment, toSlices } from './chart-data'

/**
 * "Graphs & Information" from the brief.
 *
 * Drawn as plain SVG rather than with a charting library: three shapes is not
 * worth two hundred kilobytes on a small business's homepage, and it means the
 * published file has no script to load before the chart appears.
 */

export function ChartBlock({ block }: { block: BlockConfig }) {
  const props = block.props
  const title = typeof props.title === 'string' ? props.title : ''
  const subtitle = typeof props.subtitle === 'string' ? props.subtitle : ''
  const slices = toSlices(props.items) as (ReturnType<typeof toSlices>[number] & {
    barFraction: number
  })[]

  if (slices.length === 0) {
    return (
      <section className="px-6 @md:px-10 py-12 @md:py-16">
        <div className="max-w-md mx-auto text-center rounded-xl border border-border-default bg-bg-2 py-10">
          <BarChart3 size={18} className="mx-auto text-text-3" />
          <p className="mt-2 text-sm text-text-2">Add some numbers to draw the chart</p>
        </div>
      </section>
    )
  }

  const heading = (
    <div className="text-center mb-8">
      {title && <h2 data-edit="title" className="text-2xl @md:text-3xl font-bold tracking-tight">{title}</h2>}
      {subtitle && <p data-edit="subtitle" className="mt-2 text-sm text-text-2">{subtitle}</p>}
    </div>
  )

  if (block.variant === 'donut') {
    // Where each segment starts, worked out up front so the drawing pass has
    // no running total to carry.
    const starts = slices.reduce<number[]>((offsets, _slice, index) => {
      offsets.push(index === 0 ? 0 : offsets[index - 1] + slices[index - 1].fraction)
      return offsets
    }, [])

    return (
      <section className="px-6 @md:px-10 py-12 @md:py-16">
        {heading}
        <div className="max-w-2xl mx-auto grid gap-8 @xl:grid-cols-[auto_1fr] @xl:items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-44 h-44 mx-auto" role="img" aria-label={title || 'Chart'}>
            {slices.map((slice, index) =>
              // A zero-value row would draw a stray line at the top.
              slice.fraction <= 0 ? null : (
                <path
                  key={slice.label}
                  d={donutSegment(starts[index], starts[index] + slice.fraction)}
                  fill={slice.color}
                  stroke="var(--color-bg-1)"
                  strokeWidth="0.6"
                />
              ),
            )}
          </svg>

          <ul className="space-y-2">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-text-1 flex-1">{slice.label}</span>
                <span className="text-text-0 font-semibold">{slice.display}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  if (block.variant === 'columns') {
    return (
      <section className="px-6 @md:px-10 py-12 @md:py-16">
        {heading}
        <div className="max-w-3xl mx-auto flex items-end justify-center gap-4 h-56">
          {slices.map((slice) => (
            <div key={slice.label} className="flex-1 max-w-24 flex flex-col items-center gap-2">
              <span className="text-sm font-bold text-text-0">{slice.display}</span>
              <div
                className="w-full rounded-t-lg transition-all"
                style={{
                  // A minimum height keeps a small value visible rather than
                  // collapsing it to an invisible sliver.
                  height: `${Math.max(4, slice.barFraction * 100)}%`,
                  backgroundColor: slice.color,
                }}
              />
              <span className="text-[11.5px] text-text-2 text-center leading-snug">
                {slice.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // bars (default) — horizontal, which suits long labels
  return (
    <section className="px-6 @md:px-10 py-12 @md:py-16">
      {heading}
      <div className="max-w-2xl mx-auto space-y-4">
        {slices.map((slice) => (
          <div key={slice.label}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm text-text-1">{slice.label}</span>
              <span className="text-sm font-semibold text-text-0">{slice.display}</span>
            </div>
            <div className="h-2.5 rounded-full bg-bg-3 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, slice.barFraction * 100)}%`,
                  backgroundColor: slice.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
