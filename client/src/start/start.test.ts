import { describe, expect, it } from 'vitest'
import type { BlockConfig } from '@/blocks/types'
import { exportSitePages } from '@/lib/export-html'
import { emptyProfile, type BusinessProfile } from '@/onboarding/profile'
import { fullAddress } from '@/onboarding/apply-profile'
import { ensurePages } from '@/store/site-shape'
import { businessInfoErrors } from './business-info'
import { buildStarterSite, pageChoices, starterDesignMap, starterDesigns } from './starter-designs'
import { matchesTypeSearch, typeScore, websiteTypeMap, websiteTypes } from './website-types'

const profile: BusinessProfile = {
  ...emptyProfile,
  name: 'Bright Future Academy',
  slogan: 'Learning Today, Leading Tomorrow',
  about: 'Modern English-medium school.',
  services: 'Admissions\nClasses',
  city: 'Pune',
  country: 'India',
  ctaText: 'Apply for Admission',
  contact: { ...emptyProfile.contact, email: 'hello@bfa.example', mobile: '+91 98765 43210', address: '12 Main Road' },
}

const flat = (blocks: BlockConfig[]): BlockConfig[] => blocks.flatMap((b) => [b, ...flat(b.children ?? [])])

describe('website types', () => {
  it('offers the 29 kinds of website, each mapped to a real category with designs that exist', () => {
    expect(websiteTypes).toHaveLength(29)
    for (const type of websiteTypes) {
      expect(type.designs.length).toBeGreaterThanOrEqual(3)
      for (const id of type.designs) expect(starterDesignMap.has(id), `${type.id} -> ${id}`).toBe(true)
    }
    expect(new Set(websiteTypes.map((t) => t.id)).size).toBe(websiteTypes.length)
    expect(websiteTypeMap.get('school')?.category).toBe('education')
  })

  it('searches by name, hint and keyword', () => {
    const found = websiteTypes.filter((t) => matchesTypeSearch(t, 'school')).map((t) => t.id)
    expect(found).toContain('school')
    expect(websiteTypes.filter((t) => matchesTypeSearch(t, 'zzzz'))).toHaveLength(0)
    expect(websiteTypes.filter((t) => matchesTypeSearch(t, ''))).toHaveLength(29)
  })

  it('ranks templates whose words fit the type above those that do not', () => {
    const school = websiteTypeMap.get('school')
    expect(typeScore(school, 'Greenfield Academy education')).toBeGreaterThan(typeScore(school, 'Auto Repair Garage'))
    expect(typeScore(undefined, 'anything')).toBe(0)
  })
})

describe('business details', () => {
  it('needs a name and a description, and nothing else', () => {
    expect(Object.keys(businessInfoErrors(emptyProfile)).sort()).toEqual(['about', 'name'])
    expect(businessInfoErrors({ ...emptyProfile, name: 'A', about: 'B' })).toEqual({})
  })
  it('joins city and country onto the address', () => {
    expect(fullAddress(profile)).toBe('12 Main Road, Pune, India')
    expect(fullAddress({ ...emptyProfile })).toBe('')
  })
})

describe('"Create a site" starting designs', () => {
  it('offers 12 designs, one of them blank', () => {
    expect(starterDesigns).toHaveLength(12)
    expect(starterDesigns.filter((d) => d.blank)).toHaveLength(1)
  })

  it('builds every design with Home first, the chosen pages, a shared header and footer, and no empty home', () => {
    for (const design of starterDesigns) {
      const site = buildStarterSite(design, profile, ['About', 'Services', 'Contact'])
      const pages = ensurePages(site)
      expect(pages.map((p) => p.name), design.id).toEqual(['Home', 'About', 'Services', 'Contact'])
      // Blank canvas builds nothing at all; every other design arrives with a header and a footer.
      expect(site.header, design.id).toHaveLength(design.blank ? 0 : 1)
      expect(site.footer, design.id).toHaveLength(design.blank ? 0 : 1)
      expect(site.buildMode).toBe('custom')
      if (design.blank) expect(pages[0].blocks).toHaveLength(0)
      else {
        expect(pages[0].blocks.length, design.id).toBeGreaterThan(3)
        expect(pages[0].blocks[0].type).toBe('hero')
      }
    }
  })

  it('uses the style the design names, and its colours', () => {
    const design = starterDesignMap.get('dark-modern')!
    const site = buildStarterSite(design, profile, [])
    expect(site.header![0].variant).toBe('split-center')
    expect(site.footer![0].variant).toBe('columns')
    expect(site.pages![0].blocks[0].variant).toBe('gradient')
    expect(site.theme?.accent).toBeTruthy()
  })

  it('pours the business details into the header, hero, footer and menu', () => {
    const site = buildStarterSite(starterDesignMap.get('modern-business')!, profile, ['Contact'])
    const hero = site.pages![0].blocks[0]
    expect(hero.props.headline).toBe('Bright Future Academy')
    expect(hero.props.subheadline).toBe('Learning Today, Leading Tomorrow')
    expect(hero.props.primaryCta).toBe('Apply for Admission')
    expect(site.header![0].props.logo).toBe('Bright Future Academy')
    expect(site.header![0].props.ctaText).toBe('Apply for Admission')
    expect(JSON.stringify(site.footer![0].props)).toContain('Bright Future Academy')
    expect(site.header![0].props.links).toEqual(['Home', 'Contact'])
    expect(site.name).toBe('Bright Future Academy')
  })

  it('makes a page for every choice, including your own, and a unique path for each', () => {
    const site = buildStarterSite(starterDesignMap.get('clean-minimal')!, profile, [...pageChoices, 'Events', 'events'])
    const pages = ensurePages(site)
    expect(pages).toHaveLength(pageChoices.length + 2)
    expect(new Set(pages.map((p) => p.path)).size).toBe(pages.length)
    expect(pages.find((p) => p.name === 'Events')?.blocks.length).toBeGreaterThan(0)
    for (const page of pages.slice(1)) expect(flat(page.blocks).length, page.name).toBeGreaterThan(0)
  })

  it('exports as a working site with the header menu', () => {
    const site = buildStarterSite(starterDesignMap.get('restaurant')!, profile, ['About', 'Menu', 'Contact'])
    const files = exportSitePages(site, { fileLinks: true })
    expect(files.map((f) => f.file)).toEqual(['index.html', 'about.html', 'menu.html', 'contact.html'])
    expect(files[0].html).toContain('Bright Future Academy')
    expect(files[0].html).toContain('menu.html')
  })
})
