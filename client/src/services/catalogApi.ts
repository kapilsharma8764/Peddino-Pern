import { toPreset, type BusinessPreset, type BusinessPresetRow } from '@/landing/business-brief'
import { toStarterDesign, type StarterDesign, type StarterDesignRow } from '@/start/starter-designs'
import { toWebsiteType, type WebsiteTypeDef, type WebsiteTypeRow } from '@/start/website-types'
import { getJson, isObject, isStringList, itemsOf } from './http'

/**
 * Website types, starter designs and business presets from the API. Each answer
 * is checked before it is used: a malformed one is treated as "no answer", so a
 * bad response can change what is listed but never break the screen.
 */

const hasSlugAndName = (item: unknown): item is Record<string, unknown> & { slug: string; name: string } =>
  isObject(item) && typeof item.slug === 'string' && typeof item.name === 'string'

const isWebsiteTypeRow = (item: unknown): item is WebsiteTypeRow =>
  hasSlugAndName(item) && typeof item.category === 'string' && typeof item.icon === 'string' && isStringList(item.keywords) && isStringList(item.pages) && isStringList(item.designs)

const isStarterDesignRow = (item: unknown): item is StarterDesignRow =>
  hasSlugAndName(item) && isObject(item.config) && typeof item.config.header === 'string' && typeof item.config.hero === 'string' && Array.isArray(item.config.sections)

const isPresetRow = (item: unknown): item is BusinessPresetRow =>
  hasSlugAndName(item) && isObject(item.preview) && isObject(item.themeDirection) && isStringList(item.keywords) && isStringList(item.recommendedPages) && typeof item.examplePrompt === 'string'

export async function fetchWebsiteTypes(signal?: AbortSignal): Promise<WebsiteTypeDef[] | null> {
  return itemsOf(await getJson('/api/website-types', { signal }), isWebsiteTypeRow)?.map(toWebsiteType) ?? null
}

/** All starter designs, or only those a website type lists, in that type's order. */
export async function fetchStarterDesigns(type?: string, signal?: AbortSignal): Promise<StarterDesign[] | null> {
  const path = type ? `/api/starter-designs?type=${encodeURIComponent(type)}` : '/api/starter-designs'
  return itemsOf(await getJson(path, { signal }), isStarterDesignRow)?.map(toStarterDesign) ?? null
}

export async function fetchBusinessPresets(signal?: AbortSignal): Promise<BusinessPreset[] | null> {
  return itemsOf(await getJson('/api/business-presets', { signal }), isPresetRow)?.map(toPreset) ?? null
}
