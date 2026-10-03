import type { BlockConfig, BlockType, SiteConfig } from '@/blocks/types'
import { newId } from './id'
import { blockMetadata } from './block-metadata'
import { splitHeaderFooter, syncMenu } from '@/store/site-shape'
import { resolveTheme } from './theme-presets'

/**
 * Turns a website somebody already has into one this builder can edit.
 *
 * Somebody arriving with a finished site — a template they bought, a page a
 * previous developer left them — should not have to rebuild it by hand before
 * they can change a phone number. This reads their HTML and works out what each
 * section of it is, then rebuilds the page out of this builder's own widgets so
 * that every part of it is editable in the editor.
 *
 * It is deliberately a translation rather than a copy. Dropping the original
 * markup into an HTML widget would look right and be useless: the owner could
 * not click a heading and change it, which is the entire point of opening it
 * here. So a hero becomes the hero widget, a row of cards becomes the features
 * widget, and anything unrecognised becomes editable prose rather than being
 * silently dropped.
 *
 * The recognition is by content rather than by class name, because the class
 * names in a real template mean nothing to anyone but its author — a hero might
 * be `.masthead`, `.banner`, `.mcb-section-x7fq2` or nothing at all. What does
 * hold across templates is shape: the opening section has the only level-one
 * heading, a statistics band is short numbers with short labels, an FAQ is
 * headings that end in question marks.
 */

export interface ImportedSite {
  config: SiteConfig
  /** What was recognised, for telling the owner what happened. */
  report: {
    sections: number
    recognised: Record<string, number>
    /** Pictures that could not be found in what was uploaded. */
    missingImages: string[]
  }
}

type Kind =
  | 'hero'
  | 'stats'
  | 'faq'
  | 'pricing'
  | 'gallery'
  | 'testimonials'
  | 'features'
  | 'contact'
  | 'image'
  | 'content'

interface Extracted {
  headings: { level: number; text: string }[]
  paragraphs: string[]
  images: { src: string; alt: string }[]
  buttons: string[]
  cards: { title: string; body: string }[]
  hasForm: boolean
  text: string
}

/** Latin filler, which several bought templates ship instead of real copy. */
const FILLER =
  /\b(lorem|ipsum|dolor sit|consectetur|adipiscing|eiusmod|tempor|incididunt|labore|aliqua|vulputate|fringilla|gravida|hendrerit|ultrices|vestibulum|varius|consequat|bibendum|pulvinar|suscipit|sodales|habitasse|posuere|viverra|faucibus|scelerisque|accumsan|tincidunt|molestie|aenean|ligula)\b/gi

export function isFiller(text: string): boolean {
  if (!text.trim()) return true
  const hits = text.match(FILLER)?.length ?? 0
  return hits >= 2 || (hits >= 1 && text.trim().split(/\s+/).length < 8)
}

function clean(text: string, fallback: string): string {
  const trimmed = text.trim()
  return isFiller(trimmed) ? fallback : trimmed
}

const NUMBERY = /^[\d,.]+\s*[+%kKmM]?$/
const PRICE = /(?:[$₹€£]\s?\d[\d,.]*|\b\d+\s*(?:\/\s*mo|per month|a month)\b)/gi

function textOf(node: Element): string {
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim()
}

