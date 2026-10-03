import { afterEach, describe, expect, it, vi } from 'vitest'
import seedContent from '@/data/seed/site_content.json'
import seedPlans from '@/data/seed/pricing_plans.json'
import seedTypes from '@/data/seed/website_types.json'
import seedDesigns from '@/data/seed/starter_designs.json'
import seedPresets from '@/data/seed/business_presets.json'
import { iconNames } from '@/marketing/content-helpers'
import { fallbackContent, fetchPageContent } from './contentApi'
import { fetchBusinessPresets, fetchStarterDesigns, fetchWebsiteTypes } from './catalogApi'
import { fetchLayoutTemplateList, loadStartingTemplate } from './templateApi'
import { fetchPlans } from './pricingApi'
import { emergencyTemplate } from '@/templates/library/emergency'
import { buildTemplate } from '@/templates/library/types'

function answer(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })))
}
afterEach(() => vi.unstubAllGlobals())

describe('seed files', () => {
  it('give every marketing page the sections its component draws', () => {
    expect(Object.keys(fallbackContent('features'))).toEqual(['hero', 'proof', 'build', 'design', 'publish', 'cta'])
    expect(Object.keys(fallbackContent('how-it-works'))).toEqual(['hero', 'steps', 'cta'])
    expect(Object.keys(fallbackContent('about'))).toEqual(['hero', 'mission', 'why', 'care', 'cta'])
    expect(Object.keys(fallbackContent('help'))).toEqual(['hero', 'start', 'faq', 'more', 'cta'])
    expect(Object.keys(fallbackContent('pricing'))).toEqual(['hero', 'comparison', 'faq', 'cta'])
    expect(fallbackContent('home').faq.content.items).toHaveLength(4)
    expect(fallbackContent('nothing')).toEqual({})
  })

  it('only name icons the marketing pages can draw', () => {
    const used = new Set<string>()
    const walk = (value: unknown, key = '') => {
      if (key === 'icon' && typeof value === 'string') used.add(value)
      else if (Array.isArray(value)) value.forEach((item) => walk(item))
      else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => walk(v, k))
    }
    walk(seedContent)
    for (const name of used) expect(iconNames, name).toContain(name)
  })

  it('have unique slugs and sensible pricing', () => {
    for (const list of [seedTypes, seedDesigns, seedPresets, seedPlans]) expect(new Set(list.map((row) => row.slug)).size).toBe(list.length)
    expect(seedPlans.filter((plan) => plan.featured)).toHaveLength(1)
    expect(seedPlans.find((plan) => plan.slug === 'free')).toMatchObject({ price: 0, comingSoon: false })
    expect(seedPlans.filter((plan) => plan.comingSoon).map((plan) => plan.slug)).toEqual(['pro', 'business'])
    expect(new Set(seedContent.map((row) => `${row.pageKey}/${row.sectionKey}`)).size).toBe(seedContent.length)
  })

  it('point presets at website types that exist', () => {
    const types = new Set(seedTypes.map((type) => type.slug))
    for (const preset of seedPresets) expect(types.has(preset.websiteTypeSlug), preset.slug).toBe(true)
  })
})

describe('reading the API', () => {
  it('maps a good content answer by section key', async () => {
    answer({ page: 'x', sections: [{ pageKey: 'x', sectionKey: 'hero', title: 'T', subtitle: 'S', content: { a: 1 }, sortOrder: 1 }] })
    expect((await fetchPageContent('x')).hero.title).toBe('T')
  })

  it('refuses a malformed or failing answer, so the bundled copy stays', async () => {
    answer({ sections: [{ nope: true }] })
    await expect(fetchPageContent('x')).rejects.toThrow()
    answer({ error: 'x' }, 404)
    await expect(fetchPageContent('x')).rejects.toThrow()
    answer({ plans: [{ slug: 'a' }] })
    await expect(fetchPlans()).rejects.toThrow()
  })

  it('accepts the seed rows as an API answer, and rejects a list with a bad row', async () => {
    answer({ items: seedTypes })
    expect(await fetchWebsiteTypes()).toHaveLength(29)
    answer({ items: seedDesigns })
    expect(await fetchStarterDesigns()).toHaveLength(12)
    answer({ items: seedPresets })
    expect(await fetchBusinessPresets()).toHaveLength(7)
    answer({ items: [...seedTypes, { slug: 'broken' }] })
    expect(await fetchWebsiteTypes()).toBeNull()
    answer({ items: [] })
    expect(await fetchBusinessPresets()).toBeNull()
  })

  it('pages through the layout list and treats an empty library as an error', async () => {
    const row = (slug: string) => ({ slug, name: slug, category: 'health', preview: { theme: {}, header: [], home: [] } })
    const pages = [{ items: [row('a'), row('b')], totalPages: 2 }, { items: [row('c')], totalPages: 2 }]
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(pages.shift()), { status: 200 })))
    expect((await fetchLayoutTemplateList()).map((t) => t.slug)).toEqual(['a', 'b', 'c'])
    answer({ items: [], totalPages: 1 })
    await expect(fetchLayoutTemplateList()).rejects.toThrow()
  })

  it('starts from the built-in site when the API cannot supply a template', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    expect(await loadStartingTemplate('education')).toBe(emergencyTemplate)
    answer({ error: 'none' }, 404)
    expect(await loadStartingTemplate(null)).toBe(emergencyTemplate)
  })

  it('builds a working site from the built-in template', () => {
    const config = buildTemplate(emergencyTemplate)
    expect(config.blocks.length).toBeGreaterThan(1)
    expect(config.header?.length).toBe(1)
  })
})
