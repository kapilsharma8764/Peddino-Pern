import { Clock } from 'lucide-react'
import type { BlockConfig } from '../types'
import { todayIndex, type OpeningRow } from './hours-data'

/**
 * Opening hours — "office timing" from the brief.
 *
 * A row per day rather than one line of free text, because the question a
 * visitor actually has is "are they open now", and a table answers it at a
 * glance. Today's row is marked for the same reason.
 */

export function HoursBlock({ block }: { block: BlockConfig }) {
  const props = block.props
  const title = typeof props.title === 'string' ? props.title : ''
  const note = typeof props.note === 'string' ? props.note : ''
  const highlightToday = props.highlightToday !== false
  const rows = Array.isArray(props.rows) ? (props.rows as OpeningRow[]) : []

  if (rows.length === 0) {
    return (
      <section className="px-6 @md:px-10 py-12">
        <div className="max-w-md mx-auto text-center rounded-xl border border-border-default bg-bg-2 py-10">
          <Clock size={18} className="mx-auto text-text-3" />
          <p className="mt-2 text-sm text-text-2">Add your opening hours</p>
        </div>
      </section>
    )
  }

  const today = todayIndex()

  return (
    <section className="px-6 @md:px-10 py-12 @md:py-16">
      <div className="max-w-md mx-auto">
        {title && (
          <h2 data-edit="title" className="text-2xl @md:text-3xl font-bold tracking-tight text-center mb-6">{title}</h2>
        )}

        <dl className="rounded-xl border border-border-default overflow-hidden">
          {rows.map((row, index) => {
            const isToday = highlightToday && index === today
            const closed = !row.hours?.trim()

            return (
              <div
                key={`${row.day}-${index}`}
                className={`flex items-center justify-between gap-4 px-4 py-2.5 border-b border-border-subtle last:border-b-0 ${
                  isToday ? 'bg-brand/10' : ''
                }`}
              >
                <dt className={`text-sm ${isToday ? 'text-text-0 font-semibold' : 'text-text-1'}`}>
                  {row.day}
                  {isToday && <span className="ml-2 text-[10px] text-brand font-medium">Today</span>}
                </dt>
                <dd
                  className={`text-sm ${
                    closed ? 'text-text-3' : isToday ? 'text-text-0 font-semibold' : 'text-text-1'
                  }`}
                >
                  {closed ? 'Closed' : row.hours}
                </dd>
              </div>
            )
          })}
        </dl>

        {note && <p data-edit="note" className="mt-3 text-center text-[12.5px] text-text-2">{note}</p>}
      </div>
    </section>
  )
}
