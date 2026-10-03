// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { importSiteFromHtml, isFiller } from './import-site'
import { blockMetadata } from './block-metadata'
import type { BlockConfig } from '@/blocks/types'

/**
 * Reading somebody else's website.
 *
 * The point of the import is not that it produces a perfect copy — it cannot,
 * and does not claim to. It is that what comes back is a real, editable site:
 * every section is a widget the editor knows, the words survive, and nothing is
 * silently thrown away. These check exactly that.
 */

function page(body: string, head = '<title>Sharma Coaching</title>') {
  return `<!doctype html><html><head>${head}</head><body>${body}</body></html>`
}

function blocksOf(config: { blocks: BlockConfig[]; header?: BlockConfig[]; footer?: BlockConfig[] }) {
  return [...(config.header ?? []), ...config.blocks, ...(config.footer ?? [])]
}

describe('recognising Latin filler', () => {
  it('knows the difference between filler and real copy', () => {
    expect(isFiller('Lorem ipsum dolor sit amet, consectetur adipiscing')).toBe(true)
    expect(isFiller('We have taught maths in Jaipur since 2011.')).toBe(false)
    expect(isFiller('')).toBe(true)
  })
})

describe('rejecting unrendered templates', () => {
  it('refuses a page that still has Jinja/Django block tags in it', () => {
    const html = page(
      '<section><h1>{% block title %}Spendly{% endblock %}</h1></section>',
      '<title>{% block title %}Spendly{% endblock %}</title>',
    )
    expect(() => importSiteFromHtml(html)).toThrow(/unrendered/i)
  })

  it('imports an ordinary page with no template syntax in it', () => {
    expect(() => importSiteFromHtml(page('<h1>Sharma Coaching Classes</h1>'))).not.toThrow()
  })
})

describe('importing a page', () => {
  it('reads the opening section as a hero', () => {
    const { config } = importSiteFromHtml(
      page(`
        <section>
          <h1>Sharma Coaching Classes</h1>
          <p>Maths and science tuition in Jaipur since 2011, in small batches.</p>
          <a class="btn" href="#">Book a class</a>
          <img src="https://example.test/room.jpg" alt="The classroom">
        </section>`),
    )

    const hero = config.blocks.find((block) => block.type === 'hero')!
    expect(hero.props.headline).toBe('Sharma Coaching Classes')
    expect(String(hero.props.subheadline)).toContain('Jaipur')
    expect(hero.props.primaryCta).toBe('Book a class')
    expect(hero.props.image).toBe('https://example.test/room.jpg')
  })

  it('reads a row of cards as features', () => {
    const { config } = importSiteFromHtml(
      page(`
        <section>
          <h2>What we teach</h2>
          <p>Four subjects, all boards.</p>
          <div><h3>Mathematics</h3><p>Classes six to twelve.</p></div>
          <div><h3>Physics</h3><p>Practical work every week.</p></div>
          <div><h3>Chemistry</h3><p>Small batches only.</p></div>
          <div><h3>Biology</h3><p>Board-focused revision.</p></div>
        </section>`),
    )

    const features = config.blocks.find((block) => block.type === 'features')!
    const items = features.props.items as { title: string; description: string }[]
    expect(features.props.title).toBe('What we teach')
    expect(items.map((item) => item.title)).toContain('Mathematics')
    expect(items[0].description.length).toBeGreaterThan(0)
  })

  it('reads a band of numbers as statistics', () => {
    const { config } = importSiteFromHtml(
      page(`
        <section>
          <div><h3>2,400</h3><p>Students taught</p></div>
          <div><h3>14</h3><p>Years teaching</p></div>
          <div><h3>96%</h3><p>Board pass rate</p></div>
        </section>`),
    )

    const stats = config.blocks.find((block) => block.type === 'stats')!
    const items = stats.props.items as { value: string; label: string }[]
    expect(items.map((item) => item.value)).toEqual(['2,400', '14', '96%'])
    expect(items[0].label).toBe('Students taught')
  })

  it('reads headings that ask questions as an FAQ', () => {
    const { config } = importSiteFromHtml(
      page(`
        <section>
          <h2>Questions</h2>
          <h3>When do batches start?</h3><p>Every April and October.</p>
          <h3>Is there a trial class?</h3><p>Yes, the first one is free.</p>
          <h3>Do you teach online?</h3><p>Only in the evenings.</p>
        </section>`),
    )

    const faq = config.blocks.find((block) => block.type === 'faq')!
    const items = faq.props.items as { question: string; answer: string }[]
    expect(items).toHaveLength(3)
    expect(items[0].question).toBe('When do batches start?')
    expect(items[0].answer).toContain('April')
  })

  it('reads a section with a form as a contact section', () => {
    const { config } = importSiteFromHtml(
      page(`
        <section>
          <h2>Reach us</h2>
          <p>We reply within a day.</p>
          <form><input name="email"><button>Send</button></form>
        </section>`),
    )

    const contact = config.blocks.find((block) => block.type === 'contact')!
    expect(contact.props.title).toBe('Reach us')
  })

  it('reads several pictures as a gallery', () => {
    const { config } = importSiteFromHtml(
      page(`
        <section>
          <h2>Our centre</h2>
          <img src="https://example.test/1.jpg"><img src="https://example.test/2.jpg">
          <img src="https://example.test/3.jpg"><img src="https://example.test/4.jpg">
        </section>`),
    )

    const gallery = config.blocks.find((block) => block.type === 'gallery')!
    expect((gallery.props.images as unknown[]).length).toBe(4)
  })
})

