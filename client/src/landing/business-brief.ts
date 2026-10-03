import { extractName } from '@/onboarding/from-description'
import presetSeed from '@/data/seed/business_presets.json'

/**
 * The "What are you building?" box on the home page.
 *
 * Everything that depends on the kind of business is a *preset*: the example
 * sentence, the preview shown beside the form, and the direction (pages,
 * sections, features, template category, colours) the analysis returns. The
 * presets live in PostgreSQL (`business_presets`) and arrive through
 * `/api/business-presets`; `fallbackPresets` is the same data from the seed file,
 * used until the API answers or when it cannot. The functions below take the
 * list as an argument, so they work the same on either.
 *
 * `analyzeBusinessBrief` is local and predictable. It is async so a call to an
 * AI service can replace its body later without touching the component.
 */

/** A preset's slug: "cafe", "school", "real-estate", or "general" for the catch-all. */
export type PresetId = string
export type ChipId = string

export interface BriefPreview {
  title: string
  /** Short name for the sample page's menu bar. */
  brand: string
  tagline: string
  /** Small label above the headline, also used as the "template" label. */
  kind: string
  headline: string
  blurb: string
  cta: string
  nav: string[]
  navButton: string
  stats: [string, string][]
  widgets: string[]
  selected: string
  ai: string
  ready: number
  /** Soft background and the dark accent of the sample page. */
  tint: [string, string]
  ink: string
}

export interface BusinessDirection {
  presetId: PresetId
  businessType: string
  businessName: string
  suggestedPages: string[]
  suggestedSections: string[]
  recommendedFeatures: string[]
  suggestedTemplateCategory: string
  themeDirection: { style: string; primaryColor: string; accentColor: string }
}

export interface BusinessPreset {
  id: PresetId
  label: string
  /** A website type's slug, which decides the gallery category and the starting designs. */
  typeId: string
  example: string
  keywords: string[]
  preview: BriefPreview
  /** False for the catch-all "general" preset, which has no chip of its own. */
  isChip: boolean
  direction: Omit<BusinessDirection, 'presetId' | 'businessName'>
}

/** A preset as the API and the seed file spell it. */
export interface BusinessPresetRow {
  slug: string
  name: string
  businessType: string
  examplePrompt: string
  websiteTypeSlug: string
  keywords: string[]
  recommendedPages: string[]
  recommendedFeatures: string[]
  recommendedSections: string[]
  suggestedTemplateCategory: string
  themeDirection: BusinessDirection['themeDirection']
  preview: BriefPreview
  isChip: boolean
}

export const toPreset = (row: BusinessPresetRow): BusinessPreset => ({
  id: row.slug,
  label: row.name,
  typeId: row.websiteTypeSlug,
  example: row.examplePrompt,
  keywords: row.keywords,
  preview: row.preview,
  isChip: row.isChip,
  direction: {
    businessType: row.businessType,
    suggestedPages: row.recommendedPages,
    suggestedSections: row.recommendedSections,
    recommendedFeatures: row.recommendedFeatures,
    suggestedTemplateCategory: row.suggestedTemplateCategory,
    themeDirection: row.themeDirection,
  },
})

/** The offline fallback: the seed file, which is also what fills the database. */
export const fallbackPresets: BusinessPreset[] = (presetSeed as unknown as BusinessPresetRow[]).map(toPreset)

/** The chips, in order. */
export const chipPresets = (presets: BusinessPreset[]) => presets.filter((preset) => preset.isChip)

/** The catch-all used when nothing in a sentence is clear. */
export const generalPreset = (presets: BusinessPreset[]): BusinessPreset =>
  presets.find((preset) => preset.id === 'general') ?? fallbackPresets.find((preset) => preset.id === 'general')!

/** The preview shown before anything is chosen: the sample interior studio. */
export const samplePreview: BriefPreview = {
  title: 'Peddino Site Builder', brand: 'FORMA', tagline: 'Editor', kind: 'Interior Studio',
  headline: 'Thoughtful interiors\nfor modern living.', blurb: 'We create calm, functional spaces designed around the way you live.', cta: 'Explore our work',
  nav: ['Home', 'Work', 'About'], navButton: 'Book consult',
  stats: [['12', 'Projects'], ['4.9', 'Rating'], ['24h', 'Draft ready']],
  widgets: ['Text', 'Image', 'Button', 'Section', 'Container', 'Gallery'], selected: 'Hero headline selected',
  ai: 'Added services, gallery and contact flow from your brief.', ready: 92,
  tint: ['#fbf7f1', '#f4ede2'], ink: '#241c14',
}

export const MIN_BRIEF_LENGTH = 10
export const MAX_BRIEF_LENGTH = 1200

