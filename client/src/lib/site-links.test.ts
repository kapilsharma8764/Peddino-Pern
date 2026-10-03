import { describe, it, expect } from 'vitest'
import { pageFileName, pageHref, resolveLink } from './site-links'
import type { PageConfig } from '@/blocks/types'

const pages: PageConfig[] = [
  { id: 'home', name: 'Home', path: '/', blocks: [] },
  { id: 'about', name: 'About Us', path: '/about-us', blocks: [] },
  { id: 'services', name: 'Services', path: '/services', blocks: [] },
]

describe('resolveLink', () => {
  it('matches a menu word to the page of that name', () => {
    // This is the whole point: menus are typed as words, not URLs.
    expect(resolveLink('Services', pages).pageId).toBe('services')
    expect(resolveLink('About Us', pages).pageId).toBe('about')
  })

  it('ignores case and punctuation when matching', () => {
    expect(resolveLink('about us', pages).pageId).toBe('about')
    expect(resolveLink('ABOUT-US', pages).pageId).toBe('about')
  })

  it('sends the home page to the root, not to /home', () => {
    expect(resolveLink('Home', pages).href).toBe('/')
    expect(resolveLink('Home', pages, '/site/acme').href).toBe('/site/acme')
  })

  it('puts other pages under the site address', () => {
    expect(resolveLink('Services', pages, '/site/acme').href).toBe('/site/acme/services')
  })

  it('leaves an address the person typed alone', () => {
    expect(resolveLink('https://example.com', pages).external).toBe(true)
    expect(resolveLink('mailto:hi@example.com', pages).href).toBe('mailto:hi@example.com')
    expect(resolveLink('tel:9876543210', pages).href).toBe('tel:9876543210')
    expect(resolveLink('#contact', pages).href).toBe('#contact')
  })

  it('adds the scheme to a bare domain', () => {
    expect(resolveLink('example.com', pages).href).toBe('https://example.com')
  })

  it('goes nowhere rather than somewhere wrong when nothing matches', () => {
    // Usually a page the owner has not made yet.
    expect(resolveLink('Careers', pages).href).toBe('#')
    expect(resolveLink('', pages).href).toBe('#')
  })
})

describe('pageHref and pageFileName', () => {
  it('treats the first page as the front door', () => {
    expect(pageHref(pages[0], pages)).toBe('/')
    expect(pageFileName(pages[0], pages)).toBe('index.html')
  })

  it('names the rest after their path', () => {
    expect(pageHref(pages[1], pages)).toBe('/about-us')
    expect(pageFileName(pages[1], pages)).toBe('about-us.html')
  })
})

describe('links in a site saved to disk', () => {
  // Downloaded pages sit next to each other in a folder and are opened
  // straight from it, so "/about-us" would point at the root of the disk.
  it('points menu links at file names', () => {
    expect(resolveLink('About Us', pages, '', true).href).toBe('about-us.html')
    expect(resolveLink('Services', pages, '', true).href).toBe('services.html')
  })

  it('sends the home link to index.html rather than to a slash', () => {
    expect(resolveLink('Home', pages, '', true).href).toBe('index.html')
    expect(pageHref(pages[0], pages, '', true)).toBe('index.html')
  })

  it('leaves outside addresses alone', () => {
    expect(resolveLink('https://example.com', pages, '', true).href).toBe('https://example.com')
    expect(resolveLink('tel:+919999999999', pages, '', true).href).toBe('tel:+919999999999')
  })

  it('still writes site addresses when saving to disk is not asked for', () => {
    expect(resolveLink('About Us', pages).href).toBe('/about-us')
  })
})
