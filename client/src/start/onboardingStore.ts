import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type StartMode = 'template' | 'builder'

/**
 * Where someone is in the setup before the editor opens.
 *
 * The business answers themselves live in `useBusinessStore` (the same profile the
 * template gallery and the editor already read), so there is one copy of them. This
 * store holds only what the setup adds: which path was chosen, which website type,
 * which starting design and which pages. Persisted, so a refresh keeps the setup.
 */
interface OnboardingState {
  mode: StartMode
  typeId: string | null
  designId: string | null
  /** Pages ticked in "Create a site", beyond Home, in the order they were added. */
  pages: string[]
  begin: (mode: StartMode) => void
  setType: (id: string) => void
  setDesign: (id: string | null) => void
  setPages: (pages: string[]) => void
  reset: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      mode: 'template',
      typeId: null,
      designId: null,
      pages: [],
      // Choosing a path again starts from its first question, keeping nothing of the other path.
      begin: (mode) => set({ mode, designId: null }),
      setType: (typeId) => set({ typeId }),
      setDesign: (designId) => set({ designId }),
      setPages: (pages) => set({ pages }),
      reset: () => set({ mode: 'template', typeId: null, designId: null, pages: [] }),
    }),
    { name: 'sitebuilder-onboarding' },
  ),
)