/** Lower case, accents removed ("café" matches "cafe"), spaces collapsed. */
function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Which kind of business a sentence is about, or null when nothing in it is clear.
 * The preset with the most keyword hits wins; a tie goes to the earlier chip.
 */
export function detectPreset(description: string, presets: BusinessPreset[] = fallbackPresets): ChipId | null {
  const text = ` ${plain(description)} `
  let best: ChipId | null = null
  let bestScore = 0
  for (const preset of chipPresets(presets)) {
    const score = preset.keywords.filter((word) => new RegExp(`\\b${word.replace(/[-\s]/g, '[-\\s]?')}`).test(text)).length
    if (score > bestScore) { best = preset.id; bestScore = score }
  }
  return best
}

/** A name only when the person gave one ("called Forma", or in quotes). */
export function explicitName(description: string): string {
  return /["“]([^"”]{2,60})["”]|\b(?:called|named)\s+[A-Za-z0-9]/i.test(description) ? extractName(description) : ''
}

/** Checked on submit only, so typing is never interrupted. Empty string means fine. */
export function briefError(description: string): string {
  return description.trim().length < MIN_BRIEF_LENGTH ? 'Please describe your business in a few words.' : ''
}

const MIN_ANALYSIS_MS = 600

/**
 * The direction for a business sentence.
 *
 * `selectedType` is a chip the person picked; without one the sentence decides.
 * The short wait is only so the "Finding your direction…" state can be seen —
 * nothing here is slow.
 */
export async function analyzeBusinessBrief(description: string, selectedType: ChipId | null, presets: BusinessPreset[] = fallbackPresets): Promise<BusinessDirection> {
  const started = Date.now()
  const text = description.trim()
  const wanted = selectedType ?? detectPreset(text, presets)
  const preset = presets.find((entry) => entry.id === wanted) ?? generalPreset(presets)
  const direction: BusinessDirection = {
    ...preset.direction,
    presetId: preset.id,
    businessName: explicitName(text) || preset.preview.title,
  }
  const wait = MIN_ANALYSIS_MS - (Date.now() - started)
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  return direction
}

/** What is kept between visits and between the home page and the next step. */
export interface SavedBrief {
  description: string
  selectedPreset: ChipId | null
  businessType?: string
  recommendedPages?: string[]
  recommendedFeatures?: string[]
  suggestedTemplateCategory?: string
  themeDirection?: BusinessDirection['themeDirection']
  /** The full analysis, so a refresh can show the result again. */
  direction?: BusinessDirection
}

/**
 * The browser copy. For a signed-in person PostgreSQL is the source of truth
 * (see `lib/user-sync.ts`); this stays as the guest's only copy and as a quick
 * draft cache, so the box is never empty while the server is being asked.
 */
export const BRIEF_KEY = 'peddino_business_brief'

type BriefListener = (brief: SavedBrief) => void
const savedListeners = new Set<BriefListener>()
const adoptedListeners = new Set<BriefListener>()

/** Called after the person's own edit is kept in the browser: the sync pushes it to the server. */
export const onBriefSaved = (listener: BriefListener) => { savedListeners.add(listener); return () => { savedListeners.delete(listener) } }
/** Called when a brief from the server replaces the local one, so an open home page can show it. */
export const onBriefAdopted = (listener: BriefListener) => { adoptedListeners.add(listener); return () => { adoptedListeners.delete(listener) } }

export function loadBrief(): SavedBrief | null {
  try {
    const saved = JSON.parse(localStorage.getItem(BRIEF_KEY) ?? 'null') as Partial<SavedBrief> | null
    if (!saved || typeof saved.description !== 'string') return null
    const chip = typeof saved.selectedPreset === 'string' && /^[a-z0-9-]{1,40}$/.test(saved.selectedPreset) ? saved.selectedPreset : null
    return { ...saved, description: saved.description.slice(0, MAX_BRIEF_LENGTH), selectedPreset: chip }
  } catch { return null }
}

function keep(brief: SavedBrief): void {
  try { localStorage.setItem(BRIEF_KEY, JSON.stringify(brief)) } catch { /* Private mode: the page still works. */ }
}

export function saveBrief(brief: SavedBrief): void {
  keep(brief)
  savedListeners.forEach((listener) => listener(brief))
}

/** Replaces the browser copy with the server's, without sending it back. */
export function adoptBrief(brief: SavedBrief): void {
  keep(brief)
  adoptedListeners.forEach((listener) => listener(brief))
}

export function briefFromDirection(description: string, selectedPreset: ChipId | null, direction: BusinessDirection): SavedBrief {
  return {
    description,
    selectedPreset,
    businessType: direction.businessType,
    recommendedPages: direction.suggestedPages,
    recommendedFeatures: direction.recommendedFeatures,
    suggestedTemplateCategory: direction.suggestedTemplateCategory,
    themeDirection: direction.themeDirection,
    direction,
  }
}
