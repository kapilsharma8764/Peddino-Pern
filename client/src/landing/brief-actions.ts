import { initBuilder } from '@/builder/core'
import { api } from '@/lib/api'
import { profileFromDescription } from '@/onboarding/from-description'
import type { BusinessProfile } from '@/onboarding/profile'
import { useBusinessStore } from '@/store/businessStore'
import { usePublishStore } from '@/store/publishStore'
import { useOnboardingStore } from '@/start/onboardingStore'
import { buildStarterSite, pageChoices } from '@/start/starter-designs'
import { starterDesignById, useCatalog, websiteTypeById } from '@/store/catalogStore'
import { generalPreset, type BusinessDirection } from './business-brief'

/**
 * What "Choose a Template" and "Build with Widgets" do with a finished brief.
 *
 * Both write the same shared stores the /start flow uses (business details,
 * website type), so the gallery and the editor read the brief exactly as if it
 * had come through the setup questions.
 */

function applyBrief(description: string, direction: BusinessDirection) {
  const { presets } = useCatalog.getState()
  const preset = presets.find((entry) => entry.id === direction.presetId) ?? generalPreset(presets)
  const type = websiteTypeById(preset.typeId) ?? websiteTypeById('business')!
  const base = profileFromDescription(description)
  const profile: BusinessProfile = {
    ...base,
    category: type.category,
    websiteType: type.websiteType,
    offer: type.category === 'education' ? null : base.offer ?? 'services',
    name: direction.businessName,
    about: description.trim(),
  }
  useBusinessStore.getState().update({ category: profile.category, websiteType: profile.websiteType, offer: profile.offer, name: profile.name, about: profile.about })
  return { type, profile: { ...useBusinessStore.getState().profile } }
}

/** The gallery address, ranked and filtered for this kind of business. */
export function openTemplatesPath(description: string, direction: BusinessDirection): string {
  const { type } = applyBrief(description, direction)
  const onboarding = useOnboardingStore.getState()
  onboarding.begin('template')
  onboarding.setType(type.id)
  // Types without a category of their own browse the whole collection, ranked by keyword.
  return `/templates?from=start${type.category === 'other' ? '&category=all' : ''}`
}

/** Builds a starter site from the brief and loads it into the editor. Returns the editor address. */
export async function openStarterEditor(description: string, direction: BusinessDirection): Promise<string> {
  const { type, profile } = applyBrief(description, direction)
  const design = type.designs.map(starterDesignById).find(Boolean) ?? starterDesignById('modern-business')!
  const pages = direction.suggestedPages.filter((page) => page !== 'Home' && (pageChoices as readonly string[]).includes(page))
  const onboarding = useOnboardingStore.getState()
  onboarding.begin('builder')
  onboarding.setType(type.id)
  onboarding.setDesign(design.id)
  onboarding.setPages(pages)
  const config = buildStarterSite(design, profile, pages)
  initBuilder(config)
  usePublishStore.getState().clear()
  try {
    const created = await api.createSite({ name: config.name, config, profile })
    usePublishStore.getState().setSite(created.id)
  } catch { /* The editor keeps working offline. */ }
  useBusinessStore.getState().complete()
  return '/editor'
}
