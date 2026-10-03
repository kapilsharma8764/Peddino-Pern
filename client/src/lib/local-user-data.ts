import { BRIEF_KEY } from '@/landing/business-brief'
import { useOnboardingStore } from '@/start/onboardingStore'

/**
 * The bookkeeping for the browser copy of a person's brief and setup progress:
 * when each was last edited here (so the sync knows whether this browser or the
 * server is newer), and how to forget it all when someone signs out.
 */

const META_KEY = 'peddino_sync_meta'

export interface SyncMeta { briefAt?: string; onboardingAt?: string }

export const readMeta = (): SyncMeta => { try { return JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as SyncMeta } catch { return {} } }
export const writeMeta = (patch: SyncMeta) => { try { localStorage.setItem(META_KEY, JSON.stringify({ ...readMeta(), ...patch })) } catch { /* private mode */ } }

/** Forgets this browser's copy, so the next person to sign in here never sees it. */
export function clearLocalUserData(): void {
  // The reset first: the sync is still listening and would note it as an edit, so the notes are removed after it.
  useOnboardingStore.getState().reset()
  try { localStorage.removeItem(BRIEF_KEY); localStorage.removeItem(META_KEY) } catch { /* private mode */ }
}
