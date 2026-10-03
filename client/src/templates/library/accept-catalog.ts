import type { OriginalTemplate } from './originals'

const ASSET_URL = /^\/original-templates\/[^?#]+$/

function isUsable(entry: unknown): entry is OriginalTemplate {
  if (!entry || typeof entry !== 'object') return false
  const t = entry as Partial<OriginalTemplate>
  return (
    typeof t.id === 'string' && typeof t.name === 'string' &&
    typeof t.url === 'string' && ASSET_URL.test(t.url) &&
    typeof t.thumbnail === 'string' && ASSET_URL.test(t.thumbnail) &&
    Array.isArray(t.collections) && Array.isArray(t.sources) &&
    Array.isArray(t.pages) && t.pages.length > 0 &&
    t.pages.every((page) => typeof page?.name === 'string' && typeof page?.url === 'string' && ASSET_URL.test(page.url))
  )
}

/** The API's list if it is complete and well-formed, otherwise null. */
export function acceptCatalog(body: unknown): OriginalTemplate[] | null {
  if (!Array.isArray(body) || body.length === 0) return null
  return body.every(isUsable) ? (body as OriginalTemplate[]) : null
}
