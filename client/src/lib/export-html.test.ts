import { describe, it, expect } from 'vitest'
import { exportSitePages, exportSiteToHTML } from './export-html'
import { starterSite } from '@/templates/starter'
import { ensurePages, splitHeaderFooter, syncMenu } from '@/store/site-shape'
import { blockMetadata } from './block-metadata'
import { newId } from './id'
import type { SiteConfig } from '@/blocks/types'

/** A published site, shaped the way the editor shapes it before publishing. */
function publishedHtml(options?: Parameters<typeof exportSiteToHTML>[1]) {
  const config = syncMenu(splitHeaderFooter(starterSite()))
  return exportSiteToHTML(config, options)
}


/**
 * A one-section site built around the widget under test.
 *
 * These checks used to fish a hero, an FAQ or a slider out of whichever
 * template happened to contain one. That made them quietly dependent on the
 * template catalogue: change the catalogue and the test either breaks or, worse,
 * silently stops covering the widget. Naming the section here keeps each test
 * about the thing it claims to be about.
 */
function siteWith(type: string, props: Record<string, unknown> = {}): SiteConfig {
  const meta = blockMetadata.find((entry) => entry.type === type)
  if (!meta) throw new Error(`no widget ${type}`)
  return {
    name: 'Fixture',
    blocks: [
      {
        id: newId(`block-${type}`),
        type: meta.type,
        variant: meta.variants[0],
        props: { ...structuredClone(meta.defaultProps), ...props },
      },
    ],
  }
}

describe('exportSiteToHTML', () => {
  it('produces a complete document', () => {
    const html = publishedHtml()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('</html>')
  })

  it('includes the shared header and footer around the page', () => {
    // The header and footer live outside the page's block list, so publishing
    // has to put them back or every published site loses its navigation.
    const html = publishedHtml()
    const nav = html.indexOf('<nav')
    const footer = html.lastIndexOf('<footer')
    expect(nav, 'no header in the published page').toBeGreaterThan(-1)
    expect(footer, 'no footer in the published page').toBeGreaterThan(nav)
  })

  it('wires the contact form to the enquiry endpoint', () => {
    const html = publishedHtml({
      leadsEndpoint: 'http://localhost:8001/api/leads',
      siteId: 'site-123',
    })
    expect(html).toContain('data-enquiry-form')
    expect(html).toContain('http://localhost:8001/api/leads')
    expect(html).toContain('data-site="site-123"')
    // The old markup swallowed the submit and did nothing.
    expect(html).not.toContain('onsubmit="return false"')
  })

  it('names the form fields the API expects', () => {
    const html = publishedHtml({ leadsEndpoint: '/api/leads' })
    for (const field of ['name="name"', 'name="phone"', 'name="email"', 'name="message"']) {
      expect(html, `form is missing ${field}`).toContain(field)
    }
  })

  it('applies a section’s styling to the published markup', () => {
    const config = syncMenu(splitHeaderFooter(starterSite()))
    const [first] = config.blocks
    first.style = { background: '#123456', paddingTop: 88 }

    const html = exportSiteToHTML(config)
    expect(html).toContain('background:#123456')
    expect(html).toContain('padding-top:88px')
  })

  it('leaves out a hidden section', () => {
    const config = siteWith('faq')
    const [faq] = config.blocks

    const before = exportSiteToHTML(config)
    faq.style = { hidden: true }
    const after = exportSiteToHTML(config)

    expect(after.length).toBeLessThan(before.length)
  })

  it('knows how to publish every widget in the library', () => {
    // The failure this guards against is quiet and nasty: a widget appears in
    // the editor, the owner builds a page around it, and it is simply missing
    // from the published site.
    for (const meta of blockMetadata) {
      const config: SiteConfig = {
        name: 'Coverage',
        blocks: [
          {
            id: newId('block'),
            type: meta.type,
            variant: meta.variants[0],
            props: { ...meta.defaultProps },
          },
        ],
      }
      const html = exportSiteToHTML(config)
      expect(html, `${meta.type} is not rendered when publishing`).not.toContain(
        `Unknown block type: ${meta.type}`,
      )
    }
  })

  it('publishes the hero photograph', () => {
    // The layout that leads with a photo is the one most templates use, and
    // an export that dropped the image would leave a dark empty band.
    const photo = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&w=1200'
    const config = siteWith('hero', { image: photo })

    const html = exportSiteToHTML(config)
    // Compared without the query string: the ampersands in it are escaped in
    // the markup, which is correct and would make a literal match fail.
    expect(html).toContain(photo.split('?')[0])
  })

  it('publishes real icons, not the first letter of their name', () => {
    // The old export drew "S" in a box where the editor drew a pair of
    // scissors, which is the kind of difference nobody notices until a
    // customer opens the live site.
    const config = siteWith('features', {
      items: [{ icon: 'Scissors', title: 'Haircuts', description: 'Walk in any day.' }],
    })
    const html = exportSiteToHTML(config)

    expect(html).toContain('lucide-scissors')
    expect(html).not.toContain('font-family="system-ui, sans-serif"')
  })

  it('publishes a working slider, not a stack of stuck photos', () => {
    // The slides are stacked and cross-faded, so without the script the
    // published page would show the first one for ever.
    const config = siteWith('slider', {
      slides: [
        { image: 'https://images.unsplash.com/photo-1?auto=format&w=1200', heading: 'One' },
        { image: 'https://images.unsplash.com/photo-2?auto=format&w=1200', heading: 'Two' },
      ],
    })
    expect((config.blocks[0].props.slides as unknown[]).length).toBeGreaterThan(1)

    const html = exportSiteToHTML(config)
    expect(html).toContain('data-slider')
    expect(html).toContain('data-slide')
    expect(html).toContain('data-next')
    // The behaviour has to reach the page, or the arrows do nothing.
    expect(html).toContain("querySelectorAll('[data-slider]')")
  })

  it('renders the starting site without throwing', () => {
    const config = syncMenu(splitHeaderFooter(starterSite()))
    expect(() => exportSiteToHTML(config), 'the starting site failed to export').not.toThrow()
  })
})