function extract(section: Element): Extracted {
  const headings = [...section.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .map((node) => ({ level: Number(node.tagName[1]), text: textOf(node) }))
    .filter((h) => h.text)

  const paragraphs = [...section.querySelectorAll('p')]
    .map(textOf)
    .filter((t) => t.length > 2)

  const images: { src: string; alt: string }[] = []
  for (const node of section.querySelectorAll('img')) {
    const src =
      node.getAttribute('src') ||
      node.getAttribute('data-src') ||
      (node.getAttribute('srcset') ?? '').split(',')[0]?.trim().split(' ')[0] ||
      ''
    if (src) images.push({ src, alt: node.getAttribute('alt') ?? '' })
  }
  for (const node of section.querySelectorAll<HTMLElement>('[style*="background-image"]')) {
    const match = /url\(['"]?([^'")]+)/.exec(node.getAttribute('style') ?? '')
    if (match) images.push({ src: match[1], alt: '' })
  }

  const buttons = [...section.querySelectorAll('a')]
    .filter((node) => /\b(btn|button|cta)\b/i.test(node.className || ''))
    .map(textOf)
    .filter((t) => t && t.length < 40)

  // Repeated heading-and-paragraph pairs are what a row of cards is made of.
  const body = headings.length && headings[0].level <= 2 ? headings.slice(1) : headings
  const cards = body.slice(0, 6).map((heading, index) => ({
    title: heading.text,
    body: paragraphs[index + 1] ?? paragraphs[index] ?? '',
  }))

  return {
    headings,
    paragraphs,
    images,
    buttons,
    cards,
    hasForm: section.querySelector('form') !== null,
    text: textOf(section),
  }
}

export function classify(parts: Extracted): Kind | null {
  if (parts.hasForm) return 'contact'
  if (parts.headings.some((h) => h.level === 1)) return 'hero'

  const numbers = parts.headings.filter((h) => NUMBERY.test(h.text.replace(/\s/g, '')))
  if (numbers.length >= 3) return 'stats'

  const questions = parts.headings.filter((h) => h.text.endsWith('?'))
  if (questions.length >= 3) return 'faq'

  if ((parts.text.match(PRICE)?.length ?? 0) >= 3 && parts.headings.length >= 3) return 'pricing'
  if (parts.images.length >= 4 && parts.paragraphs.length <= parts.images.length) return 'gallery'

  const quoted = (parts.text.match(/[“"]/g)?.length ?? 0)
  if (quoted >= 3) return 'testimonials'

  if (parts.headings.length >= 4 && parts.paragraphs.length >= 3) return 'features'
  if (parts.images.length === 1 && parts.paragraphs.length >= 1) return 'image'
  if (parts.headings.length || parts.paragraphs.length) return 'content'
  return null
}

/** Header, footer and decoration are pictures with no words. */
function carriesWords(parts: Extracted): boolean {
  return [...parts.headings.map((h) => h.text), ...parts.paragraphs].some((t) => !isFiller(t))
}

function firstHeading(parts: Extracted, maxLevel = 2, fallback = ''): string {
  const fits = (h: { level: number; text: string }) =>
    !isFiller(h.text) && h.text.length < 90
  return (
    parts.headings.find((h) => h.level <= maxLevel && fits(h))?.text ??
    parts.headings.find(fits)?.text ??
    fallback
  )
}

function firstParagraph(parts: Extracted, fallback = ''): string {
  return parts.paragraphs.find((p) => !isFiller(p) && p.length > 20) ?? fallback
}

const ICONS = ['Star', 'Shield', 'Zap', 'Heart', 'Award', 'Users', 'Clock', 'Check']

function defaults(type: BlockType): Record<string, unknown> {
  const meta = blockMetadata.find((entry) => entry.type === type)
  return meta ? structuredClone(meta.defaultProps) : {}
}

function block(type: BlockType, variant: string, props: Record<string, unknown>): BlockConfig {
  return {
    id: newId(`block-${type}`),
    type,
    variant,
    props: { ...defaults(type), ...props },
  }
}

function toBlock(
  kind: Kind,
  parts: Extracted,
  resolve: (src: string) => string,
): BlockConfig | null {
  const pictures = parts.images
    .map((image) => ({ src: resolve(image.src), alt: clean(image.alt, '') }))
    .filter((image) => image.src)

  const title = firstHeading(parts)
  const body = firstParagraph(parts)

  switch (kind) {
    case 'hero':
      return block('hero', pictures.length ? 'split' : 'centered', {
        headline: firstHeading(parts, 1, 'Welcome'),
        subheadline: body || 'A line about what you do and who you do it for.',
        primaryCta: parts.buttons[0] ?? 'Get in touch',
        secondaryCta: parts.buttons[1] ?? 'Learn more',
        image: pictures[0]?.src ?? '',
      })

    case 'stats': {
      const labels = parts.paragraphs.filter((p) => p.length < 40 && !isFiller(p))
      const items = parts.headings
        .filter((h) => NUMBERY.test(h.text.replace(/\s/g, '')))
        .slice(0, 4)
        .map((h, index) => ({ value: h.text, label: labels[index] ?? 'Total' }))
      return block('stats', 'bar', { title: '', items })
    }

    case 'faq': {
      const answers = parts.paragraphs.filter((p) => !isFiller(p))
      const items = parts.headings
        .filter((h) => h.text.endsWith('?'))
        .slice(0, 6)
        .map((h, index) => ({
          question: h.text,
          answer: answers[index] ?? 'Get in touch and we will explain.',
        }))
      return block('faq', 'accordion', { title: title || 'Common questions', items })
    }

    case 'pricing': {
      const prices = parts.text.match(PRICE) ?? []
      const tiers = parts.cards.slice(0, 3).map((card, index) => ({
        name: clean(card.title, `Plan ${index + 1}`),
        price: prices[index] ?? '',
        period: '',
        features: [] as string[],
        featured: index === 1,
        cta: 'Choose',
      }))
      return block('pricing', 'simple', { title: title || 'Pricing', subtitle: body, tiers })
    }

    case 'gallery':
      return block('gallery', 'grid', {
        title: title || 'Gallery',
        images: pictures.map((picture) => ({ ...picture, caption: '' })),
      })

    case 'testimonials':
      return block('testimonials', 'cards', {
        title: title || 'What people say',
        items: parts.cards.slice(0, 3).map((card, index) => ({
          name: clean(card.title, `Customer ${index + 1}`),
          role: '',
          quote: clean(card.body, 'They were a pleasure to work with.'),
          rating: 5,
        })),
      })

    case 'features': {
      const items = parts.cards.slice(0, 6).map((card, index) => ({
        icon: ICONS[index % ICONS.length],
        title: clean(card.title, `Feature ${index + 1}`),
        description: clean(card.body, 'A line about what this is.'),
      }))
      if (items.length === 0) return null
      return block('features', 'grid', { title: title || 'What we do', subtitle: '', items })
    }

    case 'contact':
      return block('contact', 'form', { title: title || 'Get in touch', subtitle: body })

    case 'image':
      if (!pictures.length) return null
      return block('image', 'side-by-side', {
        title,
        subtitle: body,
        src: pictures[0].src,
        alt: pictures[0].alt,
        imageSide: 'left',
      })

    case 'content': {
      if (!title && !body) return null
      return block('content', 'prose', { body: title ? `## ${title}\n\n${body}` : body })
    }
  }
}

/** The parts of a page that could be sections, in the order they appear. */
function candidates(document: Document): Element[] {
  const explicit = [...document.querySelectorAll('section')]
  if (explicit.length >= 1) return explicit

  // A page written without <section> — the direct children of <main> or <body>
  // are the nearest thing to its sections. Worth looking at if it carries a
  // reasonable amount of prose *or* some pictures: a gallery is four
  // photographs and a two-word heading, and judging it on its text alone threw
  // it away.
  const root = document.querySelector('main') ?? document.body
  if (!root) return []
  return [...root.children].filter(
    (node) => textOf(node).length > 30 || node.querySelectorAll('img').length >= 2,
  )
}

export interface ImportOptions {
  /** Turns a path in the uploaded page into one the browser can load. */
  resolveImage?: (src: string) => string
  /** Name for the site, when the page does not say. */
  fallbackName?: string
}

/**
 * Server-template tags a browser has no reason to strip.
 *
 * `{% block title %}Spendly{% endblock %}` is not HTML the way an unclosed
 * `<div>` is — it is a Jinja, Django, Nunjucks or Twig instruction meant to be
 * replaced by a Python or Node server before the page ever reaches a browser.
 * The uploaded file is a template *source*, not the page it renders into, and
 * the DOM parser has no way to know that: it reads `{% ... %}` as ordinary
 * text and carries it straight into the site's headings and paragraphs. This
 * is caught before parsing, while there is still enough of the raw file left
 * to name the tag that gave it away, rather than surfacing as a page that
 * mysteriously says "endblock" everywhere.
 */
export function detectUnrenderedTemplate(html: string): string | null {
  return /\{%[\s\S]*?%\}/.test(html) ? 'Jinja, Django, Nunjucks or Twig ({% %})' : null
}

/**
 * Reads a page of HTML and returns a site the editor can open.
 *
 * Parsed with the browser's own parser rather than by matching tags with
 * expressions: real templates are full of unclosed tags and stray markup, and
 * the parser handles all of it exactly as a browser would, which is the
 * behaviour anyone uploading a page expects.
 */
export function importSiteFromHtml(html: string, options: ImportOptions = {}): ImportedSite {
  const engine = detectUnrenderedTemplate(html)
  if (engine) {
    throw new Error(
      `This file still has unrendered ${engine} template code in it, not the final page — a server normally fills those parts in before anyone sees the site. Export or "build" the site first so it is plain HTML, then upload that.`,
    )
  }

  const resolve = options.resolveImage ?? ((src: string) => src)
  const missingImages: string[] = []
  const resolveTracked = (src: string) => {
    if (!src) return ''
    const url = resolve(src)
    if (!url) missingImages.push(src)
    return url
  }

  const document = new DOMParser().parseFromString(html, 'text/html')
  for (const node of document.querySelectorAll('script,style,noscript,iframe,svg')) {
    node.remove()
  }

  const recognised: Record<string, number> = {}
  const blocks: BlockConfig[] = []

  for (const section of candidates(document)) {
    const parts = extract(section)
    if (!carriesWords(parts)) continue
    const kind = classify(parts)
    if (!kind) continue
    const made = toBlock(kind, parts, resolveTracked)
    if (!made) continue
    recognised[kind] = (recognised[kind] ?? 0) + 1
    blocks.push(made)
  }

  const title =
    (document.querySelector('title')?.textContent ?? '').split(/[|–—]/)[0].trim() ||
    options.fallbackName ||
    'My website'

  // A navigation bar and a footer, because a site in this builder has them as
  // shared parts. The menu is rebuilt from the uploaded page's own links.
  const links = [...document.querySelectorAll('nav a')]
    .map(textOf)
    .filter((text, index, all) => text && text.length < 24 && all.indexOf(text) === index)
    .slice(0, 5)

  const header = block('navbar', 'default', {
    logo: title,
    links: links.length ? links : ['Home', 'About', 'Contact'],
    ctaText: 'Get in touch',
  })
  const footer = block('footer', 'multi-column', {
    logo: title,
    copyright: `${new Date().getFullYear()} ${title}. All rights reserved.`,
    autoPageLinks: true,
  })

  if (blocks.length === 0) {
    // Nothing recognisable. Better to hand back the page's words as editable
    // prose than an empty canvas that looks like the upload failed.
    blocks.push(
      block('content', 'prose', {
        body: textOf(document.body).slice(0, 4000) || 'Your page had no text we could read.',
      }),
    )
    recognised.content = 1
  }

  const pages = [{ id: newId('page'), name: 'Home', path: '/', showInMenu: true, blocks }]

  // The uploaded file is one page, but its menu named others. Those become
  // pages waiting to be filled in, so the site keeps the shape the owner had
  // rather than quietly losing half its navigation — the menu here is built
  // from the pages that exist, so a link with no page behind it would vanish.
  for (const link of links) {
    if (/^home$/i.test(link)) continue
    const slug = link.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (!slug || pages.some((entry) => entry.path === `/${slug}`)) continue
    pages.push({
      id: newId('page'),
      name: link,
      path: `/${slug}`,
      showInMenu: true,
      blocks: [
        block('content', 'prose', {
          body: `## ${link}\n\nThis page was in your menu. Add its content here.`,
        }),
      ],
    })
  }

  const config = syncMenu(
    splitHeaderFooter({
      name: title,
      theme: resolveTheme(undefined),
      header: [header],
      footer: [footer],
      pages,
      blocks,
    }),
  )

  return {
    config,
    report: { sections: blocks.length, recognised, missingImages: [...new Set(missingImages)] },
  }
}
