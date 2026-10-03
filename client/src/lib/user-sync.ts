import { useEffect } from 'react'
import { api, type ServerBrief, type ServerBriefInput, type ServerOnboarding, type ServerOnboardingInput } from './api'
import { adoptBrief, loadBrief, onBriefSaved, type BusinessDirection, type SavedBrief } from '@/landing/business-brief'
import { emptyProfile, type BusinessProfile } from '@/onboarding/profile'
import { useOnboardingStore } from '@/start/onboardingStore'
import { readMeta, writeMeta } from './local-user-data'
import { useAuthStore } from '@/store/authStore'
import { useBusinessStore } from '@/store/businessStore'

/**
 * Keeps the signed-in person's brief, setup progress and business answers in
 * PostgreSQL, so they follow the account to another browser or device.
 *
 * For a signed-in person the database is the source of truth. The browser keeps
 * its own copy as a draft cache and as the only copy a guest has. After
 * sign-in:
 *   - nothing on the server yet, something in the browser -> the browser's copy is uploaded
 *     (this is how existing localStorage data moves over);
 *   - something on the server -> it is loaded, unless an edit made in this browser is newer.
 * Edits then upload a moment after the last keystroke, and straight away when the tab hides.
 * A failed upload is dropped quietly; the browser copy is still there and the next edit tries again.
 *
 * What is never uploaded: a personal Gemini key (it stays in the browser, see `ai-client.ts`)
 * and large values such as logo images.
 */

const DEBOUNCE_MS = 1500
const STEPS = ['type', 'details', 'design', 'pages', 'site']
const LARGE_VALUE = 4000

const time = (value?: string) => (value ? Date.parse(value) || 0 : 0)

// ── brief ─────────────────────────────────────────────────────────────────

export const briefToServer = (brief: SavedBrief): ServerBriefInput => ({
  description: brief.description,
  selectedPreset: brief.selectedPreset,
  businessType: brief.businessType ?? null,
  recommendedPages: brief.recommendedPages ?? [],
  recommendedFeatures: brief.recommendedFeatures ?? [],
  suggestedTemplateCategory: brief.suggestedTemplateCategory ?? null,
  themeDirection: brief.themeDirection ?? null,
  direction: (brief.direction as unknown as Record<string, unknown> | undefined) ?? null,
})

export const briefFromServer = (brief: ServerBrief): SavedBrief => ({
  description: brief.description,
  selectedPreset: brief.selectedPreset ?? null,
  ...(brief.businessType ? { businessType: brief.businessType } : {}),
  recommendedPages: brief.recommendedPages ?? [],
  recommendedFeatures: brief.recommendedFeatures ?? [],
  ...(brief.suggestedTemplateCategory ? { suggestedTemplateCategory: brief.suggestedTemplateCategory } : {}),
  ...(brief.themeDirection ? { themeDirection: { style: brief.themeDirection.style ?? '', primaryColor: brief.themeDirection.primaryColor ?? '', accentColor: brief.themeDirection.accentColor ?? '' } } : {}),
  ...(brief.direction ? { direction: brief.direction as unknown as BusinessDirection } : {}),
})

const hasBrief = (brief: SavedBrief | null): brief is SavedBrief => Boolean(brief && (brief.description.trim() || brief.direction))

// ── setup progress and business answers ───────────────────────────────────

/** The profile without large values (logo images), which are not worth uploading and would bloat the row. */
function slimProfile(profile: BusinessProfile): Record<string, unknown> {
  return Object.fromEntries(Object.entries(profile).filter(([, value]) => !(typeof value === 'string' && value.length > LARGE_VALUE)))
}

export function progressFromStores(): ServerOnboardingInput {
  const { mode, typeId, designId, pages } = useOnboardingStore.getState()
  const { profile, completed } = useBusinessStore.getState()
  const done = [
    [Boolean(typeId), 'type'],
    [Boolean(profile.name.trim() && profile.about.trim()), 'details'],
    [Boolean(designId), 'design'],
    [pages.length > 0, 'pages'],
    [completed, 'site'],
  ].flatMap(([reached, step]) => (reached ? [step as string] : []))
  return {
    currentStep: STEPS.find((step) => !done.includes(step)) ?? 'done',
    completedSteps: done,
    onboardingData: { onboarding: { mode, typeId, designId, pages }, profile: slimProfile(profile), completed },
  }
}

export const hasProgress = (progress: ServerOnboardingInput): boolean => progress.completedSteps.length > 0

const isText = (value: unknown): value is string => typeof value === 'string'

