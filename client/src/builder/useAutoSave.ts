import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useConfigStore } from '@/store/configStore'
import { useBusinessStore } from '@/store/businessStore'
import { usePublishStore } from '@/store/publishStore'

export type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

/**
 * Keeps the server's copy of the site in step with the editor.
 *
 * Work is already kept in the browser, but that is only ever one cleared cache
 * away from gone, and it is not what the dashboard or publishing read. Saving
 * on a delay after the last change means a burst of typing costs one request
 * rather than one per keystroke.
 *
 * A failed save is reported quietly as "offline" rather than as an error: the
 * usual cause is that the API is not running, the editor still works without
 * it, and interrupting someone mid-edit to say so would be worse.
 */
export function useAutoSave(delay = 1500): SaveState {
  const config = useConfigStore((s) => s.config)
  const profile = useBusinessStore((s) => s.profile)
  const siteId = usePublishStore((s) => s.siteId)

  const [state, setState] = useState<SaveState>('idle')

  // What was last written, so an unchanged config does not cause a request —
  // the editor re-renders for reasons that have nothing to do with content.
  const lastSaved = useRef<string | null>(null)
  // The change still waiting out the delay, so leaving the page can send it instead of losing it.
  const pending = useRef<{ siteId: string; snapshot: string; body: { name: string; config: unknown; profile: unknown } } | null>(null)

  useEffect(() => {
    if (!siteId) return

    const snapshot = JSON.stringify(config)
    if (snapshot === lastSaved.current) return

    const body = { name: profile.name.trim() || config.name, config, profile }
    pending.current = { siteId, snapshot, body }

    const timer = setTimeout(async () => {
      setState('saving')
      try {
        await api.saveSite(siteId, body)
        lastSaved.current = snapshot
        if (pending.current?.snapshot === snapshot) pending.current = null
        setState('saved')
      } catch {
        setState('offline')
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [config, profile, siteId, delay])

  // A reload or a closed tab inside the delay would otherwise throw the last edits away: the editor
  // reloads the saved copy from the server on the way back in.
  useEffect(() => {
    function flush() {
      const waiting = pending.current
      if (!waiting || waiting.snapshot === lastSaved.current) return
      pending.current = null
      void api.saveSite(waiting.siteId, waiting.body, { keepalive: true }).catch(() => undefined)
    }
    function onHide() { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  return state
}