describe('what the import guarantees', () => {
  const { config, report } = importSiteFromHtml(
    page(`
      <nav><a href="/">Home</a><a href="/about">About</a><a href="/fees">Fees</a></nav>
      <section><h1>Sharma Coaching</h1><p>Maths and science tuition in Jaipur.</p></section>
      <section><h2>About us</h2><p>We have taught in the same room since 2011.</p></section>`),
  )

  it('gives the site a shared header and footer', () => {
    expect(config.header?.some((block) => block.type === 'navbar')).toBe(true)
    expect(config.footer?.some((block) => block.type === 'footer')).toBe(true)
  })

  it('rebuilds the menu from the uploaded page links', () => {
    const navbar = (config.header ?? []).find((block) => block.type === 'navbar')!
    expect(navbar.props.links).toContain('About')
    expect(navbar.props.links).toContain('Fees')
  })

  it('names the site after the page title', () => {
    expect(config.name).toBe('Sharma Coaching')
  })

  it('produces only widgets the editor knows, in variants they have', () => {
    for (const block of blocksOf(config)) {
      const meta = blockMetadata.find((entry) => entry.type === block.type)
      expect(meta, `unknown widget ${block.type}`).toBeTruthy()
      expect(
        meta!.variants.includes(block.variant),
        `${block.type} has no variant "${block.variant}"`,
      ).toBe(true)
    }
  })

  it('gives every block its own id', () => {
    const ids = blocksOf(config).map((block) => block.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('says what it recognised', () => {
    expect(report.sections).toBeGreaterThan(0)
    expect(Object.keys(report.recognised)).toContain('hero')
  })
})

describe('when a page is awkward', () => {
  it('handles a page written without section tags', () => {
    const { config } = importSiteFromHtml(
      page(`<main>
        <div><h1>Sharma Coaching</h1><p>Maths and science tuition in Jaipur since 2011.</p></div>
        <div><h2>Fees</h2><p>Two thousand rupees a month, paid termly.</p></div>
      </main>`),
    )
    expect(config.blocks.length).toBeGreaterThan(0)
    expect(JSON.stringify(config)).toContain('Sharma Coaching')
  })

  it('never hands back an empty canvas', () => {
    // An unreadable page must still open as something the owner can edit,
    // or the upload looks as though it silently failed.
    const { config } = importSiteFromHtml(page('<div>Just some loose words on a page.</div>'))
    expect(config.blocks.length).toBeGreaterThan(0)
    expect(JSON.stringify(config)).toContain('loose words')
  })

  it('reports pictures it could not find rather than showing broken ones', () => {
    const { config, report } = importSiteFromHtml(
      page(`<section><h1>Hello</h1><p>A line about the business here.</p>
            <img src="images/hero.jpg"></section>`),
      { resolveImage: (src) => (src.startsWith('http') ? src : '') },
    )

    expect(report.missingImages).toContain('images/hero.jpg')
    const hero = config.blocks.find((block) => block.type === 'hero')!
    expect(hero.props.image).toBe('')
  })

  it('leaves out the theme decoration that carries no words', () => {
    const { config } = importSiteFromHtml(
      page(`
        <section><img src="https://example.test/swirl.png"></section>
        <section><h1>Sharma Coaching</h1><p>Maths and science tuition in Jaipur.</p></section>`),
    )
    expect(config.blocks[0].type).toBe('hero')
  })
})
