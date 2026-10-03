import type { BlockConfig, BlockType, SiteConfig } from '@/blocks/types'
import { newId } from '@/lib/id'
import { blockMetadata } from '@/lib/block-metadata'
import { splitHeaderFooter, syncMenu } from '@/store/site-shape'
import { applyProfile } from '@/onboarding/apply-profile'
import type { BusinessProfile } from '@/onboarding/profile'

/**
 * The plain website a new project starts from.
 *
 * This replaces the template generator that used to live in this folder. That
 * system held sixteen sets of words, ten colour schemes and eleven section
 * orders, and multiplied them into fifty-five entries it called templates.
 * Nobody had designed any of them: dozens shared a skeleton and differed only
 * in colour and wording, which is exactly why the gallery read as one template
 * repeated. Counting combinations is not the same as drawing a design, and the
 * owner asked for the generator to go.
 *
 * What is left is deliberately one layout, not fifty. It is a starting point —
 * the sections a small business site needs, in the order it needs them — filled
 * in with that business's own name, logo and contact details. Real designed
 * templates are meant to be added beside it, one at a time, each one drawn
 * rather than assembled.
 *
 * Every section's words come from the widget's own sample content, the same
 * text the widget library offers when you drag one in. So there is no separate
 * store of template copy to keep in step with the widgets.
 */

/** A widget's own sample content, as the widget library offers it. */
function defaults(type: BlockType): Record<string, unknown> {
  const meta = blockMetadata.find((entry) => entry.type === type)
  return meta ? structuredClone(meta.defaultProps) : {}
}

function block(type: BlockType, variant?: string, props: Record<string, unknown> = {}): BlockConfig {
  const meta = blockMetadata.find((entry) => entry.type === type)
  return {
    id: newId(`block-${type}`),
    type,
    variant: variant ?? meta?.variants[0] ?? 'default',
    props: { ...defaults(type), ...props },
  }
}

/** The pages a new site is created with, beyond the home page. */
export type PageRole = 'about' | 'services' | 'contact' | 'team' | 'faq' | 'pricing' | 'gallery'

const pageSections: Record<PageRole, { type: BlockType; variant?: string }[]> = {
  about: [
    { type: 'content', variant: 'prose' },
    { type: 'stats', variant: 'grid' },
    { type: 'team', variant: 'grid' },
  ],
  services: [
    { type: 'features', variant: 'grid' },
    { type: 'faq', variant: 'accordion' },
  ],
  contact: [
    { type: 'contact', variant: 'form' },
    { type: 'map', variant: 'side-by-side' },
  ],
  team: [
    { type: 'team', variant: 'grid' },
    { type: 'content', variant: 'prose' },
  ],
  faq: [
    { type: 'faq', variant: 'accordion' },
    { type: 'contact', variant: 'form' },
  ],
  pricing: [
    { type: 'pricing', variant: 'simple' },
    { type: 'faq', variant: 'accordion' },
  ],
  gallery: [
    { type: 'gallery', variant: 'grid' },
    { type: 'cta', variant: 'simple' },
  ],
}

const homeSections: { type: BlockType; variant?: string }[] = [
  { type: 'navbar', variant: 'default' },
  { type: 'hero', variant: 'split' },
  { type: 'features', variant: 'grid' },
  { type: 'image', variant: 'side-by-side' },
  { type: 'content', variant: 'prose' },
  { type: 'stats', variant: 'bar' },
  { type: 'testimonials', variant: 'cards' },
  { type: 'contact', variant: 'form' },
  { type: 'footer', variant: 'multi-column' },
]

/** The sections a page of a given kind starts with, with fresh ids. */
export function starterPageBlocks(role: PageRole): BlockConfig[] {
  return pageSections[role].map((section) => block(section.type, section.variant))
}

/** The pages a brand new site is created with, in order. */
export const pageRoles: PageRole[] = ['about', 'services', 'contact']

const pageNames: Record<PageRole, string> = {
  about: 'About',
  services: 'Services',
  contact: 'Contact',
  team: 'Team',
  faq: 'FAQ',
  pricing: 'Pricing',
  gallery: 'Gallery',
}

/**
 * A complete starting website for a business.
 *
 * Four pages with one shared header and footer, and the menu already pointing
 * at all four. The business's own details are poured in last, so the editor
 * opens on something that reads as their site rather than a sample.
 */
export function starterSite(profile?: BusinessProfile): SiteConfig {
  const home = homeSections.map((section) => block(section.type, section.variant))

  // Lifts the navbar and footer out of the home page, so one header serves
  // every page rather than each page carrying its own.
  const shaped = splitHeaderFooter({ name: profile?.name?.trim() || 'My business', blocks: home })

  const pages = [
    { id: newId('page'), name: 'Home', path: '/', showInMenu: true, blocks: shaped.blocks },
    ...pageRoles.map((role) => ({
      id: newId('page'),
      name: pageNames[role],
      path: `/${role}`,
      showInMenu: true,
      blocks: starterPageBlocks(role),
    })),
  ]

  const site = syncMenu({ ...shaped, pages, blocks: pages[0].blocks })
  return profile ? applyProfile(site, profile) : site
}

/**
 * The starting pages a site is missing, for the "add the usual pages" button.
 *
 * Only what is absent: a site that already has an About page keeps the one it
 * has, words and all.
 */
export function missingStarterPages(
  existing: { name: string; path: string }[],
): { id: string; name: string; path: string; showInMenu: boolean; blocks: BlockConfig[] }[] {
  return pageRoles
    .filter(
      (role) =>
        !existing.some(
          (page) =>
            page.path === `/${role}` ||
            page.name.toLowerCase().includes(pageNames[role].toLowerCase()),
        ),
    )
    .map((role) => ({
      id: newId('page'),
      name: pageNames[role],
      path: `/${role}`,
      showInMenu: true,
      blocks: starterPageBlocks(role),
    }))
}