describe('exportSitePages', () => {
  function multiPage() {
        const config = syncMenu(splitHeaderFooter(starterSite()))
    const pages = ensurePages(config)
    // syncMenu again once the pages exist, the way addPage does in the editor —
    // otherwise the menu still lists only the page that was there first.
    return syncMenu({
      ...config,
      pages: [
        pages[0],
        { id: 'about', name: 'About', path: '/about', blocks: pages[0].blocks.slice(0, 2), showInMenu: true },
        { id: 'services', name: 'Services', path: '/services', blocks: pages[0].blocks.slice(0, 1), showInMenu: true },
      ],
    })
  }

  it('publishes every page, not only the one that is open', () => {
    // A site with an About and a Services page used to go live as a home page
    // and nothing else.
    const exported = exportSitePages(multiPage())
    expect(exported.map((p) => p.name)).toEqual(['Home', 'About', 'Services'])
  })

  it('puts the home page at the root and names the rest', () => {
    const exported = exportSitePages(multiPage())
    expect(exported[0].slug).toBe('')
    expect(exported[0].file).toBe('index.html')
    expect(exported[1].slug).toBe('about')
    expect(exported[1].file).toBe('about.html')
  })

  it('gives every page the shared header and footer', () => {
    for (const page of exportSitePages(multiPage())) {
      expect(page.html, `${page.name} has no header`).toContain('<nav')
      expect(page.html, `${page.name} has no footer`).toContain('<footer')
    }
  })

  it('writes menu links that point at the other pages', () => {
    const exported = exportSitePages(multiPage(), { base: '/site/acme' })
    // The menu is the same on every page, so checking the home page is enough.
    expect(exported[0].html).toContain('href="/site/acme/about"')
    expect(exported[0].html).toContain('href="/site/acme/services"')
    // And the home item goes to the site root, not to /home.
    expect(exported[0].html).toContain('href="/site/acme"')
  })

  it('titles each page after itself', () => {
    const exported = exportSitePages(multiPage())
    expect(exported[1].html).toContain('<title>About')
  })
})

describe('saving the whole site to disk', () => {
  it('writes one file per page, with the home page as index.html', () => {
    const config: SiteConfig = {
      name: 'Sharma Classes',
      blocks: [],
      pages: [
        { id: 'home', name: 'Home', path: '/', blocks: [{ id: newId('block'), type: 'hero', variant: 'centered', props: { title: 'Welcome' } }] },
        { id: 'about', name: 'About', path: '/about', blocks: [{ id: newId('block'), type: 'content', variant: 'prose', props: { body: 'Our story' } }] },
      ],
    }

    const exported = exportSitePages(config, { fileLinks: true })
    expect(exported.map((page) => page.file)).toEqual(['index.html', 'about.html'])
    expect(exported[1].html).toContain('Our story')
  })

  it('links the pages to each other by file name', () => {
    // Opened from a folder, "/about" is the root of the disk, not a page.
    const config: SiteConfig = {
      name: 'Sharma Classes',
      blocks: [],
      pages: [
        {
          id: 'home',
          name: 'Home',
          path: '/',
          blocks: [{ id: newId('block'), type: 'navbar', variant: 'default', props: { brand: 'Sharma', links: ['Home', 'About'] } }],
        },
        { id: 'about', name: 'About', path: '/about', blocks: [] },
      ],
    }

    const home = exportSitePages(config, { fileLinks: true })[0].html
    expect(home).toContain('href="about.html"')
    expect(home).not.toContain('href="/about"')
  })
})

describe('product cards on a published page', () => {
  it('pins each photograph inside its frame', () => {
    // Left in the normal flow a photograph grows its box to its own height,
    // so a row of cards came out at ragged heights on the published page even
    // though the editor showed them even.
    const config: SiteConfig = {
      name: 'Menu',
      blocks: [{
        id: newId('block'),
        type: 'products',
        variant: 'cards',
        props: {
          title: 'What we serve',
          items: [
            { image: 'https://example.com/a.jpg', name: 'Dal Makhani', description: 'Overnight.', price: '280' },
            { image: 'https://example.com/b.jpg', name: 'Biryani', description: 'On dum.', price: '390' },
          ],
        },
      }],
    }

    const html = exportSiteToHTML(config)
    expect(html).toContain('aspect-ratio:4/3')
    for (const image of html.match(/<img[^>]*example\.com[^>]*>/g) ?? []) {
      expect(image, 'a product photo is not pinned to its frame').toContain('position:absolute')
      expect(image).toContain('object-fit:cover')
      expect(image).toContain('object-position:center')
    }
    expect(html).toContain('Dal Makhani')
    expect(html).toContain('280')
  })
})
