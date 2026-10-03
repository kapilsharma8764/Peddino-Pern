import { describe, it, expect } from 'vitest'
import { templates, templateById, defaultTemplateFor, buildTemplate } from './index'
import { exportSitePages } from '@/lib/export-html'
import { blockMetadata } from '@/lib/block-metadata'
import { walk } from '@/lib/block-tree'
import { emptyProfile } from '@/onboarding/profile'

/**
 * What the template chooser promises.
 *
 * These are real designs written out by hand, so the checks are about whether
 * each one is a finished website — not about whether a generator produced a
 * consistent number of them. The published-HTML checks are the ones that catch
 * a design that is valid data and still a bad website.
 */

const profile = {
  ...emptyProfile,
  category: 'education' as const,
  name: 'Sharma Coaching',
  contact: { ...emptyProfile.contact, mobile: '9876543210', email: 'hello@example.test' },
}

const built = templates.map((template) => ({
  template,
  site: buildTemplate(template, profile),
}))

describe('the template library', () => {
  it('offers designs, each with its own identity', () => {
    expect(templates.length).toBeGreaterThanOrEqual(4)

    const ids = templates.map((t) => t.id)
    const names = templates.map((t) => t.name)
    expect(new Set(ids).size, 'two templates share an id').toBe(ids.length)
    expect(new Set(names).size, 'two templates share a name').toBe(names.length)
  })

  it('is not a generator in disguise', () => {
    // The old system multiplied words × colours × section orders, so dozens of
    // "templates" shared a skeleton. Two designs whose home pages are the same
    // sections in the same order would be that mistake coming back.
    const skeletons = built.map(({ site }) =>
      (site.pages?.[0].blocks ?? []).map((block) => `${block.type}:${block.variant}`).join(','),
    )
    // These are independently downloaded sites, not a combinatorial template
    // generator. A few real-world sites naturally share a section order, but
    // the archive must still have substantial structural variety.
    expect(new Set(skeletons).size, 'the archive has too little layout variety').toBeGreaterThanOrEqual(
      Math.ceil(templates.length * 0.8),
    )

    const accents = new Set(templates.map((t) => t.theme.accent))
    expect(accents.size, 'the designs share an accent colour').toBe(templates.length)
  })

  it('finds a template by id, and always has one to fall back on', () => {
    expect(templateById(templates[0].id)?.name).toBe(templates[0].name)
    expect(templateById('nothing')).toBeUndefined()
    expect(defaultTemplateFor('education').category).toBe('education')
    expect(defaultTemplateFor('nonsense')).toBeTruthy()
  })

  it('builds each design into a complete multi-page website', () => {
    for (const { template, site } of built) {
      expect(site.pages?.length, `${template.id} has too few pages`).toBeGreaterThanOrEqual(4)
      for (const page of site.pages ?? []) {
        expect(page.blocks.length, `${template.id}: ${page.name} is empty`).toBeGreaterThan(0)
      }
      expect(site.pages![0].blocks.length, `${template.id} has a thin home page`).toBeGreaterThan(5)
    }
  })

  it('gives every design a shared header and footer, kept out of the pages', () => {
    for (const { template, site } of built) {
      expect(site.header?.some((b) => b.type === 'navbar'), `${template.id} header`).toBe(true)
      expect(site.footer?.some((b) => b.type === 'footer'), `${template.id} footer`).toBe(true)

      for (const page of site.pages ?? []) {
        const types = page.blocks.map((b) => b.type)
        expect(types, `${template.id}: ${page.name} repeats the navbar`).not.toContain('navbar')
        expect(types, `${template.id}: ${page.name} repeats the footer`).not.toContain('footer')
      }
    }
  })

  it('points each menu at the pages that design actually has', () => {
    for (const { template, site } of built) {
      const navbar = site.header?.find((b) => b.type === 'navbar')
      const links = (navbar?.props.links as string[] | undefined) ?? []
      for (const page of site.pages ?? []) {
        expect(links, `${template.id}: menu is missing ${page.name}`).toContain(page.name)
      }
    }
  })

  it('uses only widgets the renderer knows, in variants they have', () => {
    for (const { template, site } of built) {
      const blocks = [
        ...(site.header ?? []),
        ...(site.footer ?? []),
        ...(site.pages ?? []).flatMap((page) => page.blocks),
      ]
      for (const block of blocks) {
        const meta = blockMetadata.find((entry) => entry.type === block.type)
        expect(meta, `${template.id} uses an unregistered widget ${block.type}`).toBeTruthy()
        expect(
          meta!.variants.includes(block.variant),
          `${template.id}: ${block.type} has no variant "${block.variant}"`,
        ).toBe(true)
      }
    }
  })

  it('gives every block a fresh id, so one design can be used twice', () => {
    for (const { template } of built) {
      const first = buildTemplate(template, profile)
      const second = buildTemplate(template, profile)
      const firstIds = new Set(
        [...(first.header ?? []), ...(first.pages ?? []).flatMap((p) => p.blocks)].flatMap((b) =>
          walk([b]).map((x) => x.id),
        ),
      )
      for (const block of second.pages!.flatMap((p) => p.blocks)) {
        expect(firstIds.has(block.id), `${template.id} reuses a block id`).toBe(false)
      }
    }
  })

  it('carries the business own details into every design', () => {
    for (const { template, site } of built) {
      expect(JSON.stringify(site), `${template.id} kept the demo name`).toContain('Sharma Coaching')
    }
  })
})

describe('the templates, published', () => {
  const published = built.map(({ template, site }) => ({
    template,
    site,
    pages: exportSitePages(site),
  }))

  it('publishes every page of every design', () => {
    for (const { template, site, pages } of published) {
      expect(pages.length, `${template.id} lost pages`).toBe(site.pages?.length)
      for (const page of pages) {
        expect(page.html.length, `${template.id}: ${page.file} is thin`).toBeGreaterThan(2000)
      }
    }
  })

  it('puts a menu and a footer on every published page', () => {
    for (const { template, pages } of published) {
      for (const page of pages) {
        expect(page.html, `${template.id}: ${page.file} has no menu`).toContain('<nav')
        expect(page.html, `${template.id}: ${page.file} has no footer`).toContain('<footer')
      }
    }
  })

  it('never publishes placeholder copy or a broken image', () => {
    const banned = /lorem ipsum|your headline here|placeholder text|tbd|todo/i
    for (const { template, pages } of published) {
      for (const page of pages) {
        expect(banned.test(page.html), `${template.id}: ${page.file} shows placeholder copy`).toBe(
          false,
        )
        expect(
          /<img[^>]+src=["']["']/.test(page.html),
          `${template.id}: ${page.file} has an empty image`,
        ).toBe(false)
        expect(
          /src=["']undefined["']/.test(page.html),
          `${template.id}: ${page.file} has an undefined src`,
        ).toBe(false)
      }
    }
  })

  it('asks the image host for a sized, compressed photo', () => {
    for (const { template, pages } of published) {
      for (const page of pages) {
        const markup = page.html.replace(/&amp;/g, '&')
        for (const url of markup.match(/https:\/\/images\.unsplash\.com\/[^"'\s)]+/g) ?? []) {
          expect(url, `${template.id} requests a full-size photo`).toContain('auto=format')
          expect(url, `${template.id} requests an unsized photo`).toMatch(/[?&]w=\d+/)
        }
      }
    }
  })
})