/** Puts the server's setup progress into the stores. Empty values never wipe what is already here. */
export function applyProgress(server: ServerOnboarding): void {
  const data = server.onboardingData as { onboarding?: Record<string, unknown>; profile?: Record<string, unknown>; completed?: unknown }
  const saved = data.onboarding
  if (saved && typeof saved === 'object') {
    useOnboardingStore.setState({
      mode: saved.mode === 'builder' ? 'builder' : 'template',
      typeId: isText(saved.typeId) ? saved.typeId : null,
      designId: isText(saved.designId) ? saved.designId : null,
      pages: Array.isArray(saved.pages) ? saved.pages.filter(isText) : [],
    })
  }
  if (data.profile && typeof data.profile === 'object') {
    const incoming = data.profile
    const known = Object.keys(emptyProfile)
    useBusinessStore.setState((state) => {
      const next: Record<string, unknown> = { ...state.profile }
      for (const key of known) {
        const value = incoming[key]
        if (value === undefined || value === null || value === '' || key === 'contact') continue
        next[key] = value
      }
      const contact = incoming.contact && typeof incoming.contact === 'object'
        ? Object.fromEntries(Object.entries(incoming.contact).filter(([, value]) => value !== '' && value !== null && value !== undefined))
        : {}
      return { profile: { ...next, contact: { ...state.profile.contact, ...contact } } as BusinessProfile, completed: state.completed || data.completed === true }
    })
  }
}

// ── the sync itself ───────────────────────────────────────────────────────

/** Starts syncing for the signed-in person. Returns a function that stops it. */
export function startUserSync(): () => void {
  let stopped = false
  let applying = false
  let hydrated = false
  let briefTimer: ReturnType<typeof setTimeout> | undefined
  let onboardingTimer: ReturnType<typeof setTimeout> | undefined
  let pendingBrief: SavedBrief | null = null
  let onboardingDirty = false

  const pushBrief = async (keepalive = false) => {
    clearTimeout(briefTimer)
    const brief = pendingBrief
    pendingBrief = null
    if (!hasBrief(brief)) return
    try { writeMeta({ briefAt: (await api.saveBusinessBrief(briefToServer(brief), { keepalive })).brief.updatedAt }) } catch { /* offline: the browser copy remains */ }
  }
  const pushOnboarding = async (keepalive = false) => {
    clearTimeout(onboardingTimer)
    onboardingDirty = false
    const progress = progressFromStores()
    if (!hasProgress(progress)) return
    try { writeMeta({ onboardingAt: (await api.saveOnboarding(progress, { keepalive })).onboarding.updatedAt }) } catch { /* offline: the browser copy remains */ }
  }

  const stopBrief = onBriefSaved((brief) => {
    if (applying || stopped) return
    writeMeta({ briefAt: new Date().toISOString() })
    pendingBrief = brief
    if (hydrated) { clearTimeout(briefTimer); briefTimer = setTimeout(() => void pushBrief(), DEBOUNCE_MS) }
  })
  const touchOnboarding = () => {
    if (applying || stopped) return
    writeMeta({ onboardingAt: new Date().toISOString() })
    onboardingDirty = true
    if (hydrated) { clearTimeout(onboardingTimer); onboardingTimer = setTimeout(() => void pushOnboarding(), DEBOUNCE_MS) }
  }
  const stopBusiness = useBusinessStore.subscribe(touchOnboarding)
  const stopOnboarding = useOnboardingStore.subscribe(touchOnboarding)

  const flush = () => {
    if (document.visibilityState !== 'hidden' || !hydrated) return
    if (pendingBrief) void pushBrief(true)
    if (onboardingDirty) void pushOnboarding(true)
  }
  document.addEventListener('visibilitychange', flush)

  void (async () => {
    try {
      const [{ brief }, { onboarding }] = await Promise.all([api.getBusinessBrief(), api.getOnboarding()])
      if (stopped) return

      const meta = readMeta()
      const localBrief = loadBrief()
      const localBriefNewer = hasBrief(localBrief) && time(meta.briefAt) > time(brief?.updatedAt)
      if (brief && !localBriefNewer) {
        applying = true
        try { adoptBrief(briefFromServer(brief)) } finally { applying = false }
        writeMeta({ briefAt: brief.updatedAt })
      } else if (hasBrief(localBrief)) {
        // Nothing saved for this account yet (or this browser's edit is newer): this is the move from localStorage to PostgreSQL.
        pendingBrief = localBrief
        await pushBrief()
      }

      const localProgress = progressFromStores()
      const localProgressNewer = hasProgress(localProgress) && time(meta.onboardingAt) > time(onboarding?.updatedAt)
      if (onboarding && !localProgressNewer) {
        applying = true
        try { applyProgress(onboarding) } finally { applying = false }
        writeMeta({ onboardingAt: onboarding.updatedAt })
      } else if (hasProgress(localProgress)) {
        await pushOnboarding()
      }
    } catch { /* The server is unreachable: this browser's copy keeps working, and the next sign-in tries again. */ } finally {
      hydrated = true
    }
  })()

  return () => {
    stopped = true
    clearTimeout(briefTimer)
    clearTimeout(onboardingTimer)
    stopBrief()
    stopBusiness()
    stopOnboarding()
    document.removeEventListener('visibilitychange', flush)
  }
}

/** Runs the sync while someone is signed in. Mounted once, near the top of the app. */
export function useUserSync(): void {
  const token = useAuthStore((state) => state.token)
  useEffect(() => (token ? startUserSync() : undefined), [token])
}
