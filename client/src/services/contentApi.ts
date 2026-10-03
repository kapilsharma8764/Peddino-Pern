import { useEffect, useState } from 'react'
import seed from '@/data/seed/site_content.json'
import { getJson, isObject } from './http'

/**
 * Marketing copy (Features, How it works, About, Help, Pricing, the home FAQ) from
 * `/api/content/:page`.
 *
 * Each page has a bundled copy of its content (the seed file that also fills the
 * database), so a page shows its words at once and never goes blank: the API's
 * version replaces the bundled one when it arrives, and if the API cannot answer
 * the bundled one simply stays. Privacy and Terms are legal text and stay in code.
 */

export interface ContentSection {
  pageKey: string
  sectionKey: string
  title: string
  subtitle: string
  /** Free-form per section: eyebrow, accent, items, columns, … */
  content: Record<string, unknown>
  sortOrder: number
}
export type PageContent = Record<string, ContentSection>

const isSection = (item: unknown): item is ContentSection =>
  isObject(item) && typeof item.sectionKey === 'string' && typeof item.title === 'string' && typeof item.subtitle === 'string' && isObject(item.content)

const byKey = (sections: ContentSection[]): PageContent => Object.fromEntries(sections.map((section) => [section.sectionKey, section]))

/** The bundled copy of one page's content. */
export const fallbackContent = (pageKey: string): PageContent =>
  byKey((seed as unknown as ContentSection[]).filter((section) => section.pageKey === pageKey).sort((a, b) => a.sortOrder - b.sortOrder))

export async function fetchPageContent(pageKey: string, signal?: AbortSignal): Promise<PageContent> {
  const body = await getJson<{ sections?: unknown }>(`/api/content/${encodeURIComponent(pageKey)}`, { signal })
  if (!Array.isArray(body.sections) || body.sections.length === 0 || !body.sections.every(isSection)) throw new Error('Unexpected content')
  return byKey(body.sections)
}

const known = new Map<string, PageContent>()

/** 'loading' while the API is asked, 'ready' once its answer is in, 'fallback' when it could not answer and the bundled copy stays. */
export type ContentStatus = 'loading' | 'ready' | 'fallback'

export function usePageContent(pageKey: string): { sections: PageContent; status: ContentStatus } {
  const [state, setState] = useState<{ sections: PageContent; status: ContentStatus }>(() => {
    const cached = known.get(pageKey)
    return cached ? { sections: cached, status: 'ready' } : { sections: fallbackContent(pageKey), status: 'loading' }
  })
  useEffect(() => {
    if (known.has(pageKey)) return
    const controller = new AbortController()
    fetchPageContent(pageKey, controller.signal).then(
      (sections) => { known.set(pageKey, sections); setState({ sections, status: 'ready' }) },
      () => { if (!controller.signal.aborted) setState((current) => ({ ...current, status: 'fallback' })) },
    )
    return () => controller.abort()
  }, [pageKey])
  return state
}

// ── reading a section's free-form content ──────────────────────────────────

export const textOf = (value: unknown): string => (typeof value === 'string' ? value : '')
export const listOf = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])
export const columnsOf = (value: unknown, fallback: 2 | 3 | 4): 2 | 3 | 4 => (value === 2 || value === 3 || value === 4 ? value : fallback)
