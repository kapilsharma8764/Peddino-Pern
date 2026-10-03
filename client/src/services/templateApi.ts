import { useEffect, useState } from 'react'
import { emergencyTemplate } from '@/templates/library/emergency'
import type { RealTemplate, SectionSpec } from '@/templates/library/types'
import type { ThemeConfig } from '@/blocks/types'
import { getJson, isObject } from './http'

/**
 * The widget-based layout templates, from `/api/layout-templates`.
 *
 * The gallery reads the light list (with a small preview of each design's first
 * sections); a template's full section tree is fetched only when it is opened in
 * a preview or used. Lists are remembered for the session.
 */

export interface LayoutTemplateSummary {
  slug: string
  name: string
  category: string
  description: string
  thumbnail: string | null
  previewImage: string | null
  tags: string[]
  source: string
  pageCount: number
  /** 'partial' when the design has an empty or missing picture. It still renders. */
  imageStatus: 'ok' | 'partial'
  preview: { theme: Partial<ThemeConfig>; header: SectionSpec[]; home: SectionSpec[] }
}

export interface LayoutOutlineEntry {
  slug: string
  name: string
  homeSections: number
  pages: { name: string; path: string }[]
}

const isSummary = (item: unknown): item is LayoutTemplateSummary =>
  isObject(item) && typeof item.slug === 'string' && typeof item.name === 'string' && typeof item.category === 'string' && isObject(item.preview) && Array.isArray(item.preview.home)

/** Every layout template's light row. Pages through the API, 200 at a time, so a growing library still arrives whole. */
export async function fetchLayoutTemplateList(signal?: AbortSignal): Promise<LayoutTemplateSummary[]> {
  const all: LayoutTemplateSummary[] = []
  for (let page = 1; page <= 20; page += 1) {
    const body = await getJson<{ items?: unknown; totalPages?: number }>(`/api/layout-templates?limit=200&page=${page}`, { signal })
    if (!Array.isArray(body.items) || !body.items.every(isSummary)) throw new Error('Unexpected template list')
    all.push(...body.items)
    if (page >= (body.totalPages ?? 1)) break
  }
  // An empty library means nothing was imported yet: report it, rather than showing a gallery without layouts.
  if (all.length === 0) throw new Error('No layout templates in the database')
  return all
}

function toTemplate(body: unknown): RealTemplate {
  const template = isObject(body) ? body.template : null
  if (!isObject(template) || typeof template.id !== 'string' || !Array.isArray(template.home) || !Array.isArray(template.pages)) throw new Error('Unexpected template')
  return template as unknown as RealTemplate
}

/** One template in full. */
export async function fetchLayoutTemplate(slug: string, signal?: AbortSignal): Promise<RealTemplate> {
  return toTemplate(await getJson(`/api/layout-templates/${encodeURIComponent(slug)}`, { signal }))
}

/** The starting design for a category (any category when null), or the built-in starter when the API cannot answer. */
export async function loadStartingTemplate(category: string | null): Promise<RealTemplate> {
  try {
    const query = category && /^[a-z0-9_-]+$/i.test(category) ? `?category=${encodeURIComponent(category)}` : ''
    return toTemplate(await getJson(`/api/layout-templates/default${query}`, { timeoutMs: 6000 }))
  } catch {
    return emergencyTemplate
  }
}

export async function fetchLayoutOutline(signal?: AbortSignal): Promise<LayoutOutlineEntry[]> {
  const body = await getJson<{ items?: unknown }>('/api/layout-templates/outline', { signal })
  if (!Array.isArray(body.items)) throw new Error('Unexpected outline')
  return body.items.filter((item): item is LayoutOutlineEntry => isObject(item) && typeof item.slug === 'string' && Array.isArray(item.pages))
}

// ── hooks ──────────────────────────────────────────────────────────────────

export type LoadStatus = 'loading' | 'ready' | 'error'

/** Loads once per session and shares the answer, so every screen asks the API at most once. */
function sessionResource<T>(load: () => Promise<T>) {
  let value: T | null = null
  let pending: Promise<T> | null = null
  return {
    peek: () => value,
    load: () => (pending ??= load().then((result) => { value = result; return result }, (error) => { pending = null; throw error })),
  }
}

function useResource<T>(resource: ReturnType<typeof sessionResource<T>>): { data: T | null; status: LoadStatus } {
  const [state, setState] = useState<{ data: T | null; status: LoadStatus }>(() => {
    const known = resource.peek()
    return { data: known, status: known ? 'ready' : 'loading' }
  })
  useEffect(() => {
    if (resource.peek()) return
    let live = true
    resource.load().then((data) => { if (live) setState({ data, status: 'ready' }) }, () => { if (live) setState({ data: null, status: 'error' }) })
    return () => { live = false }
  }, [resource])
  return state
}

const listResource = sessionResource(() => fetchLayoutTemplateList())
const outlineResource = sessionResource(() => fetchLayoutOutline())

/** The gallery's layout templates: `status` is 'loading', 'ready', or 'error' (then `data` is null). */
export const useLayoutTemplates = () => useResource(listResource)
/** Names and page names of every layout template, for the editor's "Page layout" panel. */
export const useLayoutOutline = () => useResource(outlineResource)
