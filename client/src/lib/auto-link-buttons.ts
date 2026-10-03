import type { BlockConfig, PageConfig, SiteConfig } from '@/blocks/types'
import { resolveLink } from './site-links'

/**
 * Gives every button that points nowhere a sensible page to open.
 *
 * A template is written as words — "Get in touch", "Browse courses", "Apply
 * now" — and the words carry no destination, so every one of those buttons
 * used to do nothing when clicked. Working out the destination from what the
 * button says is the same thing a person would do, and it is applied only where
 * a button has no destination at all: anything the template or the owner has
 * already chosen is left exactly as it is.
 *
 * Destinations are stored as `page:<id>` so they keep working if the page is
 * later renamed, unlike a path or a name.
 */

/** Text → the page names to look for, most specific first. */
const INTENTS: { test: RegExp; pages: string[] }[] = [
  { test: /\b(faq|question|help)/i, pages: ['faq', 'contact'] },
  { test: /\b(admission|apply|enrol|enroll|register|sign ?up|join)/i, pages: ['admission', 'enrol', 'apply', 'contact'] },
  { test: /\b(instructor|teacher|faculty|meet|team|specialist|doctor|expert)/i, pages: ['instructor', 'team', 'faculty', 'staff', 'about'] },
  { test: /\b(course|program|class|curriculum|learn(?!\s*more)|study)/i, pages: ['course', 'program', 'class', 'service'] },
  { test: /\b(menu|dish|food|order)/i, pages: ['menu', 'service', 'contact'] },
  { test: /\b(work|portfolio|project|gallery|photo)/i, pages: ['portfolio', 'work', 'gallery', 'project', 'service'] },
  { test: /\b(service|treatment|product|shop|buy|purchase|pricing|plan|explore|browse|discover|download)/i, pages: ['service', 'product', 'shop', 'pricing', 'treatment', 'course', 'program', 'menu'] },
  { test: /\b(about|story|experience|research|details|learn more|read more|more|why)/i, pages: ['about'] },
  { test: /\b(contact|touch|reach|talk|enquir|inquir|book|appointment|visit|call|message|hire|quote|ticket|order|pre)/i, pages: ['contact'] },
]

const norm = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '')

function pageNamed(pages: PageConfig[], wanted: string[]): PageConfig | undefined {
  for (const word of wanted) {
    const hit = pages.slice(1).find((page) => norm(page.name).includes(word))
    if (hit) return hit
  }
  return undefined
}

/** The page a button reading `text` should open, or undefined when the site has nothing suitable. */
export function pageForButton(text: string, pages: PageConfig[], strict = false): PageConfig | undefined {
  if (strict) {
    const intents: [RegExp, string[]][] = [
      [/^(contact(?: us)?|get in touch)$/i, ['contact']],
      [/^(about(?: us)?|learn more|read more)$/i, ['about']],
      [/^(courses|browse courses|view courses)$/i, ['course']],
      [/^(services|view services)$/i, ['service']],
      [/^(faq|questions)$/i, ['faq']],
      [/^(admissions?|apply now)$/i, ['admission', 'contact']],
    ]
    const match = intents.find(([test]) => test.test(text.trim()))
    return match ? pageNamed(pages, match[1]) : undefined
  }
  for (const intent of INTENTS) {
    if (intent.test.test(text)) {
      const hit = pageNamed(pages, intent.pages)
      if (hit) return hit
    }
  }
  // Unknown wording: the contact page is the safest destination for a call to action.
  return pageNamed(pages, ['contact']) ?? pages[1]
}

/** [text prop, destination prop] pairs a widget can carry. */
const PAIRS: [string, string][] = [
  ['ctaText', 'ctaUrl'],
  ['primaryCta', 'primaryCtaUrl'],
  ['secondaryCta', 'secondaryCtaUrl'],
  ['buttonText', 'buttonUrl'],
]

function fillBlock(block: BlockConfig, pages: PageConfig[], strict = false): BlockConfig {
  let props = block.props
  const set = (key: string, value: unknown) => { if (props === block.props) props = { ...block.props }; props[key] = value }

  const link = (text: unknown, url: unknown): string | null => {
    if (typeof text !== 'string' || !text.trim()) return null
    if (strict && (url || block.props.action || block.props.link || block.props.onClick)) return null
    // Something is already there (a page, an address, an anchor) — not ours to change.
    if (typeof url === 'string' && url.trim() && resolveLink(url, pages).href !== '#') return null
    const page = pageForButton(text, pages, strict)
    return page ? `page:${page.id}` : null
  }

  for (const [textKey, urlKey] of PAIRS) {
    const value = link(block.props[textKey], block.props[urlKey])
    if (value) set(urlKey, value)
  }
  if (block.type === 'button') {
    const value = link(block.props.label, block.props.url)
    if (value) set('url', value)
  }
  if (Array.isArray(block.props.tiers)) {
    const tiers = (block.props.tiers as Record<string, unknown>[]).map((tier) => {
      const value = link(tier.cta, tier.ctaUrl)
      return value ? { ...tier, ctaUrl: value } : tier
    })
    if (tiers.some((tier, i) => tier !== (block.props.tiers as unknown[])[i])) set('tiers', tiers)
  }

  const children = block.children?.map((child) => fillBlock(child, pages, strict))
  const changedChildren = children?.some((child, i) => child !== block.children![i])
  if (props === block.props && !changedChildren) return block
  return { ...block, props, ...(children ? { children } : {}) }
}

/** The site with every destination-less button pointed at a page of the site. */
export function autoLinkButtons(site: SiteConfig, strict = false): SiteConfig {
  const pages = site.pages ?? []
  if (pages.length < 2) return site
  const fill = (blocks?: BlockConfig[]) => blocks?.map((block) => fillBlock(block, pages, strict))
  const nextPages = pages.map((page) => ({ ...page, blocks: fill(page.blocks) ?? page.blocks }))
  return {
    ...site,
    header: fill(site.header),
    footer: fill(site.footer),
    pages: nextPages,
    blocks: nextPages[0].blocks,
  }
}

/** Once per saved document, including API loads and browser hydration. */
export function migrateButtons(site: SiteConfig): SiteConfig {
  if ((site.migrationVersion ?? 0) >= 1) return site
  return { ...autoLinkButtons(site, true), migrationVersion: 1 }
}
