import { create } from 'zustand'
import { api, ApiError, type SiteSummary } from '@/lib/api'

interface SitesState {
  sites: SiteSummary[] | null
  error: string
  busy: boolean
  /** Sites on this machine saved before accounts existed. */
  unowned: number
  claim: () => Promise<number>
  load: () => Promise<void>
  refresh: () => Promise<void>
  remove: (id: string) => Promise<void>
  setBusy: (busy: boolean) => void
}

/**
 * The list of saved sites.
 *
 * In a store rather than in the page, matching how the enquiry inbox works:
 * components render and call actions, and nothing sets state from inside an
 * effect.
 */
export const useSitesStore = create<SitesState>()((set, get) => ({
  sites: null,
  error: '',
  busy: false,

  unowned: 0,

  claim: async () => {
    const { claimed } = await api.claimSites()
    set({ unowned: 0 })
    await get().load()
    return claimed
  },

  load: async () => {
    try {
      const sites = await api.listSites()
      set({ sites, error: '' })
      // Reported separately so a failure here cannot stop the list loading.
      try {
        const { count } = await api.unownedSites()
        set({ unowned: count })
      } catch {
        set({ unowned: 0 })
      }
    } catch (caught) {
      set({
        sites: [],
        error: caught instanceof ApiError ? caught.message : 'Could not load your sites',
      })
    }
  },

  refresh: async () => {
    set({ busy: true })
    await get().load()
    set({ busy: false })
  },

  remove: async (id) => {
    const previous = get().sites
    set({ sites: previous?.filter((site) => site.id !== id) ?? null })
    try {
      await api.deleteSite(id)
    } catch {
      set({ sites: previous })
      throw new Error('Could not delete that site')
    }
  },

  setBusy: (busy) => set({ busy }),
}))
