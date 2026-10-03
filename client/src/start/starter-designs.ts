import type { BlockConfig, BlockType, SiteConfig } from '@/blocks/types'
import { blockMetadata } from '@/lib/block-metadata'
import { newId } from '@/lib/id'
import { applyProfile } from '@/onboarding/apply-profile'
import type { BusinessProfile } from '@/onboarding/profile'
import { ensurePages, splitHeaderFooter, syncMenu } from '@/store/site-shape'
import { customSite } from '@/layouts/custom-site'
import { themePresets } from '@/lib/theme-presets'
import { starterPageBlocks, type PageRole } from '@/templates/starter'

/**
 * "Create a site" starts from a design, not from a blank page.
 *
 * A starting design is a choice of header style, footer style, colours, hero and a
 * run of sections. It is still a site made of widgets: every section is an ordinary
 * block that can be moved, restyled or replaced, and the business details from the
 * setup form are poured in through the same `applyProfile` the templates use.
 * "Blank canvas" is the one design that adds nothing.
 */

interface Section { type: BlockType; variant?: string }

export interface StarterDesign {
  id: string
  name: string
  description: string
  /** A `themePresets` id. */
  preset: string
  header: string
  footer: string
  footerColumns?: number
  hero: string
  /** The sections under the hero on the home page. */
  sections: Section[]
  blank?: boolean
}

export const starterDesigns: StarterDesign[] = [
  { id: 'modern-business', name: 'Modern Business', description: 'Logo, menu and button. Split hero, service cards, numbers, testimonials.', preset: 'blue-corporate', header: 'default', footer: 'columns', footerColumns: 3, hero: 'split', sections: [{ type: 'features', variant: 'grid' }, { type: 'content', variant: 'side-by-side' }, { type: 'stats' }, { type: 'testimonials' }, { type: 'cta' }] },
  { id: 'clean-minimal', name: 'Clean Minimal', description: 'Centred header, plain hero and lots of space.', preset: 'grey-minimal', header: 'centered', footer: 'minimal', hero: 'minimal', sections: [{ type: 'features', variant: 'list' }, { type: 'content', variant: 'prose' }, { type: 'cta' }] },
  { id: 'professional-corporate', name: 'Professional Corporate', description: 'Header with a contact bar, formal sections and a clear footer.', preset: 'blue-corporate', header: 'topbar', footer: 'newsletter', footerColumns: 3, hero: 'split', sections: [{ type: 'logocloud' }, { type: 'features', variant: 'grid' }, { type: 'stats' }, { type: 'team' }, { type: 'faq' }, { type: 'cta' }] },
  { id: 'creative-portfolio', name: 'Creative Portfolio', description: 'Big picture hero, a gallery of work and a short contact.', preset: 'orange-creative', header: 'stacked', footer: 'inline', hero: 'photo', sections: [{ type: 'gallery', variant: 'masonry' }, { type: 'content', variant: 'side-by-side' }, { type: 'testimonials' }, { type: 'contact' }] },
  { id: 'dark-modern', name: 'Dark Modern', description: 'Dark colours, gradient hero and bold sections.', preset: 'dark-grey', header: 'split-center', footer: 'columns', footerColumns: 2, hero: 'gradient', sections: [{ type: 'features', variant: 'grid' }, { type: 'stats' }, { type: 'testimonials' }, { type: 'cta' }] },
  { id: 'light-elegant', name: 'Light Elegant', description: 'Soft colours, centred header and refined sections.', preset: 'ivory', header: 'stacked-pipes', footer: 'centered', hero: 'centered', sections: [{ type: 'content', variant: 'side-by-side' }, { type: 'gallery', variant: 'grid' }, { type: 'testimonials' }, { type: 'cta' }] },
  { id: 'bold-agency', name: 'Bold Agency', description: 'Strong colours, picture hero and a services grid.', preset: 'black-premium', header: 'contact', footer: 'columns', footerColumns: 4, hero: 'photo', sections: [{ type: 'features', variant: 'grid' }, { type: 'logocloud' }, { type: 'team' }, { type: 'cta' }] },
  { id: 'startup-saas', name: 'Startup / SaaS', description: 'Gradient hero, feature grid, pricing and questions.', preset: 'ocean', header: 'split-center', footer: 'newsletter', footerColumns: 3, hero: 'gradient', sections: [{ type: 'logocloud' }, { type: 'features', variant: 'grid' }, { type: 'pricing' }, { type: 'faq' }, { type: 'cta' }] },
  { id: 'education', name: 'Education', description: 'Friendly colours, courses, teachers, numbers and questions.', preset: 'green-education', header: 'default', footer: 'columns', footerColumns: 3, hero: 'split', sections: [{ type: 'features', variant: 'grid' }, { type: 'team' }, { type: 'stats' }, { type: 'faq' }, { type: 'cta' }] },
  { id: 'ecommerce', name: 'E-commerce', description: 'Icons in the header, a shop front with products and a newsletter.', preset: 'rose', header: 'icons', footer: 'newsletter', footerColumns: 3, hero: 'photo', sections: [{ type: 'features', variant: 'grid' }, { type: 'products' }, { type: 'testimonials' }, { type: 'newsletter' }] },
  { id: 'restaurant', name: 'Restaurant', description: 'Warm colours, picture hero, opening hours and gallery.', preset: 'amber', header: 'centered', footer: 'columns', footerColumns: 3, hero: 'photo', sections: [{ type: 'content', variant: 'side-by-side' }, { type: 'gallery', variant: 'grid' }, { type: 'hours' }, { type: 'testimonials' }, { type: 'contact' }] },
  { id: 'blank', name: 'Blank canvas', description: 'A header, a footer and an empty page. You choose every layout.', preset: 'default', header: 'default', footer: 'columns', hero: 'minimal', sections: [], blank: true },
]

