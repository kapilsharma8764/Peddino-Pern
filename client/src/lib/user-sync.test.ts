// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { applyProgress, briefFromServer, briefToServer, hasProgress, progressFromStores } from './user-sync'
import { clearLocalUserData, readMeta, writeMeta } from './local-user-data'
import { BRIEF_KEY, type SavedBrief } from '@/landing/business-brief'
import { emptyProfile } from '@/onboarding/profile'
import { useOnboardingStore } from '@/start/onboardingStore'
import { useBusinessStore } from '@/store/businessStore'

beforeEach(() => {
  localStorage.clear()
  useOnboardingStore.getState().reset()
  useBusinessStore.getState().reset()
})

describe('brief <-> server', () => {
  const brief: SavedBrief = {
    description: 'A school', selectedPreset: 'school', businessType: 'School', recommendedPages: ['Home'], recommendedFeatures: ['Admission Form'],
    suggestedTemplateCategory: 'Education', themeDirection: { style: 'Friendly', primaryColor: '#1d4ed8', accentColor: '#f59e0b' },
    direction: { presetId: 'school', businessType: 'School', businessName: 'Bright', suggestedPages: ['Home'], suggestedSections: [], recommendedFeatures: [], suggestedTemplateCategory: 'Education', themeDirection: { style: 'Friendly', primaryColor: '#1d4ed8', accentColor: '#f59e0b' } },
  }

  it('survives a round trip through the server shape', () => {
    const sent = briefToServer(brief)
    const back = briefFromServer({ ...sent, createdAt: 'x', updatedAt: 'y' } as never)
    expect(back).toEqual(brief)
  })

  it('leaves out what the server has as null', () => {
    const back = briefFromServer({ description: 'x', selectedPreset: null, businessType: null, suggestedTemplateCategory: null, themeDirection: null, direction: null, createdAt: '', updatedAt: '' })
    expect(back).toEqual({ description: 'x', selectedPreset: null, recommendedPages: [], recommendedFeatures: [] })
  })
})

describe('setup progress', () => {
  it('is empty before anything is answered', () => {
    const progress = progressFromStores()
    expect(hasProgress(progress)).toBe(false)
    expect(progress.currentStep).toBe('type')
  })

  it('names the steps done and the one that is next', () => {
    useOnboardingStore.getState().setType('school')
    useBusinessStore.getState().update({ name: 'Bright Future', about: 'A school' })
    const progress = progressFromStores()
    expect(progress.completedSteps).toEqual(['type', 'details'])
    expect(progress.currentStep).toBe('design')
    expect(progress.onboardingData).toMatchObject({ onboarding: { typeId: 'school' }, profile: { name: 'Bright Future' } })
  })

  it('never uploads a logo image or anything that looks like a key', () => {
    useBusinessStore.getState().update({ name: 'A', about: 'B', logo: 'data:image/png;base64,' + 'A'.repeat(5000) })
    const data = progressFromStores().onboardingData as { profile: Record<string, unknown> }
    expect(data.profile.logo).toBeUndefined()
    expect(JSON.stringify(data)).not.toMatch(/key|token|secret|password/i)
  })

  it('is applied from the server without wiping what is already here', () => {
    useBusinessStore.getState().update({ name: 'Local name', logo: 'data:image/png;base64,LOCAL' })
    applyProgress({
      currentStep: 'design', completedSteps: ['type'], updatedAt: 'now',
      onboardingData: { onboarding: { mode: 'builder', typeId: 'cafe', designId: 'restaurant', pages: ['Menu'] }, profile: { name: '', about: 'From the server', contact: { email: 'a@b.co', mobile: '' } }, completed: true },
    })
    const state = useBusinessStore.getState()
    expect(state.profile.name).toBe('Local name')
    expect(state.profile.logo).toBe('data:image/png;base64,LOCAL')
    expect(state.profile.about).toBe('From the server')
    expect(state.profile.contact.email).toBe('a@b.co')
    expect(state.profile.contact.whatsapp).toBe(emptyProfile.contact.whatsapp)
    expect(state.completed).toBe(true)
    expect(useOnboardingStore.getState()).toMatchObject({ mode: 'builder', typeId: 'cafe', designId: 'restaurant', pages: ['Menu'] })
  })

  it('ignores a malformed server answer', () => {
    applyProgress({ currentStep: null, completedSteps: [], updatedAt: 'now', onboardingData: { onboarding: { typeId: 42, pages: 'x' }, profile: 'nope' } })
    expect(useOnboardingStore.getState()).toMatchObject({ typeId: null, pages: [] })
  })
})

describe('forgetting this browser', () => {
  it('removes the brief, the sync notes and the setup progress', () => {
    localStorage.setItem(BRIEF_KEY, '{"description":"x"}')
    writeMeta({ briefAt: 'then' })
    useOnboardingStore.getState().setType('school')
    clearLocalUserData()
    expect(localStorage.getItem(BRIEF_KEY)).toBeNull()
    expect(readMeta()).toEqual({})
    expect(useOnboardingStore.getState().typeId).toBeNull()
  })
})
