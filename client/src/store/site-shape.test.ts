import { describe, it, expect } from 'vitest'
import {
  ensurePages,
  mutateRegion,
  pathFromName,
  regionBlocks,
  regionOfBlock,
  splitHeaderFooter,
  syncMenu,
} from './site-shape'
import { starterSite } from '@/templates/starter'
import type { BlockConfig, SiteConfig } from '@/blocks/types'

function block(id: string, type: BlockConfig['type']): BlockConfig {
  return { id, type, variant: 'default', props: {} }
}

const flat: SiteConfig = {
  name: 'Test',
  blocks: [
    block('nav', 'navbar'),
    block('hero', 'hero'),
    block('stats', 'stats'),
    block('foot', 'footer'),
  ],
}

describe('splitHeaderFooter', () => {
  it('lifts the navbar and footer out of the page', () => {
    const site = splitHeaderFooter(flat)
    expect(site.header?.map((b) => b.id)).toEqual(['nav'])
    expect(site.footer?.map((b) => b.id)).toEqual(['foot'])
    expect(ensurePages(site)[0].blocks.map((b) => b.id)).toEqual(['hero', 'stats'])
  })

  it('keeps a top banner with the header', () => {
    const withBanner = splitHeaderFooter({
      ...flat,
      blocks: [block('bar', 'banner'), ...flat.blocks],
    })
    expect(withBanner.header?.map((b) => b.id)).toEqual(['bar', 'nav'])
  })

  it('leaves a site that is already split alone', () => {
    const once = splitHeaderFooter(flat)
    const twice = splitHeaderFooter(once)
    expect(twice.header).toEqual(once.header)
    expect(twice.footer).toEqual(once.footer)
    expect(ensurePages(twice)[0].blocks).toEqual(ensurePages(once)[0].blocks)
  })

  it('never leaves a second header on other pages', () => {
    const multi: SiteConfig = {
      name: 'Test',
      blocks: flat.blocks,
      pages: [
        { id: 'home', name: 'Home', path: '/', blocks: flat.blocks },
        { id: 'about', name: 'About', path: '/about', blocks: [...flat.blocks] },
      ],
    }
    const site = splitHeaderFooter(multi)
    for (const page of ensurePages(site)) {
      expect(page.blocks.some((b) => b.type === 'navbar')).toBe(false)
      expect(page.blocks.some((b) => b.type === 'footer')).toBe(false)
    }
  })

  it('splits every shipped template into a header, a page and a footer', () => {
    {
      const site = splitHeaderFooter(starterSite())
      expect(site.header?.length, 'the starting site has no header').toBeGreaterThan(0)
      expect(site.footer?.length, 'the starting site has no footer').toBeGreaterThan(0)
      expect(ensurePages(site)[0].blocks.length, 'the starting page is empty').toBeGreaterThan(0)
    }
  })
})

describe('regions', () => {
  const site = splitHeaderFooter(flat)

  it('knows which region a block lives in', () => {
    expect(regionOfBlock(site, 'nav', 'page-home')).toBe('header')
    expect(regionOfBlock(site, 'foot', 'page-home')).toBe('footer')
    expect(regionOfBlock(site, 'hero', 'page-home')).toBe('page')
  })

  it('edits the header without touching the page', () => {
    const pageId = ensurePages(site)[0].id
    const next = mutateRegion(site, 'header', pageId, (blocks) => [
      ...blocks,
      block('extra', 'banner'),
    ])
    expect(next.header?.length).toBe(2)
    expect(regionBlocks(next, 'page', pageId)).toEqual(regionBlocks(site, 'page', pageId))
  })
})

describe('syncMenu', () => {
  it('lists every page that opted into the menu', () => {
    const site = syncMenu({
      ...splitHeaderFooter(flat),
      pages: [
        { id: 'home', name: 'Home', path: '/', blocks: [], showInMenu: true },
        { id: 'about', name: 'About', path: '/about', blocks: [], showInMenu: true },
        { id: 'thanks', name: 'Thank you', path: '/thanks', blocks: [], showInMenu: false },
      ],
    })
    expect(site.header?.[0].props.links).toEqual(['Home', 'About'])
  })

  it('does nothing when there is no header to update', () => {
    const site = syncMenu({ name: 'Test', blocks: [], header: [] })
    expect(site.header).toEqual([])
  })
})

describe('pathFromName', () => {
  it('makes a readable address from a page name', () => {
    expect(pathFromName('About')).toBe('/about')
    expect(pathFromName('Our Services')).toBe('/our-services')
    expect(pathFromName('  Contact Us!  ')).toBe('/contact-us')
  })

  it('falls back rather than producing an empty address', () => {
    expect(pathFromName('!!!')).toBe('/page')
  })
})
