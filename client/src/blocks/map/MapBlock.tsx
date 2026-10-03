import { MapPin } from 'lucide-react'
import type { BlockConfig } from '../types'
import { mapEmbedUrl, mapQuery } from './query'

/**
 * A Google map showing where the business is.
 *
 * People paste whatever Google gives them — a maps.google.com link, a share
 * link, or the full embed snippet — so rather than demand a particular format
 * we accept a place name or address and let Google resolve it. That is the
 * only form that works without an API key, which matters because a business
 * owner will not obtain one.
 */


export function MapBlock({ block }: { block: BlockConfig }) {
  const props = block.props
  const title = typeof props.title === 'string' ? props.title : ''
  const address = typeof props.address === 'string' ? props.address : ''
  const timing = typeof props.timing === 'string' ? props.timing : ''
  const height = Number(props.height) || 360
  const query = mapQuery(props)

  const frame = query ? (
    <iframe
      title={title || 'Location map'}
      src={mapEmbedUrl(query)}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className="w-full border-0"
      style={{ height: `${height}px` }}
    />
  ) : (
    // Never a blank rectangle: say what is missing and where to fix it.
    <div
      className="w-full grid place-items-center bg-bg-2 border border-border-default rounded-lg text-center px-6"
      style={{ height: `${height}px` }}
    >
      <div>
        <MapPin size={18} className="mx-auto text-text-3" />
        <p className="mt-2 text-sm text-text-2">Add your address to show the map</p>
      </div>
    </div>
  )

  if (block.variant === 'side-by-side') {
    return (
      <section className="px-6 @md:px-10 py-12 @md:py-16">
        <div className="grid gap-8 @2xl:grid-cols-2 @2xl:items-center">
          <div>
            {title && <h2 data-edit="title" className="text-2xl @md:text-3xl font-bold tracking-tight mb-3">{title}</h2>}
            {address && <p className="text-text-1 leading-relaxed whitespace-pre-line">{address}</p>}
            {timing && (
              <p className="mt-3 text-sm text-text-2">
                <span className="font-medium text-text-1">Open</span> {timing}
              </p>
            )}
          </div>
          <div className="overflow-hidden rounded-xl border border-border-default">{frame}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-6 @md:px-10 py-12 @md:py-16">
      {title && (
        <h2 data-edit="title" className="text-2xl @md:text-3xl font-bold tracking-tight text-center mb-6">{title}</h2>
      )}
      <div className="overflow-hidden rounded-xl border border-border-default">{frame}</div>
      {(address || timing) && (
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-text-2">
          {address && <span className="whitespace-pre-line">{address}</span>}
          {timing && <span>{timing}</span>}
        </div>
      )}
    </section>
  )
}
