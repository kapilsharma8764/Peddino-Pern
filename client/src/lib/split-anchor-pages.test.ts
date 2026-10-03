// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { splitAnchorPages } from './split-anchor-pages'
import type { BlockConfig, PageConfig } from '@/blocks/types'

/**
 * A one-page template whose nav scrolls to sections on itself — the shape
 * real free templates ship in. Splitting it should turn "Service", "Works",
 * "Clients" and "Contact" into real pages, each carrying the header and
 * footer, while Home keeps the hero and loses the sections that moved out.
 */
const ONE_PAGE_HTML = `<!doctype html><html><head><title>Studio</title></head><body>
  <header><nav>
    <a href="#home">Home</a>
    <a href="#about">About</a>
    <a href="#service">Service</a>
    <a href="#works">Works</a>
    <a href="#clients">Clients</a>
    <a href="#contact">Contact</a>
  </nav></header>
  <section id="home"><h1>Welcome</h1><p>We build things.</p></section>
  <section id="about"><h2>About us</h2><p>A small studio.</p></section>
  <section id="service"><h2>What we do</h2><p>Design and build websites.</p></section>
  <section id="works"><h2>Our work</h2><p>Some recent projects.</p></section>
  <section id="clients"><h2>Clients</h2><p>Who we work with.</p></section>
  <section id="contact"><h2>Get in touch</h2><p>Say hello.</p></section>
  <footer><p>&copy; Studio</p></footer>
</body></html>`

function homePage(html: string): PageConfig {
  const block: BlockConfig = {
    id: 'home-block', type: 'html-embed', variant: 'original',
    props: { title: 'Home', html, sourceUrl: 'https://example.test/index.html', originalTemplate: true, height: 1000 },
  }
  return { id: 'home', name: 'Home', path: '/', showInMenu: true, blocks: [block] }
}

describe('splitAnchorPages', () => {
  it('turns each nav-linked section into its own page, header and footer intact', () => {
    const pages = splitAnchorPages(homePage(ONE_PAGE_HTML), 'https://example.test/index.html')
    expect(pages).not.toBeNull()
    const names = pages!.map((page) => page.name)
    expect(names).toEqual(['Home', 'About', 'Service', 'Works', 'Clients', 'Contact'])

    const service = pages!.find((page) => page.name === 'Service')!
    const serviceHtml = String(service.blocks[0].props.html)
    expect(serviceHtml).toContain('What we do')
    expect(serviceHtml).not.toContain('Our work')
    expect(serviceHtml).toContain('<header>')
    expect(serviceHtml).toContain('<footer>')
    // Its own copy of the nav should point at real pages now, not anchors.
    expect(serviceHtml).toContain('href="/works"')

    const home = pages![0]
    const homeHtml = String(home.blocks[0].props.html)
    expect(homeHtml).toContain('Welcome')
    expect(homeHtml).not.toContain('What we do')
    expect(homeHtml).toContain('href="/service"')
  })

  it('leaves a genuinely single-section page alone', () => {
    const html = `<!doctype html><html><body><header><nav><a href="#home">Home</a></nav></header><section id="home"><h1>Hi</h1></section><footer></footer></body></html>`
    expect(splitAnchorPages(homePage(html), 'https://example.test/index.html')).toBeNull()
  })
})