export const starterDesignMap = new Map(starterDesigns.map((design) => [design.id, design]))

function block(type: BlockType, variant?: string, props: Record<string, unknown> = {}): BlockConfig {
  const meta = blockMetadata.find((entry) => entry.type === type)
  return {
    id: newId(`block-${type}`),
    type,
    variant: variant && meta?.variants.includes(variant) ? variant : (meta?.variants[0] ?? 'default'),
    props: { ...structuredClone(meta?.defaultProps ?? {}), ...props },
  }
}

/** The pages a client can tick, and what each starts with. Anything else is a custom page. */
const pageRoles: Record<string, PageRole> = {
  about: 'about', services: 'services', contact: 'contact', team: 'team', faq: 'faq', pricing: 'pricing', gallery: 'gallery',
}

function pageSections(name: string): BlockConfig[] {
  const key = name.trim().toLowerCase()
  const role = pageRoles[key]
  if (role) return starterPageBlocks(role)
  switch (key) {
    case 'features': return [block('features', 'grid'), block('stats'), block('cta')]
    case 'courses': return [block('features', 'grid', { title: 'Our courses' }), block('faq'), block('cta')]
    case 'admission': return [block('content', 'side-by-side'), block('contact')]
    case 'menu': return [block('content', 'prose'), block('gallery', 'grid'), block('hours')]
    case 'rooms': return [block('features', 'grid', { title: 'Rooms' }), block('gallery', 'grid')]
    case 'shop': return [block('products'), block('newsletter')]
    case 'portfolio': return [block('gallery', 'masonry'), block('cta')]
    case 'blog': return [block('content', 'prose'), block('newsletter')]
    case 'testimonials': return [block('testimonials'), block('cta')]
    default: return [block('content', 'prose', { title: name })]
  }
}

/** Every page a client can choose in "Create a site", beyond Home. */
export const pageChoices = ['About', 'Services', 'Contact', 'FAQ', 'Features', 'Portfolio', 'Gallery', 'Blog', 'Team', 'Pricing', 'Testimonials', 'Courses', 'Admission', 'Menu', 'Rooms', 'Shop'] as const

/** The chosen page names without Home, blanks or repeats (compared ignoring case). */
function uniqueNames(names: string[]): string[] {
  const seen = new Set(['home'])
  const out: string[] = []
  for (const raw of names) {
    const name = raw.trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
  }
  return out
}

const slug = (name: string) => `/${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`

/**
 * A site from a starting design, the business's details and the pages chosen.
 * Home is always first. Blank canvas returns the empty custom site unchanged.
 */
export function buildStarterSite(design: StarterDesign, profile: BusinessProfile, pageNames: string[]): SiteConfig {
  const themed: BusinessProfile = { ...profile, themePresetId: design.blank ? profile.themePresetId : design.preset }

  const name = profile.name.trim() || 'My website'
  if (design.blank) {
    // Blank canvas is the same untouched custom site, with the pages that were chosen left empty.
    const empty = customSite(profile)
    const extra = uniqueNames(pageNames).map((page) => ({ id: newId('page'), name: page, path: slug(page), showInMenu: true, blocks: [] as BlockConfig[] }))
    return syncMenu({ ...empty, pages: [...ensurePages(empty), ...extra] })
  }
  // Blank canvas keeps every page empty: the pages are chosen, what goes on them is not.
  const home = design.blank ? [] : [block('hero', design.hero), ...design.sections.map((section) => block(section.type, section.variant))]
  const header = block('navbar', design.header)
  const footer = block('footer', design.footer, design.footerColumns ? { columnCount: design.footerColumns } : {})
  header.props = { ...header.props, logo: name, autoPageLinks: true }
  footer.props = { ...footer.props, logo: name, autoPageLinks: true, links: [] }

  const pages = [
    { id: newId('page'), name: 'Home', path: '/', showInMenu: true, blocks: home },
    ...uniqueNames(pageNames).map((page) => ({
      id: newId('page'), name: page, path: slug(page), showInMenu: true, blocks: design.blank ? [] : pageSections(page),
    })),
  ]

  const preset = themePresets.find((entry) => entry.id === design.preset)
  const site: SiteConfig = syncMenu(splitHeaderFooter({
    name,
    buildMode: 'custom',
    header: [header],
    footer: [footer],
    pages,
    blocks: pages[0].blocks,
    ...(preset ? { theme: preset.theme } : {}),
  }))
  const applied = applyProfile(site, themed)
  return { ...applied, buildMode: 'custom' }
}
