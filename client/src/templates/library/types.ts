import type { BlockConfig, BlockType, SiteConfig, ThemeConfig } from '@/blocks/types'
import { newId } from '@/lib/id'
import { blockMetadata } from '@/lib/block-metadata'
import { syncMenu } from '@/store/site-shape'
import { applyProfile } from '@/onboarding/apply-profile'
import { autoLinkButtons } from '@/lib/auto-link-buttons'
import { themePresets } from '@/lib/theme-presets'
import type { BusinessProfile, WebsiteCategory } from '@/onboarding/profile'

/**
 * A real template.
 *
 * Every entry here is one design, written out section by section: this hero,
 * with this headline, above these three feature cards, in these colours. It is
 * the opposite of what this folder used to hold, where a "template" was a
 * pointer to three ingredient lists that the code multiplied together, so that
 * dozens of them shared a skeleton and differed only in wording.
 *
 * The designs are adapted from downloaded website templates in
 * `templates Download/`. What is taken is the structure and the arrangement —
 * which sections, in which order, with what kind of content — rebuilt out of
 * this builder's own widgets. Nothing of the original markup or stylesheet is
 * carried over, because a template here has to be editable in the editor, and
 * a slab of somebody else's HTML would not be.
 */

/** One section of a template, with its content spelled out. */
export interface SectionSpec {
  type: BlockType
  variant: string
  props?: Record<string, unknown>
}

export interface TemplatePage {
  name: string
  path: string
  sections: SectionSpec[]
}

export interface RealTemplate {
  id: string
  name: string
  /** One line for the card in the chooser. */
  description: string
  category: WebsiteCategory
  /** Which downloaded design this was rebuilt from, for the record. */
  source: string
  theme: ThemeConfig
  header: SectionSpec[]
  home: SectionSpec[]
  pages: TemplatePage[]
  footer: SectionSpec[]
}

/** Shared skeleton so each design only states what makes it different. */
export function lightTheme(overrides: Partial<ThemeConfig>): ThemeConfig {
  return {
    bg0: '#ffffff',
    bg1: '#ffffff',
    bg2: '#f7f7f9',
    bg3: '#eeeef2',
    bg4: '#dcdce3',
    bg5: '#c2c2cd',
    text0: '#0d0d12',
    text1: '#3d3d47',
    text2: '#68687a',
    text3: '#9a9aa8',
    accent: '#4f46e5',
    accentDim: '#4338ca',
    borderDefault: '#e5e5ea',
    borderSubtle: '#f0f0f4',
    borderHover: '#cfcfd8',
    fontSans: 'DM Sans',
    fontDisplay: 'DM Sans',
    fontMono: 'JetBrains Mono',
    radius: 10,
    radiusLg: 16,
    ...overrides,
  }
}

export function darkTheme(overrides: Partial<ThemeConfig>): ThemeConfig {
  return {
    bg0: '#0b0d12',
    bg1: '#111319',
    bg2: '#171a22',
    bg3: '#1f2330',
    bg4: '#2b3040',
    bg5: '#3b4257',
    text0: '#f5f6f8',
    text1: '#c8cbd4',
    text2: '#9aa0ad',
    text3: '#6d7484',
    accent: '#ea580c',
    accentDim: '#c2410c',
    borderDefault: '#252a36',
    borderSubtle: '#1a1e28',
    borderHover: '#39404f',
    fontSans: 'Outfit',
    fontDisplay: 'Outfit',
    fontMono: 'JetBrains Mono',
    radius: 12,
    radiusLg: 20,
    ...overrides,
  }
}

/** A widget's own sample content, for props a template does not state. */
function defaults(type: BlockType): Record<string, unknown> {
  const meta = blockMetadata.find((entry) => entry.type === type)
  return meta ? structuredClone(meta.defaultProps) : {}
}

export function toBlocks(sections: SectionSpec[]): BlockConfig[] {
  return sections.map((section) => ({
    id: newId(`block-${section.type}`),
    type: section.type,
    variant: section.variant,
    // The widget's own sample content underneath, so a template need only
    // state what it actually changes.
    props: { ...defaults(section.type), ...(section.props ?? {}) },
  }))
}

/**
 * Turns a template into a site the editor can open.
 *
 * Fresh ids every time, so the same template can be used twice without two
 * blocks answering to one name. The business's own details go in last, which
 * is what makes the design read as their site rather than a demo.
 */
export function buildTemplate(template: RealTemplate, profile?: BusinessProfile): SiteConfig {
  const pages = [
    { id: newId('page'), name: 'Home', path: '/', showInMenu: true, blocks: toBlocks(template.home) },
    ...template.pages.map((page) => ({
      id: newId('page'),
      name: page.name,
      path: page.path,
      showInMenu: true,
      blocks: toBlocks(page.sections),
    })),
  ]

  const site = syncMenu({
    name: profile?.name?.trim() || template.name,
    theme: template.theme,
    // Kept so the theme panel can always return to the palette the design shipped with.
    themeDefaults: { ...template.theme },
    header: toBlocks(template.header),
    footer: toBlocks(template.footer),
    pages,
    blocks: pages[0].blocks,
  })

  const linked = autoLinkButtons(site)
  if (!profile) return linked
  return applyPagePreferences(applyProfile(linked, profile), profile)
}

/**
 * Trims to the pages the setup wizard's checklist asked for, and applies the
 * chosen theme preset, if either was set. Both are optional trims on top of
 * what the template ships with — an empty answer changes nothing, so this
 * can never leave a site with no pages or produce a mismatched theme.
 */
function applyPagePreferences(config: SiteConfig, profile: BusinessProfile): SiteConfig {
  let next = config

  if (profile.themePresetId) {
    const preset = themePresets.find((p) => p.id === profile.themePresetId)
    if (preset) next = { ...next, theme: preset.theme }
  }

  if (profile.pages.length > 0 && next.pages && next.pages.length > 1) {
    const wanted = profile.pages.map((p) => p.toLowerCase())
    const kept = next.pages.filter((page, index) => {
      if (index === 0) return true // Home always stays.
      const name = page.name.toLowerCase()
      return wanted.some((w) => name.includes(w) || w.includes(name))
    })
    // Never trim to nothing beyond Home if the loose match missed everything —
    // that would silently drop pages the template author intended to ship.
    if (kept.length > 1) next = { ...next, pages: kept }
  }

  return syncMenu(next)
}
