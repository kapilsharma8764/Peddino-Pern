import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PublishState {
  /** The server-side site this browser is editing, once it has been saved. */
  siteId: string | null
  slug: string | null
  url: string | null
  publishedAt: string | null
  setSite: (siteId: string) => void
  setPublished: (result: { slug: string; url: string; publishedAt: string }) => void
  clear: () => void
}

/**
 * Which saved site the editor is attached to.
 *
 * Held separately from the site's content so that publishing twice updates the
 * same record — and therefore the same public address — rather than creating a
 * second site each time.
 */
export const usePublishStore = create<PublishState>()(
  persist(
    (set) => ({
      siteId: null,
      slug: null,
      url: null,
      publishedAt: null,
      setSite: (siteId) => set({ siteId }),
      setPublished: ({ slug, url, publishedAt }) => set({ slug, url, publishedAt }),
      clear: () => set({ siteId: null, slug: null, url: null, publishedAt: null }),
    }),
    { name: 'sitebuilder-publish' },
  ),
)
