import { useEffect, useState } from 'react'
import { API_URL } from '@/lib/api'
import { originalTemplates, type OriginalTemplate } from './originals'
import { acceptCatalog } from './accept-catalog'

/**
 * The gallery's template list, as the API serves it from MongoDB.
 *
 * The catalog bundled into the app is always what the gallery starts with, so
 * the page is never empty and never waits on the network. If the API answers
 * with a well-formed list, that replaces it; if the API is down, is still
 * empty (nothing imported yet) or answers with anything odd, the bundled list
 * stays. A bad response can therefore change which templates are listed, but
 * never leave the gallery broken.
 */

let cached: OriginalTemplate[] | null = null

export function useOriginalTemplates(): OriginalTemplate[] {
  const [templates, setTemplates] = useState<OriginalTemplate[]>(cached ?? originalTemplates)
  useEffect(() => {
    if (cached) return
    const controller = new AbortController()
    fetch(`${API_URL}/api/templates`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const accepted = acceptCatalog(body)
        if (accepted) { cached = accepted; setTemplates(accepted) }
      })
      .catch(() => { /* Offline or not deployed yet: the bundled catalog stays. */ })
    return () => controller.abort()
  }, [])
  return templates
}
