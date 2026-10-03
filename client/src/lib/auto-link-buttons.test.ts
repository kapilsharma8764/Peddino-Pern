import { describe, expect, it } from 'vitest'
import type { BlockConfig, PageConfig, SiteConfig } from '@/blocks/types'
import { templates, buildTemplate } from '@/templates/library'
import { walk } from './block-tree'
import { autoLinkButtons, pageForButton } from './auto-link-buttons'
import { resolveLink } from './site-links'

const page = (id: string, name: string, blocks: BlockConfig[] = []): PageConfig => ({ id, name, path: id === 'home' ? '/' : `/${name.toLowerCase()}`, blocks, showInMenu: true })
const pages = [page('home', 'Home'), page('about', 'About'), page('courses', 'Courses'), page('contact', 'Contact'), page('faq', 'FAQ')]

describe('pageForButton', () => {
  it('sends a button to the page its words describe', () => {
    expect(pageForButton('Browse Courses', pages)?.id).toBe('courses')
    expect(pageForButton('Get in touch', pages)?.id).toBe('contact')
    expect(pageForButton('Learn more', pages)?.id).toBe('about')
    expect(pageForButton('Read the FAQ', pages)?.id).toBe('faq')
  })

  it('falls back to Contact for wording it does not recognise', () => {
    expect(pageForButton('Zzz', pages)?.id).toBe('contact')
  })
})

describe('autoLinkButtons', () => {
  const hero: BlockConfig = { id: 'h', type: 'hero', variant: 'centered', props: { primaryCta: 'Browse Courses', secondaryCta: 'Get in touch', secondaryCtaUrl: 'https://example.com' } }
  const site: SiteConfig = { name: 'x', pages: [{ ...pages[0], blocks: [hero] }, ...pages.slice(1)], blocks: [hero] }

  it('links a button that has no destination, by page id', () => {
    const linked = autoLinkButtons(site).pages![0].blocks[0]
    expect(linked.props.primaryCtaUrl).toBe('page:courses')
    expect(resolveLink('page:courses', pages).pageId).toBe('courses')
  })

  it('leaves a destination that is already set', () => {
    expect(autoLinkButtons(site).pages![0].blocks[0].props.secondaryCtaUrl).toBe('https://example.com')
  })

  it('does nothing to a one-page site', () => {
    expect(autoLinkButtons({ ...site, pages: [pages[0]] })).toEqual({ ...site, pages: [pages[0]] })
  })
})

describe('page: links', () => {
  it('follow the page through a rename and export as its file', () => {
    const renamed = pages.map((p) => (p.id === 'courses' ? { ...p, name: 'Programs', path: '/programs' } : p))
    expect(resolveLink('page:courses', renamed).href).toBe('/programs')
    expect(resolveLink('page:courses', renamed, '', true).href).toBe('programs.html')
    expect(resolveLink('page:courses#fees', renamed).href).toBe('/programs#fees')
    expect(resolveLink('page:gone', renamed).href).toBe('#')
  })
})

describe('every template', () => {
  it('opens a real page from each of its buttons', () => {
    const dead: string[] = []
    for (const template of templates) {
      const built = buildTemplate(template)
      const all = [...(built.header ?? []), ...(built.footer ?? []), ...built.pages!.flatMap((p) => p.blocks)]
      for (const block of walk(all)) {
        for (const [text, url] of [['ctaText', 'ctaUrl'], ['primaryCta', 'primaryCtaUrl'], ['secondaryCta', 'secondaryCtaUrl'], ['buttonText', 'buttonUrl']]) {
          if (typeof block.props[text] === 'string' && block.props[text] && resolveLink(String(block.props[url] ?? ''), built.pages!).href === '#') {
            dead.push(`${template.id}: ${block.type} "${block.props[text]}"`)
          }
        }
      }
    }
    expect(dead).toEqual([])
  })
})
