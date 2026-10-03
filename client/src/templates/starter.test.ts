import { describe, it, expect } from 'vitest'
import { missingStarterPages, pageRoles, starterPageBlocks, starterSite } from './starter'
import { exportSitePages } from '@/lib/export-html'
import { blockMetadata } from '@/lib/block-metadata'
import { walk } from '@/lib/block-tree'
import { emptyProfile } from '@/onboarding/profile'

/**
 * The website a new project starts from.
 *
 * This replaces the old catalogue and gallery tests, which checked a generator
 * that no longer exists. What matters now is narrower and more honest: the one
 * starting layout has to be a complete, working website — real sections, a
 * shared header and footer, a menu that leads somewhere, and no half-filled
 * widget — because it is what every new site begins as.
 *
 * The checks on the published output are kept from the old template QA, since
 * a design can be perfectly valid JSON and still be a bad website.
 */

const profile = {
  ...emptyProfile,
  category: 'education' as const,
  name: 'Sharma Coaching',
  contact: { ...emptyProfile.contact, mobile: '9876543210', email: 'hello@example.test' },
}

const site = starterSite(profile)
const published = exportSitePages(site)

describe('the starting website', () => {
  it('opens as a complete multi-page site', () => {
    expect(site.pages?.length).toBe(pageRoles.length + 1)
    for (const page of site.pages ?? []) {
      expect(page.blocks.length, `${page.name} is empty`).toBeGreaterThan(0)
    }
  })

  it('shares one header and one footer across the pages', () => {
    expect(site.header?.some((block) => block.type === 'navbar')).toBe(true)
    expect(site.footer?.some((block) => block.type === 'footer')).toBe(true)

    // Lifted out, not copied: a page carrying its own navbar would show two.
    for (const page of site.pages ?? []) {
      const types = page.blocks.map((block) => block.type)
      expect(types, `${page.name} repeats the navbar`).not.toContain('navbar')
      expect(types, `${page.name} repeats the footer`).not.toContain('footer')
    }
  })

  it('points the menu at every page that exists', () => {
    const navbar = site.header?.find((block) => block.type === 'navbar')
    const links = (navbar?.props.links as string[] | undefined) ?? []
    for (const page of site.pages ?? []) {
      expect(links, `the menu is missing ${page.name}`).toContain(page.name)
    }
  })

  it('carries the business own details, not sample ones', () => {
    const text = JSON.stringify(site)
    expect(text).toContain('Sharma Coaching')
  })

  it('gives every block a unique id', () => {
    const ids = [
      ...(site.header ?? []),
      ...(site.footer ?? []),
      ...(site.pages ?? []).flatMap((page) => page.blocks),
    ].flatMap((block) => walk([block]).map((entry) => entry.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('builds a fresh set of blocks each time, so two sites never share one', () => {
    const first = starterSite(profile)
    const second = starterSite(profile)
    const firstIds = new Set(first.pages!.flatMap((page) => page.blocks.map((b) => b.id)))
    for (const page of second.pages!) {
      for (const block of page.blocks) {
        expect(firstIds.has(block.id), 'two sites share a block id').toBe(false)
      }
    }
  })

  it('uses only widgets the renderer knows, in variants they have', () => {
    const blocks = [
      ...(site.header ?? []),
      ...(site.footer ?? []),
      ...(site.pages ?? []).flatMap((page) => page.blocks),
    ]
    for (const block of blocks) {
      const meta = blockMetadata.find((entry) => entry.type === block.type)
      expect(meta, `unregistered widget ${block.type}`).toBeTruthy()
      expect(
        meta!.variants.includes(block.variant),
        `${block.type} has no variant "${block.variant}"`,
      ).toBe(true)
      expect(Object.keys(block.props).length, `${block.type} has no content`).toBeGreaterThan(0)
    }
  })
})

describe('the pages it can add', () => {
  it('gives every kind of page a starting layout', () => {
    for (const role of ['about', 'services', 'contact', 'team', 'faq', 'pricing', 'gallery'] as const) {
      expect(starterPageBlocks(role).length, `${role} starts empty`).toBeGreaterThan(0)
    }
  })

  it('offers only the usual pages a site does not already have', () => {
    expect(missingStarterPages([]).map((page) => page.name)).toEqual([
      'About',
      'Services',
      'Contact',
    ])
    expect(
      missingStarterPages([{ name: 'About us', path: '/about-us' }]).map((page) => page.name),
    ).toEqual(['Services', 'Contact'])
    expect(missingStarterPages(site.pages ?? [])).toEqual([])
  })
})

describe('the starting website, published', () => {
  it('publishes every page', () => {
    expect(published.length).toBe(site.pages?.length)
    for (const page of published) {
      expect(page.html.length, `${page.file} is empty`).toBeGreaterThan(2000)
    }
  })

  it('puts a menu and a footer on every published page', () => {
    for (const page of published) {
      expect(page.html, `${page.file} has no menu`).toContain('<nav')
      expect(page.html, `${page.file} has no footer`).toContain('<footer')
    }
  })

  it('never publishes placeholder copy', () => {
    const banned = /lorem ipsum|your headline here|placeholder text|tbd|todo/i
    for (const page of published) {
      expect(banned.test(page.html), `${page.file} shows placeholder copy`).toBe(false)
    }
  })

  it('never publishes a broken image tag', () => {
    for (const page of published) {
      expect(/<img[^>]+src=["']["']/.test(page.html), `${page.file} has an empty image`).toBe(false)
      expect(/src=["']undefined["']/.test(page.html), `${page.file} has an undefined src`).toBe(
        false,
      )
    }
  })

  it('asks the image host for a sized, compressed photo', () => {
    for (const page of published) {
      // Attribute values arrive HTML-escaped, so &w= reads as &amp;w=.
      const markup = page.html.replace(/&amp;/g, '&')
      for (const url of markup.match(/https:\/\/images\.unsplash\.com\/[^"'\s)]+/g) ?? []) {
        expect(url, `${page.file} requests a full-size photo`).toContain('auto=format')
        expect(url, `${page.file} requests an unsized photo`).toMatch(/[?&]w=\d+/)
      }
    }
  })
})
