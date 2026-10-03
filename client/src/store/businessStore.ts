import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BusinessProfile, ContactDetails } from '@/onboarding/profile'
import { emptyProfile } from '@/onboarding/profile'

interface BusinessState {
  profile: BusinessProfile
  /** Set once the wizard is finished, so the flow is not shown again. */
  completed: boolean
  update: (patch: Partial<BusinessProfile>) => void
  updateContact: (patch: Partial<ContactDetails>) => void
  complete: () => void
  reset: () => void
}

/**
 * The answers from the Create Website flow.
 *
 * Persisted, because someone who closes the tab halfway through a seven-field
 * form should not have to type it again. `reset` clears it when they
 * deliberately start another site.
 */
export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      profile: emptyProfile,
      completed: false,
      update: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),
      updateContact: (patch) =>
        set((state) => ({
          profile: { ...state.profile, contact: { ...state.profile.contact, ...patch } },
        })),
      complete: () => set({ completed: true }),
      reset: () => set({ profile: emptyProfile, completed: false }),
    }),
    {
      name: 'sitebuilder-business',
      // A browser that saved a profile before a field (e.g. `pages`) existed
      // would otherwise rehydrate without it, crashing anything that reads
      // it — merge onto the current defaults instead of replacing them.
      merge: (persisted, current) => {
        const saved = persisted as Partial<BusinessState> | undefined
        return {
          ...current,
          ...saved,
          profile: { ...current.profile, ...saved?.profile },
        }
      },
    },
  ),
)
