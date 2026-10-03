import { create } from 'zustand'
import { api, ApiError, type Lead } from '@/lib/api'

interface LeadsState {
  leads: Lead[] | null
  error: string
  refreshing: boolean
  load: () => Promise<void>
  refresh: () => Promise<void>
  setStatus: (id: string, status: Lead['status']) => Promise<void>
  remove: (id: string) => Promise<void>
}

/**
 * The enquiry inbox's data.
 *
 * Kept in a store rather than in the page's own state so the component stays a
 * view: it renders what is here and calls these actions. Status changes and
 * deletions are applied locally first and reconciled with the server after,
 * because an inbox that lags behind every click feels broken.
 */
export const useLeadsStore = create<LeadsState>()((set, get) => ({
  leads: null,
  error: '',
  refreshing: false,

  load: async () => {
    try {
      const leads = await api.listLeads()
      set({ leads, error: '' })
    } catch (caught) {
      set({
        leads: [],
        error: caught instanceof ApiError ? caught.message : 'Could not load enquiries',
      })
    }
  },

  refresh: async () => {
    set({ refreshing: true })
    await get().load()
    set({ refreshing: false })
  },

  setStatus: async (id, status) => {
    const previous = get().leads
    set({ leads: previous?.map((lead) => (lead.id === id ? { ...lead, status } : lead)) ?? null })
    try {
      await api.updateLead(id, { status })
    } catch {
      set({ leads: previous })
      throw new Error('Could not save that change')
    }
  },

  remove: async (id) => {
    const previous = get().leads
    set({ leads: previous?.filter((lead) => lead.id !== id) ?? null })
    try {
      await api.deleteLead(id)
    } catch {
      set({ leads: previous })
      throw new Error('Could not delete that enquiry')
    }
  },
}))
