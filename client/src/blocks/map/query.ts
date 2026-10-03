/**
 * Working out what to show on the map from whatever the business pasted.
 *
 * People paste a maps.google.com link, a share link, or just type an address,
 * so this accepts all three and hands Google a plain query — the only form
 * that works without an API key, which a small business will not obtain.
 */
export function mapQuery(props: Record<string, unknown>): string {
  const address = typeof props.address === 'string' ? props.address.trim() : ''
  if (address) return address

  const link = typeof props.mapUrl === 'string' ? props.mapUrl.trim() : ''
  if (!link) return ''

  // A pasted Google link usually carries the place after /place/ or in ?q=
  const place = link.match(/\/place\/([^/?]+)/)?.[1]
  if (place) return decodeURIComponent(place.replace(/\+/g, ' '))

  const q = link.match(/[?&]q=([^&]+)/)?.[1]
  if (q) return decodeURIComponent(q.replace(/\+/g, ' '))

  return ''
}

export function mapEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
}
