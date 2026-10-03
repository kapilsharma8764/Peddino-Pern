import type { BlockConfig, SiteConfig } from '@/blocks/types'
import { newId } from '@/lib/id'
import { applyProfile } from '@/onboarding/apply-profile'
import type { BusinessProfile } from '@/onboarding/profile'
import { splitHeaderFooter, syncMenu } from '@/store/site-shape'
import { neutralTheme } from '@/lib/theme-presets'

/**
 * The starting point of "build it yourself".
 *
 * A shared header, a shared footer and one empty Home page. No ready-made
 * sections, no template content: the owner picks a page layout, adds section
 * layouts, drops widgets in and styles them. `buildMode: 'custom'` is what tells
 * the editor never to offer templates for this site.
 */
export function customSite(profile?: BusinessProfile): SiteConfig {
  const name = profile?.name?.trim() || 'My website'
  const home = { id: newId('page'), name: 'Home', path: '/', showInMenu: true, blocks: [] as BlockConfig[] }

  // Nothing is made for the client: no header, no footer, no sections, and a neutral
  // white-and-grey palette rather than the editor's own dark-and-green one. The header and
  // footer are built from the layout lists, and details they were told stay available as
  // suggestions (the business name, the logo) when those parts are added.
  const site: SiteConfig = syncMenu(splitHeaderFooter({
    name,
    buildMode: 'custom',
    header: [],
    footer: [],
    pages: [home],
    blocks: home.blocks,
    theme: { ...neutralTheme },
  }))
  return profile ? { ...applyProfile(site, profile), buildMode: 'custom' } : site
}

/**
 * Brings a site saved by an earlier version into line: a "build it yourself" site must never wear
 * the editor's own dark-and-green palette, and must not keep the header and footer an older version
 * made for it. Only an untouched, auto-made header or footer is removed (recognised by the exact
 * values the old version wrote); anything the client has built or edited is left alone.
 */
export function migrateCustomSite(site: SiteConfig): SiteConfig {
  if (site.buildMode !== 'custom') return site
  const legacyHeader = (block: BlockConfig) => block.type === 'navbar' && block.variant === 'default' && block.props.ctaText === 'Get started' && block.props.autoPageLinks === true
  const legacyFooter = (block: BlockConfig) => block.type === 'footer' && block.variant === 'columns' && block.props.columnCount === 3 && block.props.autoPageLinks === true
    && typeof block.props.copyright === 'string' && block.props.copyright.startsWith('©') && /All rights reserved\.$/.test(block.props.copyright)
  const header = site.header?.filter((block) => !legacyHeader(block))
  const footer = site.footer?.filter((block) => !legacyFooter(block))
  const changed = header?.length !== site.header?.length || footer?.length !== site.footer?.length || !site.theme
  if (!changed) return site
  return syncMenu({ ...site, header, footer, theme: site.theme ?? { ...neutralTheme } })
}
