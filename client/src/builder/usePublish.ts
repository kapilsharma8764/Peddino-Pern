import { useState } from 'react'
import { toast } from 'sonner'
import { exportSite } from './core'
import { api, API_URL, ApiError, leadsEndpoint } from '@/lib/api'
import { useConfigStore } from '@/store/configStore'
import { useBusinessStore } from '@/store/businessStore'
import { usePublishStore } from '@/store/publishStore'

/**
 * Putting the site online.
 *
 * The HTML is rendered here, in the browser, by the same code that draws the
 * editor canvas — so what gets published is what the user was looking at. The
 * server only stores the finished file and hands back an address.
 */
export function usePublish() {
  const [busy, setBusy] = useState(false)
  const config = useConfigStore((s) => s.config)
  const profile = useBusinessStore((s) => s.profile)
  const { siteId, setSite, setPublished, url, slug, publishedAt } = usePublishStore()

  async function publish() {
    setBusy(true)
    try {
      const name = profile.name.trim() || config.name || 'My Website'

      // First publish creates the site record; later ones update it, which is
      // what keeps the public address stable across republishes.
      let id = siteId
      if (id) {
        await api.saveSite(id, { name, config, profile })
      } else {
        const created = await api.createSite({ name, config, profile })
        id = created.id
        setSite(id)
      }

      // Every page, not just the one that happens to be open. The menu is
      // resolved against the site's public address so the links work.
      const slug = usePublishStore.getState().slug ?? ''
      // Published pages are served by the API, which also serves the template
      // files out of MongoDB — so an original template points at them there
      // rather than carrying every stylesheet, font and picture inside each page.
      const pages = await exportSite(config, {
        assetOrigin: API_URL,
        leadsEndpoint,
        siteId: id,
        base: slug ? `/site/${slug}` : '',
      })
      const result = await api.publish(id, pages)
      setPublished(result)

      toast.success('Your site is live')
      return result
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not publish. Please try again.'
      toast.error(message)
      return null
    } finally {
      setBusy(false)
    }
  }

  return { publish, busy, url, slug, publishedAt }
}
