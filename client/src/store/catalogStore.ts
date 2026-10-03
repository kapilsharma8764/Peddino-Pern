import { useMemo } from 'react'
import { create } from 'zustand'
import { fallbackPresets, type BusinessPreset } from '@/landing/business-brief'
import { fetchBusinessPresets, fetchStarterDesigns, fetchWebsiteTypes } from '@/services/catalogApi'
import { starterDesigns as fallbackDesigns, type StarterDesign } from '@/start/starter-designs'
import { websiteTypes as fallbackTypes, type WebsiteTypeDef } from '@/start/website-types'

/**
 * Website types, starter designs and business presets, as the screens read them.
 *
 * PostgreSQL is the source of truth: `load()` asks the API once and keeps what it
 * says. Until it answers — or if it never does — each list is the copy bundled
 * from the seed files, so a screen is never empty and never waits. The three
 * lists load independently; one failing leaves the other two live.
 */

type Status = 'idle' | 'loading' | 'ready' | 'offline'

interface CatalogState {
  websiteTypes: WebsiteTypeDef[]
  starterDesigns: StarterDesign[]
  presets: BusinessPreset[]
  /** 'ready' once every list came from the API; 'offline' when at least one is still the bundled copy. */
  status: Status
  load: () => Promise<void>
}

let pending: Promise<void> | null = null

export const useCatalog = create<CatalogState>((set) => ({
  websiteTypes: fallbackTypes,
  starterDesigns: fallbackDesigns,
  presets: fallbackPresets,
  status: 'idle',
  load: () => {
    if (pending) return pending
    set({ status: 'loading' })
    pending = Promise.all([
      fetchWebsiteTypes().then((websiteTypes) => { if (websiteTypes) set({ websiteTypes }); return Boolean(websiteTypes) }, () => false),
      fetchStarterDesigns().then((starterDesigns) => { if (starterDesigns) set({ starterDesigns }); return Boolean(starterDesigns) }, () => false),
      fetchBusinessPresets().then((presets) => { if (presets) set({ presets }); return Boolean(presets) }, () => false),
    ]).then((results) => {
      set({ status: results.every(Boolean) ? 'ready' : 'offline' })
      // An offline start may try again next time something asks.
      if (!results.every(Boolean)) pending = null
    })
    return pending
  },
}))

export const loadCatalog = () => useCatalog.getState().load()

/** The website types as a lookup by id (slug). */
export function useWebsiteTypeMap(): Map<string, WebsiteTypeDef> {
  const list = useCatalog((s) => s.websiteTypes)
  return useMemo(() => new Map(list.map((type) => [type.id, type])), [list])
}

/** Non-React lookups, reading whatever the store holds right now. */
export const websiteTypeById = (id: string) => useCatalog.getState().websiteTypes.find((type) => type.id === id)
export const starterDesignById = (id: string) => useCatalog.getState().starterDesigns.find((design) => design.id === id)
