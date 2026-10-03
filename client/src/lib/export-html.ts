import { regionColorVars } from './region-colors'
import { styleMapToCssText as regionStyleText } from './section-colors'
import { EditableContext } from '@/blocks/editable-context'
import { exportOriginalDocument } from './original-document'
import { EditableAction } from '@/blocks/EditableAction'
import { elementRules, elementToken } from '@/blocks/element-style'
import type { SiteConfig, BlockConfig, PageConfig, ThemeConfig } from '@/blocks/types'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { isEmptyStyle, styleToRules } from '@/blocks/block-style'
import { ensurePages } from '@/store/site-shape'
import { pageFileName } from '@/lib/site-links'
import { getIcon } from '@/blocks/icons'
import { donutSegment, toSlices } from '@/blocks/chart/chart-data'
import { todayIndex } from '@/blocks/hours/hours-data'
import { sliderSlides } from '@/blocks/slider/slides'
import { mapEmbedUrl, mapQuery } from '@/blocks/map/query'
import { videoEmbedUrl } from '@/blocks/video/embed'
import { whatsappHref, whatsappNumber } from '@/blocks/whatsapp/link'
import { resolveTheme, themeToCSS } from '@/lib/theme-presets'
import { pageColorStyleText } from '@/lib/page-colors'
import { hasSectionColors, sectionColorCss, sectionShowsImage, styleMapToCssText, themeRulesCss } from '@/lib/section-colors'
import { walk } from '@/lib/block-tree'
import { AdditionalWidget, additionalWidgetScript } from '@/blocks/AdditionalWidget'
import { NavbarBlock } from '@/blocks/navbar/NavbarBlock'
import { FooterBlock } from '@/blocks/footer/FooterBlock'
import { isAdditionalWidget } from '@/widgets/additional'
import { isFunctionalWidget } from '@/widgets/catalogue'
import { FunctionalWidget } from '@/widgets/FunctionalWidget'
import { functionalWidgetScript } from '@/widgets/runtime'
import functionalCss from '@/widgets/functional.css?raw'
import { layoutTypes } from '@/widgets/expanded'
import { functionalLayoutStyle } from '@/widgets/values'

export interface ExportSiteSettings {
  siteName?: string
  siteDescription?: string
  faviconUrl?: string
  language?: string
  seoTitle?: string
  seoDescription?: string
  ogImageUrl?: string
  gaId?: string
  posthogKey?: string
}

export interface ExportSiteOptions {
  settings?: ExportSiteSettings
  /** The page being exported; its menu link is marked as the current page. */
  activePageId?: string
  /**
   * Where the published site lives, e.g. "/site/sharma-coaching". Menu links
   * are written against it so they point at real pages.
   */
  base?: string
  /**
   * Where the published page should send enquiries. Without it the contact
   * form still renders, but says so rather than pretending to send.
   */
  leadsEndpoint?: string
  /** Identifies which site an enquiry came from, for the enquiry inbox. */
  siteId?: string
  /**
   * Write links between pages as file names rather than addresses. A site
   * downloaded as files is opened straight from a folder, where "/about"
   * means the root of the disk and nothing else.
   */
  fileLinks?: boolean
  /**
   * The server that holds this design's template files (stylesheets, scripts,
   * pictures, fonts) — for a published site, the API. When set, a design built
   * from an original template refers to them there instead of carrying them
   * inside every page, which is what keeps a 40-page template publishable.
   */
  assetOrigin?: string
}

// Where the contact form posts. Set for the duration of one export, because
// the section renderers are plain functions rather than a class.
let leadsEndpoint = ''
let leadsSiteId = ''

// The site's pages, so a menu item's words can be turned into a real address.
let linkPages: PageConfig[] = []
let linkBase = ''
let linkAsFiles = false
let linkActivePageId: string | undefined

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderAction(block: BlockConfig, path: string, urlPath: string, className = '', fallbackUrl = '', fallback = '', current = false): string {
  return renderToStaticMarkup(createElement(EditableContext.Provider, {value:{block,pages:linkPages,base:linkBase,asFiles:linkAsFiles}}, createElement(EditableAction,{path,urlPath,className,fallbackUrl,fallback,current})))
}

function googleFontUrl(fonts: string[]): string {
  const unique = [...new Set(fonts.filter(Boolean))]
  const families = unique.map(
    (f) => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`
  )
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`
}

function initials(name: string): string {
  return escapeHtml(
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
  )
}

function prop<T>(props: Record<string, unknown>, key: string, fallback: T): T {
  const val = props[key]
  if (val === undefined || val === null) return fallback
  return val as T
}

function normalizeLanguage(value?: string): string {
  const normalized = (value || '').toLowerCase().trim()
  if (!normalized) return 'en'
  if (normalized === 'english' || normalized.startsWith('en')) return 'en'
  if (normalized === 'german' || normalized.startsWith('de')) return 'de'
  if (normalized === 'spanish' || normalized.startsWith('es')) return 'es'
  if (normalized === 'french' || normalized.startsWith('fr')) return 'fr'
  return 'en'
}

// ---------------------------------------------------------------------------
// SVG icons (inline, no dependencies)
// ---------------------------------------------------------------------------

const SVG_CHECK =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'

const SVG_CHEVRON_DOWN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'

const SVG_SPARKLES =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>'

const SVG_STAR_FILLED =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'

const SVG_STAR_EMPTY =
  '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'

const SVG_QUOTE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>'

const SVG_SEND =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>'

const SVG_MAIL =
  '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'

const SVG_STAR_10 =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'

/**
 * The same icon the editor draws, as SVG markup.
 *
 * This used to render the icon's first letter in a box, so a published page
 * showed "S" where the editor showed a pair of scissors. Rendering the actual
 * Lucide component to a string keeps the two identical, and costs the page
 * nothing at view time because the SVG is written into the file.
 */
function featureIconSvg(iconName: string): string {
  const Icon = getIcon(iconName)
  return renderToStaticMarkup(createElement(Icon, { width: 18, height: 18 }))
}

function starRatingHtml(rating: number): string {
  const stars = [1, 2, 3, 4, 5]
    .map((i) =>
      i <= rating
        ? `<span class="text-yellow-400">${SVG_STAR_FILLED}</span>`
        : `<span class="text-text-3">${SVG_STAR_EMPTY}</span>`
    )
    .join('')
  return `<div class="flex gap-0.5">${stars}</div>`
}

function logoPlaceholderSvg(name: string): string {
  const char = escapeHtml(name.charAt(0).toUpperCase())
  return `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="26" height="26" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/><text x="14" y="18" text-anchor="middle" fill="currentColor" font-size="14" font-weight="700" font-family="system-ui, sans-serif">${char}</text></svg>`
}

// ---------------------------------------------------------------------------
// Block renderers
// ---------------------------------------------------------------------------

/**
 * Header and footer are drawn by the same React views the canvas uses, so every
 * style the editor offers is exported as it looks there — not a second, older
 * copy of each that only knew the first style.
 *
 * Those views size themselves with container queries (@md:, @4xl:), which need
 * a container around them. A published page has none and tailwind's script knows
 * only viewport breakpoints, so the prefixes are mapped across: a published page
 * is as wide as the screen, which is what the container is in the editor.
 */
const containerToViewport: Record<string, string> = { xs: 'sm', sm: 'sm', md: 'sm', lg: 'md', xl: 'md', '2xl': 'md', '3xl': 'lg', '4xl': 'lg', '5xl': 'xl', '6xl': 'xl' }

function renderSharedView(block: BlockConfig, view: typeof NavbarBlock | typeof FooterBlock): string {
  const html = renderToStaticMarkup(createElement(
    EditableContext.Provider,
    { value: { block, pages: linkPages, base: linkBase, asFiles: linkAsFiles, activePageId: linkActivePageId } },
    createElement(view, { block }),
  ))
  return html.replace(/@(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl):/g, (_match, size: string) => `${containerToViewport[size]}:`)
}

function renderNavbar(block: BlockConfig): string {
  return renderSharedView(block, NavbarBlock)
}

function renderFooter(block: BlockConfig): string {
  return renderSharedView(block, FooterBlock)
}

// ---------------------------------------------------------------------------
// Hero variants
// ---------------------------------------------------------------------------

/**
 * The opening section, matching the editor's five layouts.
 *
 * `image` is the current prop; `heroImage` is read as a fallback so sites saved
 * before the rename still publish with their photograph.
 */
function heroParts(block: BlockConfig) {
  return {
    badge: prop<string>(block.props, 'badge', ''),
    headline: escapeHtml(prop(block.props, 'headline', '')),
    subheadline: escapeHtml(prop(block.props, 'subheadline', '')),
    primaryCta: prop<string>(block.props, 'primaryCta', ''),
    primaryCtaUrl: prop<string>(block.props, 'primaryCtaUrl', ''),
    secondaryCta: prop<string>(block.props, 'secondaryCta', ''),
    secondaryCtaUrl: prop<string>(block.props, 'secondaryCtaUrl', ''),
    image:
      prop<string>(block.props, 'image', '') || prop<string>(block.props, 'heroImage', ''),
    imageAlt: prop<string>(block.props, 'imageAlt', '') || prop(block.props, 'headline', ''),
  }
}

const PRIMARY_BTN =
  'px-6 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all inline-flex items-center gap-2'
const SECONDARY_BTN =
  'px-6 py-3 rounded-lg bg-bg-3 text-text-0 text-sm font-medium border border-border-default hover:bg-bg-4 hover:border-border-hover transition-all inline-block'

function heroBadge(badge: string): string {
  return badge
    ? `      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[11px] font-medium mb-6">${SVG_SPARKLES} ${escapeHtml(badge)}</div>`
    : ''
}

/** The photo below the words, on the layouts that show one there. */
function heroImageBelow(image: string, alt: string): string {
  return image
    ? `      <div class="mt-14 max-w-4xl mx-auto" style="aspect-ratio:16/9;border-radius:16px;overflow:hidden"><img data-image="image" data-element-alt="imageAlt" src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" loading="lazy" class="w-full h-full object-cover" /></div>`
    : ''
}

function renderHeroCentered(block: BlockConfig): string {
  const h = heroParts(block)
  const secondary = h.secondaryCta
    ? `        ${renderAction(block, 'secondaryCta', 'secondaryCtaUrl', SECONDARY_BTN)}`
    : ''

  return `  <section class="px-6 md:px-10 py-20 md:py-24 text-center">
${heroBadge(h.badge)}
      <h1 data-edit="headline" class="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4 max-w-3xl mx-auto">${h.headline}</h1>
      <p data-edit="subheadline" class="text-text-2 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-8">${h.subheadline}</p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        ${renderAction(block, 'primaryCta', 'primaryCtaUrl', PRIMARY_BTN)}
${secondary}
      </div>
${heroImageBelow(h.image, h.imageAlt)}
  </section>`
}

function renderHeroSplit(block: BlockConfig): string {
  const h = heroParts(block)
  const secondary = h.secondaryCta
    ? `          ${renderAction(block, 'secondaryCta', 'secondaryCtaUrl', SECONDARY_BTN)}`
    : ''

  const visual = h.image
    ? `<img data-image="image" data-element-alt="imageAlt" src="${escapeHtml(h.image)}" alt="${escapeHtml(h.imageAlt)}" loading="lazy" class="w-full h-full object-cover" />`
    : `<div class="w-full h-full" style="background:linear-gradient(135deg,rgba(99,102,241,.18),transparent)"></div>`

  return `  <section class="px-6 md:px-10 py-16 md:py-24">
    <div class="flex flex-col md:flex-row items-center gap-10 md:gap-14">
      <div class="flex-1">
${heroBadge(h.badge)}
        <h1 data-edit="headline" class="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">${h.headline}</h1>
        <p data-edit="subheadline" class="text-text-2 text-base leading-relaxed mb-6 max-w-lg">${h.subheadline}</p>
        <div class="flex flex-wrap items-center gap-3">
          ${renderAction(block, 'primaryCta', 'primaryCtaUrl', PRIMARY_BTN)}
${secondary}
        </div>
      </div>
      <div class="flex-1 w-full" style="aspect-ratio:4/3;border-radius:16px;overflow:hidden">${visual}</div>
    </div>
  </section>`
}

function renderHeroPhoto(block: BlockConfig): string {
  const h = heroParts(block)
  const secondary = h.secondaryCta ? renderAction(block, 'secondaryCta', 'secondaryCtaUrl', SECONDARY_BTN) : ''

  const photo = h.image
    ? `<img src="${escapeHtml(h.image)}" alt="" class="w-full h-full object-cover" />`
    : `<div class="w-full h-full" style="background:linear-gradient(135deg,#1f2937,#111827)"></div>`

  return `  <section style="position:relative;min-height:480px;display:flex;align-items:center;overflow:hidden">
    <div style="position:absolute;inset:0">${photo}
      <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.8),rgba(0,0,0,.45) 45%,rgba(0,0,0,.25))"></div>
    </div>
    <div style="position:relative;z-index:1;max-width:768px" class="px-6 md:px-14 py-20">
      ${h.badge ? `<div style="display:inline-flex;padding:4px 12px;border-radius:999px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:11px;font-weight:500;margin-bottom:20px">${escapeHtml(h.badge)}</div>` : ''}
      <h1 data-edit="headline" class="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4" style="color:#fff">${h.headline}</h1>
      <p data-edit="subheadline" class="text-base md:text-lg leading-relaxed mb-8" style="color:rgba(255,255,255,.85);max-width:36rem">${h.subheadline}</p>
      <div class="flex flex-wrap items-center gap-3">
        ${renderAction(block, 'primaryCta', 'primaryCtaUrl', PRIMARY_BTN)}
${secondary}
      </div>
    </div>
  </section>`
}

function renderHeroGradient(block: BlockConfig): string {
  const h = heroParts(block)
  const secondary = h.secondaryCta
    ? `        ${renderAction(block, 'secondaryCta', 'secondaryCtaUrl', SECONDARY_BTN)}`
    : ''

  return `  <section class="px-6 md:px-10 py-20 md:py-28 text-center" style="position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(99,102,241,.08),transparent);pointer-events:none"></div>
    <div style="position:relative;z-index:1">
${heroBadge(h.badge)}
      <h1 data-edit="headline" class="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4 max-w-3xl mx-auto">${h.headline}</h1>
      <p data-edit="subheadline" class="text-text-2 text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-8">${h.subheadline}</p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        ${renderAction(block, 'primaryCta', 'primaryCtaUrl', PRIMARY_BTN)}
${secondary}
      </div>
${heroImageBelow(h.image, h.imageAlt)}
    </div>
  </section>`
}

function renderHeroMinimal(block: BlockConfig): string {
  const h = heroParts(block)
  return `  <section class="px-6 md:px-10 py-24 md:py-32 text-center">
      <h1 data-edit="headline" class="text-5xl md:text-7xl font-bold tracking-tighter leading-[1.05] mb-6 max-w-4xl mx-auto">${h.headline}</h1>
      <p data-edit="subheadline" class="text-text-2 text-lg md:text-xl leading-relaxed max-w-lg mx-auto mb-10">${h.subheadline}</p>
      <div class="flex justify-center">${renderAction(block, 'primaryCta', 'primaryCtaUrl', PRIMARY_BTN)}</div>
  </section>`
}

function renderHero(block: BlockConfig): string {
  switch (block.variant) {
    case 'split':
      return renderHeroSplit(block)
    case 'photo':
      return renderHeroPhoto(block)
    case 'gradient':
      return renderHeroGradient(block)
    case 'minimal':
      return renderHeroMinimal(block)
    default:
      return renderHeroCentered(block)
  }
}


// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

function renderFeaturesGrid(block: BlockConfig): string {
  const label = prop<string>(block.props, 'label', '')
  const title = escapeHtml(prop(block.props, 'title', ''))
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const items = prop<{ icon?: string; title: string; description: string }[]>(
    block.props,
    'items',
    []
  )

  const labelHtml = label
    ? `        <div class="text-[11px] font-semibold uppercase tracking-widest text-brand mb-2">${escapeHtml(label)}</div>`
    : ''
  const subtitleHtml = subtitle
    ? `        <p class="text-text-2 text-sm max-w-lg mx-auto">${escapeHtml(subtitle)}</p>`
    : ''

  const cards = items
    .map(
      (item, i) => `        <div class="group bg-bg-2 border border-border-default rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
          <div class="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-3">
            ${featureIconSvg(item.icon || 'Z')}
          </div>
          <h3 data-edit="items.${i}.title" class="text-sm font-semibold mb-1">${escapeHtml(item.title)}</h3>
          <p data-edit="items.${i}.description" class="text-[12.5px] text-text-2 leading-relaxed">${escapeHtml(item.description)}</p>
        </div>`
    )
    .join('\n')

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="text-center mb-10">
${labelHtml}
        <h2 data-edit="title" class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
${cards}
      </div>
  </section>`
}

function renderFeaturesList(block: BlockConfig): string {
  const label = prop<string>(block.props, 'label', '')
  const title = escapeHtml(prop(block.props, 'title', ''))
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const items = prop<{ icon?: string; title: string; description: string }[]>(
    block.props,
    'items',
    []
  )

  const labelHtml = label
    ? `        <div class="text-[11px] font-semibold uppercase tracking-widest text-brand mb-2">${escapeHtml(label)}</div>`
    : ''
  const subtitleHtml = subtitle
    ? `        <p class="text-text-2 text-sm max-w-lg mx-auto">${escapeHtml(subtitle)}</p>`
    : ''

  const rows = items
    .map(
      (item, i) => `        <div class="flex gap-4 p-4 rounded-xl bg-bg-2 border border-border-default transition-all hover:border-border-hover">
          <div class="w-10 h-10 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
            ${featureIconSvg(item.icon || 'Z')}
          </div>
          <div>
            <h3 data-edit="items.${i}.title" class="text-sm font-semibold mb-0.5">${escapeHtml(item.title)}</h3>
            <p data-edit="items.${i}.description" class="text-[12.5px] text-text-2 leading-relaxed">${escapeHtml(item.description)}</p>
          </div>
        </div>`
    )
    .join('\n')

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="text-center mb-10">
${labelHtml}
        <h2 data-edit="title" class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
      </div>
      <div class="max-w-2xl mx-auto space-y-4">
${rows}
      </div>
  </section>`
}

function renderFeatures(block: BlockConfig): string {
  switch (block.variant) {
    case 'list':
      return renderFeaturesList(block)
    default:
      return renderFeaturesGrid(block)
  }
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

interface PricingTier {
  name: string
  price: string
  period?: string
  description?: string
  features: string[]
  cta: string
  featured?: boolean
}

const defaultTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'For personal projects',
    features: ['1 website', '5 blocks', 'Basic export', 'Community support'],
    cta: 'Get Started',
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For professionals',
    features: [
      'Unlimited websites',
      'All blocks',
      'Custom domains',
      'Priority support',
      'Agent API access',
      'Version history',
    ],
    cta: 'Upgrade to Pro',
    featured: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: '/month',
    description: 'For teams and agencies',
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Custom components',
      'SSO',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
  },
]

function renderPricingSimple(block: BlockConfig): string {
  const title = escapeHtml(prop(block.props, 'title', ''))
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const tiers = prop<PricingTier[]>(block.props, 'tiers', defaultTiers)

  const subtitleHtml = subtitle
    ? `        <p class="text-text-2 text-sm max-w-lg mx-auto">${escapeHtml(subtitle)}</p>`
    : ''

  const cards = tiers
    .map((tier, i) => {
      const featuredBorder = tier.featured
        ? 'bg-bg-2 border-2 border-brand'
        : 'bg-bg-2 border border-border-default hover:border-border-hover'
      const featuredBadge = tier.featured
        ? `          <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            ${SVG_STAR_10}
            Recommended
          </div>`
        : ''
      const btnClass = tier.featured
        ? 'w-full py-2.5 rounded-lg text-sm font-semibold transition-all bg-brand text-white hover:bg-brand-dim'
        : 'w-full py-2.5 rounded-lg text-sm font-semibold transition-all bg-bg-3 text-text-0 border border-border-default hover:bg-bg-4 hover:border-border-hover'

      const features = tier.features
        .map(
          (f) =>
            `            <li class="flex items-start gap-2 text-[12.5px] text-text-1">
              <span class="text-brand shrink-0 mt-0.5">${SVG_CHECK}</span>
              ${escapeHtml(f)}
            </li>`
        )
        .join('\n')

      const periodHtml = tier.period
        ? `<span class="text-text-3 text-sm">${escapeHtml(tier.period)}</span>`
        : ''
      const descHtml = tier.description
        ? `            <p class="text-[11px] text-text-3">${escapeHtml(tier.description)}</p>`
        : ''

      return `        <div class="relative rounded-xl p-6 flex flex-col transition-all ${featuredBorder}">
${featuredBadge}
          <div class="mb-4">
            <h3 class="text-sm font-semibold mb-1">${escapeHtml(tier.name)}</h3>
${descHtml}
          </div>
          <div class="mb-4">
            <span class="text-3xl font-bold tracking-tight">${escapeHtml(tier.price)}</span>
            ${periodHtml}
          </div>
          <ul class="space-y-2 mb-6 flex-1">
${features}
          </ul>
          ${renderAction(block, `tiers.${i}.cta`, `tiers.${i}.ctaUrl`, btnClass)}
        </div>`
    })
    .join('\n')

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="text-center mb-10">
        <h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
${cards}
      </div>
  </section>`
}

function renderPricingComparison(block: BlockConfig): string {
  const title = escapeHtml(prop(block.props, 'title', ''))
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const tiers = prop<PricingTier[]>(block.props, 'tiers', defaultTiers)

  const allFeatures = [...new Set(tiers.flatMap((t) => t.features))]

  const subtitleHtml = subtitle
    ? `        <p class="text-text-2 text-sm max-w-lg mx-auto">${escapeHtml(subtitle)}</p>`
    : ''

  const headerCells = tiers
    .map((tier) => {
      const cls = tier.featured ? 'text-brand' : 'text-text-0'
      return `              <th class="py-3 px-3 text-center font-semibold ${cls}">
                ${escapeHtml(tier.name)}
                <div class="text-lg font-bold mt-0.5">${escapeHtml(tier.price)}</div>
              </th>`
    })
    .join('\n')

  const bodyRows = allFeatures
    .map((feature) => {
      const cells = tiers
        .map((tier) => {
          const has = tier.features.includes(feature)
          return has
            ? `              <td class="py-2.5 px-3 text-center"><span class="text-brand inline-block">${SVG_CHECK}</span></td>`
            : `              <td class="py-2.5 px-3 text-center text-text-3">-</td>`
        })
        .join('\n')
      return `            <tr class="border-b border-border-subtle">
              <td class="py-2.5 px-3 text-text-1">${escapeHtml(feature)}</td>
${cells}
            </tr>`
    })
    .join('\n')

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="text-center mb-10">
        <h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
      </div>
      <div class="max-w-3xl mx-auto overflow-x-auto">
        <table class="w-full text-left text-[12.5px]">
          <thead>
            <tr class="border-b border-border-default">
              <th class="py-3 px-3 text-text-3 font-medium">Feature</th>
${headerCells}
            </tr>
          </thead>
          <tbody>
${bodyRows}
          </tbody>
        </table>
      </div>
  </section>`
}

function renderPricing(block: BlockConfig): string {
  switch (block.variant) {
    case 'comparison':
      return renderPricingComparison(block)
    default:
      return renderPricingSimple(block)
  }
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------

function renderCtaSimple(block: BlockConfig): string {
  const headline = escapeHtml(prop(block.props, 'headline', ''))
  const subheadline = prop<string>(block.props, 'subheadline', '')

  const subHtml = subheadline
    ? `        <p class="text-text-2 text-sm mb-6 max-w-md mx-auto">${escapeHtml(subheadline)}</p>`
    : ''

  return `  <section class="px-6 md:px-10 py-16 md:py-20 text-center relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-b from-brand/[0.06] via-brand/[0.03] to-transparent pointer-events-none"></div>
      <div class="relative z-10">
        <h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-3">${headline}</h2>
${subHtml}
        ${renderAction(block, 'buttonText', 'buttonUrl', 'px-8 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all inline-flex items-center gap-2')}
      </div>
  </section>`
}

function renderCtaSplit(block: BlockConfig): string {
  const headline = escapeHtml(prop(block.props, 'headline', ''))
  const subheadline = prop<string>(block.props, 'subheadline', '')

  const subHtml = subheadline
    ? `          <p class="text-text-2 text-sm">${escapeHtml(subheadline)}</p>`
    : ''

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
      <div class="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-xl bg-bg-2 border border-border-default relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent pointer-events-none"></div>
        <div class="relative z-10">
          <h2 class="text-xl md:text-2xl font-bold tracking-tight mb-1">${headline}</h2>
${subHtml}
        </div>
        ${renderAction(block, 'buttonText', 'buttonUrl', 'relative z-10 px-6 py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all shrink-0 inline-flex items-center gap-2')}
      </div>
  </section>`
}

function renderCta(block: BlockConfig): string {
  switch (block.variant) {
    case 'split':
      return renderCtaSplit(block)
    default:
      return renderCtaSimple(block)
  }
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Testimonials (cards only, carousel skipped per spec)
// ---------------------------------------------------------------------------

interface TestimonialItem {
  name: string
  role: string
  quote: string
  rating?: number
  avatar?: string
}

const defaultTestimonials: TestimonialItem[] = [
  {
    name: 'Sarah Chen',
    role: 'CEO at TechCorp',
    quote: 'SiteBuilder completely changed how we build landing pages. The JSON config approach is genius.',
    rating: 5,
  },
  {
    name: 'Marcus Johnson',
    role: 'Lead Developer',
    quote: 'Finally, a tool where both designers and AI agents can work together seamlessly.',
    rating: 5,
  },
  {
    name: 'Emma Wilson',
    role: 'Product Manager',
    quote: 'We shipped our marketing site in half the time. The component library is incredible.',
    rating: 4,
  },
]

function renderTestimonials(block: BlockConfig): string {
  const title = escapeHtml(
    prop(block.props, 'title', 'What people say')
  )
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const items = prop<TestimonialItem[]>(block.props, 'items', defaultTestimonials)

  const subtitleHtml = subtitle
    ? `        <p class="text-text-2 text-sm max-w-lg mx-auto">${escapeHtml(subtitle)}</p>`
    : ''

  const cards = items
    .map((item) => {
      const ratingHtml = item.rating ? `          ${starRatingHtml(item.rating)}` : ''
      return `        <div class="bg-bg-2 border border-border-default rounded-xl p-5 transition-all hover:border-border-hover">
          <span class="text-brand/30 block mb-3">${SVG_QUOTE}</span>
          <p class="text-[13px] text-text-1 leading-relaxed mb-4 italic">"${escapeHtml(item.quote)}"</p>
${ratingHtml}
          <div class="flex items-center gap-3 mt-4 pt-4 border-t border-border-subtle">
            ${item.avatar ? `<img src="${escapeHtml(item.avatar)}" alt="${escapeHtml(item.name)}" class="w-9 h-9 rounded-full object-cover border border-border-default" />` : `<div class="w-9 h-9 rounded-full bg-bg-4 border border-border-default flex items-center justify-center text-[11px] font-semibold text-text-2">${initials(item.name)}</div>`}
            <div>
              <div class="text-[12.5px] font-semibold">${escapeHtml(item.name)}</div>
              <div class="text-[11px] text-text-3">${escapeHtml(item.role)}</div>
            </div>
          </div>
        </div>`
    })
    .join('\n')

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="text-center mb-10">
        <h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
${cards}
      </div>
  </section>`
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

interface StatItem {
  value: string
  label: string
}

const defaultStats: StatItem[] = [
  { value: '10K+', label: 'Sites built' },
  { value: '99.9%', label: 'Uptime' },
  { value: '50ms', label: 'Avg. response' },
  { value: '4.9/5', label: 'User rating' },
]

function renderStatsGrid(block: BlockConfig): string {
  const title = prop<string>(block.props, 'title', '')
  const items = prop<StatItem[]>(block.props, 'items', defaultStats)

  const titleHtml = title
    ? `      <h2 class="text-xl font-bold tracking-tight text-center mb-8">${escapeHtml(title)}</h2>`
    : ''

  const cards = items
    .map(
      (item) => `        <div class="text-center p-4 rounded-xl bg-bg-2 border border-border-default">
          <div class="text-3xl md:text-4xl font-bold tracking-tight text-brand mb-1">${escapeHtml(item.value)}</div>
          <div class="text-[12px] text-text-2 font-medium">${escapeHtml(item.label)}</div>
        </div>`
    )
    .join('\n')

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
${titleHtml}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
${cards}
      </div>
  </section>`
}

function renderStatsBar(block: BlockConfig): string {
  const items = prop<StatItem[]>(block.props, 'items', defaultStats)

  const statsHtml = items
    .map(
      (item) => `          <div class="text-center">
            <div class="text-2xl md:text-3xl font-bold tracking-tight text-text-0 mb-0.5">${escapeHtml(item.value)}</div>
            <div class="text-[11px] text-text-3 font-medium uppercase tracking-wider">${escapeHtml(item.label)}</div>
          </div>`
    )
    .join('\n')

  return `  <section class="px-6 md:px-10 py-10">
      <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12 py-6 px-4 rounded-xl bg-bg-2 border border-border-default">
${statsHtml}
      </div>
  </section>`
}

function renderStats(block: BlockConfig): string {
  switch (block.variant) {
    case 'bar':
      return renderStatsBar(block)
    default:
      return renderStatsGrid(block)
  }
}

// ---------------------------------------------------------------------------
// FAQ (with inline JS for accordion toggle)
// ---------------------------------------------------------------------------

interface FaqItem {
  question: string
  answer: string
}

const defaultFaqs: FaqItem[] = [
  {
    question: 'What is SiteBuilder?',
    answer:
      'SiteBuilder is a visual website builder that uses structured JSON config as the source of truth. Both humans and AI agents can edit the same config to build beautiful websites.',
  },
  {
    question: 'How does the JSON config work?',
    answer:
      'Every website is represented as a JSON document with blocks, styles, and content. The visual editor reads and writes this JSON, and agents can make surgical edits via the API.',
  },
  {
    question: 'Can I use my own components?',
    answer:
      'Yes! SiteBuilder supports custom components. You can build your own blocks following our component schema and register them in the block registry.',
  },
  {
    question: 'Is it free to use?',
    answer:
      'SiteBuilder offers a free tier for personal projects with up to 5 blocks. Pro and Team plans unlock unlimited blocks, custom domains, and priority support.',
  },
]

function renderFaq(block: BlockConfig): string {
  const title = escapeHtml(
    prop(block.props, 'title', 'Frequently Asked Questions')
  )
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const items = prop<FaqItem[]>(block.props, 'items', defaultFaqs)

  const subtitleHtml = subtitle
    ? `        <p class="text-text-2 text-sm max-w-lg mx-auto">${escapeHtml(subtitle)}</p>`
    : ''

  const accordionItems = items
    .map(
      (item, i) => `        <div class="border-b border-border-subtle">
          <button onclick="toggleFaq(this)" class="w-full flex items-center justify-between py-4 text-left group" aria-expanded="${i === 0 ? 'true' : 'false'}">
            <span data-edit="items.${i}.question" class="text-[13.5px] font-medium text-text-0 group-hover:text-brand transition-colors">${escapeHtml(item.question)}</span>
            <span class="faq-chevron text-text-3 shrink-0 ml-4 transition-transform duration-200${i === 0 ? ' rotate-180 text-brand' : ''}">${SVG_CHEVRON_DOWN}</span>
          </button>
          <div class="faq-content overflow-hidden transition-all duration-200${i === 0 ? ' max-h-[500px] pb-4' : ' max-h-0'}">
            <p data-edit="items.${i}.answer" class="text-[12.5px] text-text-2 leading-relaxed pr-8">${escapeHtml(item.answer)}</p>
          </div>
        </div>`
    )
    .join('\n')

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="text-center mb-10">
        <h2 data-edit="title" class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
      </div>
      <div class="max-w-2xl mx-auto">
${accordionItems}
      </div>
  </section>`
}

// ---------------------------------------------------------------------------
// Team
// ---------------------------------------------------------------------------

interface TeamMember {
  name: string
  role: string
  avatar?: string
}

const defaultMembers: TeamMember[] = [
  { name: 'Alex Rivera', role: 'CEO & Founder' },
  { name: 'Jordan Lee', role: 'CTO' },
  { name: 'Sam Patel', role: 'Head of Design' },
  { name: 'Casey Morgan', role: 'Lead Engineer' },
]

function renderTeam(block: BlockConfig): string {
  const title = escapeHtml(prop(block.props, 'title', 'Meet the Team'))
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const members = prop<TeamMember[]>(block.props, 'members', defaultMembers)

  const subtitleHtml = subtitle
    ? `        <p class="text-text-2 text-sm max-w-lg mx-auto">${escapeHtml(subtitle)}</p>`
    : ''

  const cards = members
    .map(
      (m) => `        <div class="text-center group">
          ${m.avatar ? `<img src="${escapeHtml(m.avatar)}" alt="${escapeHtml(m.name)}" class="w-20 h-20 mx-auto rounded-full object-cover border-2 border-border-default mb-3 transition-all group-hover:border-brand/30" />` : `<div class="w-20 h-20 mx-auto rounded-full bg-bg-3 border-2 border-border-default flex items-center justify-center text-xl font-bold text-text-3 mb-3 transition-all group-hover:border-brand/30">${initials(m.name)}</div>`}
          <h3 class="text-sm font-semibold">${escapeHtml(m.name)}</h3>
          <p class="text-[11px] text-text-3 mt-0.5">${escapeHtml(m.role)}</p>
        </div>`
    )
    .join('\n')

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="text-center mb-10">
        <h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto">
${cards}
      </div>
  </section>`
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

function renderContact(block: BlockConfig): string {
  const title = escapeHtml(prop(block.props, 'title', 'Get in Touch'))
  const subtitle = prop<string>(block.props, 'subtitle', '')
  const nameLabel = escapeHtml(prop(block.props, 'nameLabel', 'Name'))
  const phoneLabel = escapeHtml(prop(block.props, 'phoneLabel', 'Phone'))
  const emailLabel = escapeHtml(prop(block.props, 'emailLabel', 'Email'))
  const messageLabel = escapeHtml(prop(block.props, 'messageLabel', 'Message'))
  const submitLabel = escapeHtml(prop(block.props, 'submitLabel', 'Send Message'))

  const subtitleHtml = subtitle
    ? `          <p class="text-text-2 text-sm">${escapeHtml(subtitle)}</p>`
    : ''

  return `  <section class="px-6 md:px-10 py-16 md:py-20">
      <div class="max-w-lg mx-auto">
        <div class="text-center mb-8">
          <h2 data-edit="title" class="text-2xl md:text-3xl font-bold tracking-tight mb-2">${title}</h2>
${subtitleHtml}
        </div>
        <form class="space-y-4" data-enquiry-form data-endpoint="${escapeHtml(leadsEndpoint)}" data-site="${escapeHtml(leadsSiteId)}">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label data-edit="nameLabel" class="block text-[11.5px] text-text-2 mb-1.5 font-medium" for="enq-name">${nameLabel}</label>
              <input id="enq-name" name="name" type="text" required placeholder="Your name" class="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 transition-colors" />
            </div>
            <div>
              <label data-edit="phoneLabel" class="block text-[11.5px] text-text-2 mb-1.5 font-medium" for="enq-phone">${phoneLabel}</label>
              <input id="enq-phone" name="phone" type="tel" placeholder="98765 43210" class="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 transition-colors" />
            </div>
          </div>
          <div>
              <label data-edit="emailLabel" class="block text-[11.5px] text-text-2 mb-1.5 font-medium" for="enq-email">${emailLabel}</label>
            <input id="enq-email" name="email" type="email" placeholder="you@example.com" class="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 transition-colors" />
          </div>
          <div>
            <label data-edit="messageLabel" class="block text-[11.5px] text-text-2 mb-1.5 font-medium" for="enq-message">${messageLabel}</label>
            <textarea id="enq-message" name="message" rows="4" placeholder="How can we help?" class="w-full px-3 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 resize-y transition-colors"></textarea>
          </div>
          <p data-enquiry-status class="text-[12.5px] text-text-2" hidden></p>
          <button type="submit" class="w-full py-3 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all flex items-center justify-center gap-2">
            ${SVG_SEND}
            <span data-edit="submitLabel">${submitLabel}</span>
          </button>
        </form>
      </div>
  </section>`
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

function renderNewsletter(block: BlockConfig): string {
  const title = escapeHtml(
    prop(block.props, 'title', 'Stay in the loop')
  )
  const subtitle = escapeHtml(
    prop(
      block.props,
      'subtitle',
      'Get updates on new features and releases. No spam, ever.'
    )
  )
  const buttonText = escapeHtml(
    prop(block.props, 'buttonText', 'Subscribe')
  )
  const socialProof = prop<string>(block.props, 'socialProof', '')

  const proofText = socialProof
    ? escapeHtml(socialProof)
    : 'Join 2,000+ developers and designers'

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
      <div class="max-w-xl mx-auto text-center">
        <div class="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mx-auto mb-4">
          ${SVG_MAIL}
        </div>
        <h2 class="text-xl md:text-2xl font-bold tracking-tight mb-2">${title}</h2>
        <p class="text-text-2 text-sm mb-6">${subtitle}</p>
        <form onsubmit="return false" class="flex gap-2 max-w-sm mx-auto">
          <input type="email" placeholder="you@example.com" class="flex-1 px-4 py-2.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[13px] outline-none focus:border-brand placeholder:text-text-3 transition-colors" />
          <button type="submit" class="px-5 py-2.5 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dim transition-all shrink-0">${buttonText}</button>
        </form>
        <p class="text-[11px] text-text-3 mt-3">${proofText}</p>
      </div>
  </section>`
}

// ---------------------------------------------------------------------------
// Logo Cloud
// ---------------------------------------------------------------------------

function renderLogoCloud(block: BlockConfig): string {
  const title = escapeHtml(
    prop(block.props, 'title', 'Trusted by teams at')
  )
  const logos = prop<string[]>(block.props, 'logos', [
    'Vercel',
    'Stripe',
    'GitHub',
    'Figma',
    'Notion',
    'Linear',
  ])

  const logosHtml = logos
    .map(
      (name) => `        <div class="group cursor-pointer transition-all">
          <div class="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-all group-hover:scale-105">
            <span class="text-text-3 group-hover:text-brand transition-colors">${logoPlaceholderSvg(name)}</span>
            <span class="text-sm font-semibold text-text-3 group-hover:text-text-0 tracking-tight transition-colors">${escapeHtml(name)}</span>
          </div>
        </div>`
    )
    .join('\n')

  return `  <section class="px-6 md:px-10 py-10 md:py-14">
      <p class="text-center text-[11px] font-medium uppercase tracking-widest text-text-3 mb-6">${title}</p>
      <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
${logosHtml}
      </div>
  </section>`
}

// ---------------------------------------------------------------------------
// Block dispatcher
// ---------------------------------------------------------------------------

/**
 * The About section's Markdown, as HTML.
 *
 * Written out by hand rather than with a Markdown library: the editor's own
 * renderer supports exactly headings, bold, italics, lists and paragraphs, and
 * the published page has to match it rather than support more. Everything is
 * escaped before any formatting is applied, so a stray angle bracket in
 * someone's About text cannot become markup.
 */
function renderContent(block: BlockConfig): string {
  const body = String(block.props.body ?? '').trim()
  if (!body) return ''

  const inline = (text: string) =>
    escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+?)\*/g, '$1<em>$2</em>')

  const html: string[] = []
  let list: string[] = []

  const flush = () => {
    if (list.length === 0) return
    html.push(`<ul class="list-disc list-inside space-y-1 mb-4 text-text-1">${list.join('')}</ul>`)
    list = []
  }

  for (const line of body.split('\n')) {
    const trimmed = line.trim()

    if (trimmed.startsWith('- ')) {
      list.push(`<li>${inline(trimmed.slice(2))}</li>`)
      continue
    }
    flush()

    if (!trimmed) continue
    if (trimmed.startsWith('### ')) {
      html.push(`<h3 class="text-lg font-semibold mt-6 mb-2">${inline(trimmed.slice(4))}</h3>`)
    } else if (trimmed.startsWith('## ')) {
      html.push(`<h2 class="text-2xl font-bold tracking-tight mt-8 mb-3">${inline(trimmed.slice(3))}</h2>`)
    } else if (trimmed.startsWith('# ')) {
      html.push(`<h1 class="text-3xl font-bold tracking-tight mt-8 mb-3">${inline(trimmed.slice(2))}</h1>`)
    } else {
      html.push(`<p class="text-text-1 leading-relaxed mb-4">${inline(trimmed)}</p>`)
    }
  }
  flush()

  const width =
    block.variant === 'columns' ? 'max-w-4xl md:columns-2 md:gap-10' : 'max-w-2xl'
  const highlight =
    block.variant === 'highlight'
      ? ' rounded-xl border border-border-default bg-bg-2 p-6 md:p-8'
      : ''

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
    <div class="${width} mx-auto${highlight}">
${html.join('\n')}
    </div>
  </section>`
}

function renderBanner(block: BlockConfig): string {
  const text = String(block.props.text ?? '')
  if (!text) return ''
  const linkText = String(block.props.linkText ?? '')
  const linkUrl = String(block.props.linkUrl ?? '#')

  const link = linkText
    ? ` <a href="${escapeHtml(linkUrl)}" class="underline font-medium">${escapeHtml(linkText)}</a>`
    : ''

  if (block.variant === 'ribbon') {
    return `  <div class="px-6 py-3 text-center text-sm" style="background:var(--brand, #6366f1);color:#fff">${escapeHtml(text)}${link}</div>`
  }

  return `  <div class="px-6 py-2.5 text-center text-[13px] border-b border-border-default bg-bg-2 text-text-1">${escapeHtml(text)}${link}</div>`
}

function renderDivider(block: BlockConfig): string {
  const height = Number(block.props.height) || 60
  const width = String(block.props.width ?? 'full')
  const maxWidth = width === 'narrow' ? '128px' : width === 'centered' ? '320px' : '100%'

  if (block.variant === 'space') {
    return `  <div style="height:${height}px" aria-hidden="true"></div>`
  }

  if (block.variant === 'dots') {
    const dot =
      '<span style="width:6px;height:6px;border-radius:999px;background:currentColor;opacity:.35"></span>'
    return `  <div style="display:flex;align-items:center;justify-content:center;gap:8px;min-height:${height}px" aria-hidden="true">${dot.repeat(3)}</div>`
  }

  return `  <div style="display:flex;align-items:center;justify-content:center;min-height:${height}px" aria-hidden="true">
    <div style="width:100%;max-width:${maxWidth};margin:0 auto;border-top:1px solid currentColor;opacity:.15"></div>
  </div>`
}

function renderVideo(block: BlockConfig): string {
  const url = String(block.props.url ?? '')
  const title = String(block.props.title ?? '')
  const embed = videoEmbedUrl(url, block.variant)
  // A link we cannot embed would publish as an empty box; leave it out.
  if (!embed) return ''

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
    ${title ? `<h2 class="text-xl font-semibold text-center mb-4">${escapeHtml(title)}</h2>` : ''}
    <div class="max-w-4xl mx-auto" style="aspect-ratio:16/9;border-radius:12px;overflow:hidden">
      <iframe src="${escapeHtml(embed)}" title="${escapeHtml(title || 'Video')}" class="w-full h-full" style="border:0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  </section>`
}

function renderGallery(block: BlockConfig): string {
  const title = String(block.props.title ?? '')
  const images = Array.isArray(block.props.images)
    ? (block.props.images as { src?: string; alt?: string; caption?: string }[])
    : []

  const cells = images
    .filter((image) => image.src)
    .map(
      (image) =>
        `<figure style="border-radius:12px;overflow:hidden;margin:0"><img src="${escapeHtml(image.src ?? '')}" alt="${escapeHtml(image.alt ?? '')}" loading="lazy" class="w-full h-full object-cover" style="aspect-ratio:4/3" />${image.caption ? `<figcaption class="text-[11.5px] text-text-2 mt-1.5">${escapeHtml(image.caption)}</figcaption>` : ''}</figure>`,
    )
    .join('')

  if (!cells) return ''

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
    ${title ? `<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-center mb-8">${escapeHtml(title)}</h2>` : ''}
    <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">${cells}</div>
  </section>`
}

function renderImage(block: BlockConfig): string {
  const src = String(block.props.src ?? '')
  const alt = String(block.props.alt ?? '')
  const title = String(block.props.title ?? '')
  const subtitle = String(block.props.subtitle ?? '')
  const images = Array.isArray(block.props.images)
    ? (block.props.images as { src?: string; alt?: string }[])
    : []

  const picture = (source: string, description: string, extra = '') =>
    `<img src="${escapeHtml(source)}" alt="${escapeHtml(description)}" loading="lazy" class="w-full h-full object-cover"${extra} />`

  if (block.variant === 'grid') {
    const cells = images
      .filter((image) => image.src)
      .map(
        (image) =>
          `<div style="aspect-ratio:4/3;border-radius:12px;overflow:hidden">${picture(image.src ?? '', image.alt ?? '')}</div>`,
      )
      .join('')
    if (!cells) return ''
    return `  <section class="px-6 md:px-10 py-12 md:py-16">
    ${title ? `<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-center mb-8">${escapeHtml(title)}</h2>` : ''}
    <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4">${cells}</div>
  </section>`
  }

  if (!src) return ''

  if (block.variant === 'side-by-side') {
    const imageFirst = block.props.imageSide !== 'right'
    const photo = `<div style="aspect-ratio:4/3;border-radius:16px;overflow:hidden">${picture(src, alt)}</div>`
    const words = `<div>${title ? `<h2 class="text-2xl md:text-3xl font-bold tracking-tight mb-3">${escapeHtml(title)}</h2>` : ''}${subtitle ? `<p class="text-text-2 leading-relaxed">${escapeHtml(subtitle)}</p>` : ''}</div>`

    return `  <section class="px-6 md:px-10 py-12 md:py-16">
    <div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center">
      ${imageFirst ? photo + words : words + photo}
    </div>
  </section>`
  }

  // hero-image (default) — full width above whatever follows
  return `  <section class="px-6 md:px-10 py-12 md:py-16">
    ${title ? `<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-center mb-3">${escapeHtml(title)}</h2>` : ''}
    ${subtitle ? `<p class="text-center text-text-2 mb-8">${escapeHtml(subtitle)}</p>` : ''}
    <div class="max-w-5xl mx-auto" style="aspect-ratio:16/9;border-radius:16px;overflow:hidden">${picture(src, alt)}</div>
  </section>`
}

/**
 * The front slider.
 *
 * Slides are stacked and cross-faded by opacity, and the whole behaviour is a
 * few lines of script at the bottom of the page — an index, a timer and two
 * buttons. Loading a carousel library for that would weigh more than the rest
 * of the page.
 */
function renderSlider(block: BlockConfig): string {
  const slides = sliderSlides(block.props.slides)
  if (slides.length === 0) return ''

  const height = Number(block.props.height) || 520
  const autoplay = block.props.autoplay !== false
  const seconds = Math.max(2, Number(block.props.interval) || 6)
  const id = `slider-${block.id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const panels = slides
    .map((slide, index) => {
      const picture = slide.image
        ? `<img src="${escapeHtml(slide.image)}" alt="${escapeHtml(slide.heading)}" class="w-full h-full object-cover" />`
        : `<div class="w-full h-full" style="background:linear-gradient(135deg,rgba(99,102,241,.3),rgba(0,0,0,.4))"></div>`

      const button = slide.buttonText
        ? renderAction(block, `slides.${index}.buttonText`, `slides.${index}.buttonUrl`, 'mt-6 inline-flex items-center px-6 py-3 rounded-lg bg-brand text-white text-sm font-semibold')
        : '' 

      return `<div data-slide style="position:absolute;inset:0;opacity:${index === 0 ? 1 : 0};transition:opacity .7s ease"${index === 0 ? '' : ' aria-hidden="true"'}>
        ${picture}
        <div style="position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.8),rgba(0,0,0,.4) 50%,rgba(0,0,0,.2))"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center">
          <div class="px-6 md:px-14" style="max-width:42rem">
            ${slide.heading ? `<h2 class="text-3xl md:text-5xl font-bold tracking-tight" style="color:#fff;line-height:1.08">${escapeHtml(slide.heading)}</h2>` : ''}
            ${slide.text ? `<p class="text-base md:text-lg" style="color:rgba(255,255,255,.85);margin-top:12px;line-height:1.6">${escapeHtml(slide.text)}</p>` : ''}
            ${button}
          </div>
        </div>
      </div>`
    })
    .join('')

  const controls =
    slides.length > 1
      ? `<button type="button" data-prev aria-label="Previous slide" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:999px;border:0;background:rgba(0,0,0,.35);color:#fff;cursor:pointer">&#8249;</button>
      <button type="button" data-next aria-label="Next slide" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);width:36px;height:36px;border-radius:999px;border:0;background:rgba(0,0,0,.35);color:#fff;cursor:pointer">&#8250;</button>
      <div data-dots style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px">${slides
        .map(
          (_, index) =>
            `<button type="button" data-dot aria-label="Go to slide ${index + 1}" style="height:6px;width:${index === 0 ? 24 : 6}px;border:0;border-radius:999px;background:${index === 0 ? '#fff' : 'rgba(255,255,255,.5)'};cursor:pointer;transition:all .3s"></button>`,
        )
        .join('')}</div>`
      : ''

  return `  <section id="${id}" data-slider data-autoplay="${autoplay}" data-interval="${seconds}" style="position:relative;overflow:hidden;height:${height}px">
${panels}
    ${controls}
  </section>`
}

function renderProducts(block: BlockConfig): string {
  const items = Array.isArray(block.props.items)
    ? (block.props.items as {
        image?: string
        name?: string
        description?: string
        price?: string
        badge?: string
      }[]).filter((item) => item && (item.name || item.image))
    : []
  if (items.length === 0) return ''

  const title = String(block.props.title ?? '')
  const subtitle = String(block.props.subtitle ?? '')
  const heading = `${title ? `<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-center mb-2">${escapeHtml(title)}</h2>` : ''}${subtitle ? `<p class="text-center text-sm text-text-2 mb-8">${escapeHtml(subtitle)}</p>` : ''}`

  // Laid out absolutely inside its frame rather than by class. A photograph
  // left in the normal flow grows its box to the picture's own height, which
  // beats the frame's aspect ratio and leaves a row of cards at ragged
  // heights — the editor got this right and the published page did not.
  const fill = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center'
  const picture = (item: { image?: string; name?: string }) =>
    item.image
      ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name ?? '')}" loading="lazy" style="${fill}" />`
      : `<div style="${fill};background:var(--bg-2,rgba(127,127,127,.12))"></div>`

  if (block.variant === 'list') {
    const rows = items
      .map(
        (item) =>
          `<div style="display:flex;align-items:center;gap:16px;padding:12px 16px;border-bottom:1px solid var(--border-subtle,rgba(127,127,127,.12))">
            ${item.image ? `<div style="position:relative;width:48px;height:48px;flex:0 0 auto;border-radius:8px;overflow:hidden">${picture(item)}</div>` : ''}
            <div style="min-width:0;flex:1">
              <p class="text-sm font-semibold">${escapeHtml(item.name ?? '')}</p>
              ${item.description ? `<p class="text-[12.5px] text-text-2">${escapeHtml(item.description)}</p>` : ''}
            </div>
            ${item.price ? `<span class="text-sm font-semibold">${escapeHtml(item.price)}</span>` : ''}
          </div>`,
      )
      .join('')

    return `  <section class="px-6 md:px-10 py-12 md:py-16">
    ${heading}
    <div class="max-w-2xl mx-auto" style="border:1px solid var(--border-default,rgba(127,127,127,.2));border-radius:12px;overflow:hidden">${rows}</div>
  </section>`
  }

  const cards = items
    .map(
      (item) =>
        `<div style="border:1px solid var(--border-default,rgba(127,127,127,.2));border-radius:12px;overflow:hidden;display:flex;flex-direction:column">
          <div style="position:relative;aspect-ratio:4/3">${picture(item)}${item.badge ? `<span style="position:absolute;top:10px;left:10px;padding:2px 8px;border-radius:999px;background:var(--brand,#6366f1);color:#fff;font-size:10px;font-weight:600">${escapeHtml(item.badge)}</span>` : ''}</div>
          <div style="padding:16px;flex:1;display:flex;flex-direction:column">
            <h3 class="text-sm font-semibold">${escapeHtml(item.name ?? '')}</h3>
            ${item.description ? `<p class="text-[12.5px] text-text-2" style="margin-top:4px;flex:1;line-height:1.6">${escapeHtml(item.description)}</p>` : ''}
            ${item.price ? `<p class="text-base font-bold" style="margin-top:12px">${escapeHtml(item.price)}</p>` : ''}
          </div>
        </div>`,
    )
    .join('')

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
    ${heading}
    <div class="max-w-5xl mx-auto grid gap-5 md:grid-cols-2 lg:grid-cols-3">${cards}</div>
  </section>`
}

function renderHours(block: BlockConfig): string {
  const rows = Array.isArray(block.props.rows)
    ? (block.props.rows as { day?: string; hours?: string }[])
    : []
  if (rows.length === 0) return ''

  const title = String(block.props.title ?? '')
  const note = String(block.props.note ?? '')
  const highlight = block.props.highlightToday !== false
  const today = todayIndex()

  const body = rows
    .map((row, index) => {
      const isToday = highlight && index === today
      const closed = !String(row.hours ?? '').trim()
      const background = isToday ? 'background:rgba(99,102,241,.1);' : ''
      const weight = isToday ? 'font-weight:600;' : ''
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 16px;border-bottom:1px solid var(--border-subtle,rgba(127,127,127,.12));${background}"><span style="${weight}">${escapeHtml(row.day ?? '')}${isToday ? ' <span style="font-size:10px;color:var(--brand,#6366f1)">Today</span>' : ''}</span><span style="${weight}${closed ? 'opacity:.55' : ''}">${closed ? 'Closed' : escapeHtml(row.hours ?? '')}</span></div>`
    })
    .join('')

  return `  <section class="px-6 md:px-10 py-12 md:py-16">
    <div class="max-w-md mx-auto">
      ${title ? `<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-center mb-6">${escapeHtml(title)}</h2>` : ''}
      <div style="border:1px solid var(--border-default,rgba(127,127,127,.2));border-radius:12px;overflow:hidden">${body}</div>
      ${note ? `<p class="mt-3 text-center text-[12.5px] text-text-2">${escapeHtml(note)}</p>` : ''}
    </div>
  </section>`
}

function renderChart(block: BlockConfig): string {
  const slices = toSlices(block.props.items) as (ReturnType<typeof toSlices>[number] & {
    barFraction: number
  })[]
  if (slices.length === 0) return ''

  const title = String(block.props.title ?? '')
  const subtitle = String(block.props.subtitle ?? '')
  const heading = `${title ? `<h2 class="text-2xl md:text-3xl font-bold tracking-tight text-center mb-2">${escapeHtml(title)}</h2>` : ''}${subtitle ? `<p class="text-center text-sm text-text-2 mb-8">${escapeHtml(subtitle)}</p>` : ''}`

  if (block.variant === 'donut') {
    const starts = slices.reduce<number[]>((offsets, _slice, index) => {
      offsets.push(index === 0 ? 0 : offsets[index - 1] + slices[index - 1].fraction)
      return offsets
    }, [])

    const paths = slices
      .map((slice, index) =>
        slice.fraction <= 0
          ? ''
          : `<path d="${donutSegment(starts[index], starts[index] + slice.fraction)}" fill="${escapeHtml(slice.color)}" />`,
      )
      .join('')

    const key = slices
      .map(
        (slice) =>
          `<li class="flex items-center gap-2.5 text-sm"><span style="width:10px;height:10px;border-radius:2px;background:${escapeHtml(slice.color)}"></span><span class="text-text-1 flex-1">${escapeHtml(slice.label)}</span><span class="font-semibold">${escapeHtml(slice.display)}</span></li>`,
      )
      .join('')

    return `  <section class="px-6 md:px-10 py-16">
    ${heading}
    <div class="max-w-2xl mx-auto flex flex-col md:flex-row items-center gap-8 justify-center">
      <svg viewBox="0 0 100 100" style="width:176px;height:176px" role="img" aria-label="${escapeHtml(title || 'Chart')}">${paths}</svg>
      <ul class="space-y-2 flex-1">${key}</ul>
    </div>
  </section>`
  }

  if (block.variant === 'columns') {
    const columns = slices
      .map(
        (slice) =>
          `<div style="flex:1;max-width:96px;display:flex;flex-direction:column;align-items:center;gap:8px"><span class="text-sm font-bold">${escapeHtml(slice.display)}</span><div style="width:100%;height:${Math.max(4, slice.barFraction * 100)}%;background:${escapeHtml(slice.color)};border-radius:8px 8px 0 0"></div><span class="text-[11.5px] text-text-2 text-center">${escapeHtml(slice.label)}</span></div>`,
      )
      .join('')

    return `  <section class="px-6 md:px-10 py-16">
    ${heading}
    <div class="max-w-3xl mx-auto" style="display:flex;align-items:flex-end;justify-content:center;gap:16px;height:224px">${columns}</div>
  </section>`
  }

  const bars = slices
    .map(
      (slice) =>
        `<div><div class="flex items-baseline justify-between" style="margin-bottom:6px"><span class="text-sm text-text-1">${escapeHtml(slice.label)}</span><span class="text-sm font-semibold">${escapeHtml(slice.display)}</span></div><div style="height:10px;border-radius:999px;background:var(--bg-3, rgba(127,127,127,.2));overflow:hidden"><div style="height:100%;width:${Math.max(2, slice.barFraction * 100)}%;background:${escapeHtml(slice.color)};border-radius:999px"></div></div></div>`,
    )
    .join('')

  return `  <section class="px-6 md:px-10 py-16">
    ${heading}
    <div class="max-w-2xl mx-auto space-y-4">${bars}</div>
  </section>`
}

function renderMap(block: BlockConfig): string {
  const title = String(block.props.title ?? '')
  const address = String(block.props.address ?? '')
  const timing = String(block.props.timing ?? '')
  const height = Number(block.props.height) || 360
  const query = mapQuery(block.props)
  if (!query) return ''

  return `  <section class="section">
    ${title ? `<h2 class="section-title">${escapeHtml(title)}</h2>` : ''}
    <iframe title="${escapeHtml(title || 'Location map')}" src="${escapeHtml(mapEmbedUrl(query))}" loading="lazy" style="width:100%;height:${height}px;border:0;border-radius:12px"></iframe>
    ${address || timing ? `<p class="section-sub">${escapeHtml([address, timing].filter(Boolean).join(' · '))}</p>` : ''}
  </section>`
}

function renderWhatsapp(block: BlockConfig): string {
  const number = whatsappNumber(String(block.props.number ?? ''), String(block.props.countryCode ?? '91'))
  if (!number) return ''
  const label = String(block.props.label ?? 'Chat with us')
  const href = whatsappHref(number, String(block.props.message ?? ''))
  const side = block.props.side === 'left' ? 'left:20px' : 'right:20px'

  if (block.variant === 'inline') {
    return `  <section class="section" style="text-align:center">
    <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:999px;background:#25D366;color:#fff;font-weight:600;text-decoration:none">${escapeHtml(label)}</a>
  </section>`
  }

  return `  <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" style="position:fixed;bottom:20px;${side};z-index:40;display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;background:#25D366;color:#fff;font-weight:600;text-decoration:none;box-shadow:0 8px 24px rgba(0,0,0,.25)">${escapeHtml(label)}</a>`
}

/**
 * Wraps a rendered section in whatever styling it carries.
 *
 * Uses the same rules as the editor canvas, so the published page matches what
 * was on screen. A section with no styling is emitted bare.
 */
function withBlockStyle(block: BlockConfig, html: string): string {
  if (block.style?.hidden && block.style.tablet?.hidden !== false && block.style.mobile?.hidden !== false) return ''
  const colored = hasSectionColors(block.colors)
  if (isEmptyStyle(block.style) && !colored) return html

  // Styling goes in a stylesheet keyed by class rather than inline, because
  // inline styles cannot carry media queries and the tablet and phone
  // overrides need them.
  const image = colored && sectionShowsImage(block.colors) ? ' data-section-image' : ''
  return `  <div class="${sectionClass(block)}"${image}>\n${html}\n  </div>`
}

/** A class per styled section, used to hang its rules off. */
function sectionClass(block: BlockConfig): string {
  return `s-${block.id.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/**
 * Every styled section's rules, gathered into one stylesheet.
 *
 * Walks into containers as well: a widget inside a column is published in its
 * own wrapper, and its colours and box styling need rules like any other.
 * Colours come first so that explicit box styling — a background set by hand —
 * still wins, exactly as it does in the editor.
 */
function sectionStyles(blocks: BlockConfig[], theme: ThemeConfig): string {
  return walk(blocks)
    .map((block) => {
      const selector = `.${sectionClass(block)}`
      const colors = hasSectionColors(block.colors) ? sectionColorCss(theme, block.colors) : null
      const boxRules = styleToRules(block.style, selector)
      const colorRules = colors ? `${selector}{${styleMapToCssText(withoutShadowedBackground(colors.style, block))}}` : ''
      return [colorRules, boxRules].filter(Boolean).join(NEWLINE)
    })
    .filter(Boolean)
    .join(NEWLINE)
}

const NEWLINE = String.fromCharCode(10)

/** A hand-set `background` replaces the preset's background rather than layering under it. */
function withoutShadowedBackground(style: Record<string, string>, block: BlockConfig): Record<string, string> {
  if (!block.style?.background) return style
  const copy = { ...style }
  for (const key of ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat']) delete copy[key]
  return copy
}

/**
 * A container and everything inside it, published.
 *
 * The children go through `renderBlock` exactly as a top-level section does,
 * so a widget publishes identically whether it sits on the page or three
 * containers deep — and so a container inside a container simply works,
 * without this function knowing anything about depth.
 *
 * The arrangement is written as inline style rather than a class because it is
 * per-block: two containers on the same page routinely differ in direction,
 * gap and column count.
 */
function renderContainer(block: BlockConfig): string {
  const props = block.props as {
    direction?: string
    gap?: number
    align?: string
    justify?: string
    columns?: number
    wrap?: boolean
    template?: string
    stackOnMobile?: boolean
    tabletColumns?: number
  }

  const justify: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    between: 'space-between',
    around: 'space-around',
  }
  const align: Record<string, string> = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  }

  const gap = typeof props.gap === 'number' ? props.gap : 24
  const children = block.children ?? []

  const layout =
    block.variant === 'grid'
      ? [
          'display:grid',
          // minmax(0,1fr) rather than 1fr, or a long word in one column pushes
          // the whole grid past the edge of the page on a phone.
          `grid-template-columns:${props.template && /^[\d.\sfrmin()%,a-z-]+$/i.test(props.template) ? props.template : `repeat(${Math.max(1, Math.min(Number(props.columns) || 2, 6))}, minmax(0, 1fr))`}`,
          `gap:${gap}px`,
          `align-items:${align[props.align ?? 'stretch'] ?? 'stretch'}`,
        ]
      : [
          'display:flex',
          `flex-direction:${props.direction === 'column' ? 'column' : 'row'}`,
          `flex-wrap:${props.wrap === false ? 'nowrap' : 'wrap'}`,
          `gap:${gap}px`,
          `align-items:${align[props.align ?? 'stretch'] ?? 'stretch'}`,
          `justify-content:${justify[props.justify ?? 'start'] ?? 'flex-start'}`,
        ]

  const stackClass = props.stackOnMobile || Number(props.tabletColumns) === 2
    ? ` class="${[props.stackOnMobile ? 'sb-stack' : '', Number(props.tabletColumns) === 2 ? 'sb-tablet-2' : ''].filter(Boolean).join(' ')}"`
    : ''
  if (children.length === 0) return `  <div${stackClass} style="${layout.join(';')}"></div>`

  const inner = children
    .map(
      (child) =>
        `    <div style="min-width:0${block.variant === 'grid' ? '' : ';flex:1 1 0'}">\n${renderBlock(child)}\n    </div>`,
    )
    .join('\n')

  return `  <div${stackClass} style="${layout.join(';')}">\n${inner}\n  </div>`
}

function renderBlock(block: BlockConfig): string {
  const rules = elementRules(block)
  let body = renderBlockContent(block)
  for (const path of Object.keys((block.props.elementStyles ?? {}) as object)) {
    const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const marker = new RegExp(`(data-(?:edit|image)=["']${escaped}["'])(?![^>]*data-element-token)`, 'g')
    body = body.replace(marker, `$1 data-element-token="${elementToken(block, path)}"`)
  }
  const content = withBlockStyle(block, body)
  return `${rules ? `<style>${rules}</style>` : ''}${block.props.anchorId || block.props.cssClasses ? `<div${block.props.anchorId ? ` id="${escapeHtml(String(block.props.anchorId))}"` : ''} class="${escapeHtml(String(block.props.cssClasses ?? ''))}">${content}</div>` : content}`
}

function renderBlockContent(block: BlockConfig): string {
  if (isFunctionalWidget(block.type)) {
    const children = layoutTypes.has(block.type as never) ? createElement('div', {style:functionalLayoutStyle(block)}, ...(block.children??[]).map(child => createElement('div',{key:child.id,style:{minWidth:0,flex:'1 1 0'},dangerouslySetInnerHTML:{__html:renderBlock(child)}}))) : undefined
    return renderToStaticMarkup(createElement(FunctionalWidget, { block },children))
  }
  if (isAdditionalWidget(block.type)) {
    // The additional widgets use the same React view in the canvas and in the
    // exported page. Rendering it statically here keeps their safe URL/link
    // handling and markup from drifting into a second implementation.
    return renderToStaticMarkup(createElement(AdditionalWidget, {
      block,
      pages: linkPages,
      base: linkBase,
      asFiles: linkAsFiles,
    }))
  }

  switch (block.type) {
    case 'navbar':
      return renderNavbar(block)
    case 'hero':
      return renderHero(block)
    case 'features':
      return renderFeatures(block)
    case 'pricing':
      return renderPricing(block)
    case 'cta':
      return renderCta(block)
    case 'footer':
      return renderFooter(block)
    case 'testimonials':
      return renderTestimonials(block)
    case 'stats':
      return renderStats(block)
    case 'faq':
      return renderFaq(block)
    case 'team':
      return renderTeam(block)
    case 'contact':
      return renderContact(block)
    case 'newsletter':
      return renderNewsletter(block)
    case 'logocloud':
      return renderLogoCloud(block)
    case 'map':
      return renderMap(block)
    case 'whatsapp':
      return renderWhatsapp(block)
    case 'chart':
      return renderChart(block)
    case 'hours':
      return renderHours(block)
    case 'slider':
      return renderSlider(block)
    case 'products':
      return renderProducts(block)
    case 'content':
      return renderContent(block)
    case 'image':
      return renderImage(block)
    case 'video':
      return renderVideo(block)
    case 'gallery':
      return renderGallery(block)
    case 'divider':
      return renderDivider(block)
    case 'banner':
      return renderBanner(block)
    case 'container':
      return renderContainer(block)
    default:
      return `  <!-- Unknown block type: ${escapeHtml(block.type)} -->`
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function exportSiteToHTML(config: SiteConfig, options?: ExportSiteOptions): string {
  const original = exportOriginalDocument(config, options?.base, options?.fileLinks, options?.assetOrigin)
  if (original !== null) return original
  const theme = resolveTheme(config.theme)
  const fonts = [theme.fontSans, theme.fontDisplay, theme.fontMono]
  const fontUrl = googleFontUrl(fonts)
  const settings = options?.settings
  leadsEndpoint = options?.leadsEndpoint ?? ''
  leadsSiteId = options?.siteId ?? ''
  linkPages = ensurePages(config)
  linkBase = options?.base ?? ''
  linkAsFiles = options?.fileLinks ?? false
  linkActivePageId = options?.activePageId

  // Sends the enquiry and tells the visitor what happened. Kept small and
  // dependency-free: this runs on the customer's published page.

  // Each slider runs on its own: an index, a timer, and the two buttons.
  const sliderScript = `  <script>
    document.querySelectorAll('[data-slider]').forEach(function (root) {
      var slides = root.querySelectorAll('[data-slide]')
      if (slides.length < 2) return

      var dots = root.querySelectorAll('[data-dot]')
      var index = 0
      var timer = null

      function show(next) {
        index = (next + slides.length) % slides.length
        slides.forEach(function (slide, i) {
          slide.style.opacity = i === index ? 1 : 0
          if (i === index) { slide.removeAttribute('aria-hidden') } else { slide.setAttribute('aria-hidden', 'true') }
        })
        dots.forEach(function (dot, i) {
          dot.style.width = i === index ? '24px' : '6px'
          dot.style.background = i === index ? '#fff' : 'rgba(255,255,255,.5)'
        })
      }

      function start() {
        if (root.dataset.autoplay !== 'true') return
        stop()
        timer = setInterval(function () { show(index + 1) }, Number(root.dataset.interval || 6) * 1000)
      }
      function stop() { if (timer) { clearInterval(timer); timer = null } }

      var prev = root.querySelector('[data-prev]')
      var next = root.querySelector('[data-next]')
      if (prev) prev.addEventListener('click', function () { show(index - 1); start() })
      if (next) next.addEventListener('click', function () { show(index + 1); start() })
      dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () { show(i); start() })
      })

      // Stop while the visitor is reading a slide, and while the tab is hidden
      // so a background tab is not animating for nothing.
      root.addEventListener('mouseenter', stop)
      root.addEventListener('mouseleave', start)
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { stop() } else { start() }
      })

      start()
    })
  </script>`

  const enquiryScript = `  <script>
    document.querySelectorAll('[data-enquiry-form]').forEach(function (form) {
      var status = form.querySelector('[data-enquiry-status]')
      var button = form.querySelector('button[type="submit"]')

      function say(text, ok) {
        if (!status) return
        status.hidden = false
        status.textContent = text
        status.style.color = ok ? '' : '#f87171'
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault()
        var endpoint = form.dataset.endpoint
        if (!endpoint) {
          say('This form is not connected yet.', false)
          return
        }

        var data = Object.fromEntries(new FormData(form).entries())
        data.siteId = form.dataset.site || null
        data.slug = location.pathname.split('/').filter(Boolean).pop() || null

        if (button) { button.disabled = true }
        say('Sending…', true)

        fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
        })
          .then(function (response) {
            if (!response.ok) throw new Error('failed')
            form.reset()
            say('Thank you — we will get back to you shortly.', true)
          })
          .catch(function () {
            say('Sorry, that did not send. Please call us instead.', false)
          })
          .finally(function () {
            if (button) { button.disabled = false }
          })
      })
    })
  </script>`

  // The published page is assembled the way the editor draws it: the shared
  // header, then the page's own blocks, then the shared footer.
  const pageBlocks = [...(config.header ?? []), ...config.blocks, ...(config.footer ?? [])]

  const hasFaq = pageBlocks.some((b) => b.type === 'faq')
  const hasAdditionalTabs = pageBlocks.some((b) => b.type === 'tabs')

  const renderAll = (list: BlockConfig[]) => list.map((b) => renderBlock(b)).join('\n\n')
  // This page's own colours wrap only its own sections, so the shared header
  // and footer keep the site theme.
  const pageStyle = pageColorStyleText(config.pageColors)
  const mainHtml = renderAll(config.blocks)
  const blocksHtml = [
    `<div data-theme-region="header" style="${escapeHtml(regionStyleText(regionColorVars(config.theme, 'header')))}">${renderAll(config.header ?? [])}</div>`,
    pageStyle ? `<div data-page-colors style="${escapeHtml(pageStyle)}">\n${mainHtml}\n</div>` : mainHtml,
    `<div data-theme-region="footer" style="${escapeHtml(regionStyleText(regionColorVars(config.theme, 'footer')))}">${renderAll(config.footer ?? [])}</div>`,
  ].filter(Boolean).join('\n\n')
  const sectionCss = sectionStyles(pageBlocks, theme)

  const pageTitle = (settings?.seoTitle || settings?.siteName || config.name || 'Website').trim()
  const pageDescription = (settings?.seoDescription || settings?.siteDescription || '').trim()
  const ogTitle = (settings?.seoTitle || settings?.siteName || pageTitle).trim()
  const ogDescription = (settings?.seoDescription || settings?.siteDescription || pageDescription).trim()
  const ogImage = (settings?.ogImageUrl || '').trim()
  const faviconUrl = (settings?.faviconUrl || '').trim()
  const gaId = (settings?.gaId || '').trim()
  const posthogKey = (settings?.posthogKey || '').trim()
  const lang = normalizeLanguage(settings?.language)

  const descriptionMeta = pageDescription
    ? `  <meta name="description" content="${escapeHtml(pageDescription)}" />\n`
    : ''
  const ogDescriptionMeta = ogDescription
    ? `  <meta property="og:description" content="${escapeHtml(ogDescription)}" />\n`
    : ''
  const ogImageMeta = ogImage
    ? `  <meta property="og:image" content="${escapeHtml(ogImage)}" />\n`
    : ''
  const faviconLink = faviconUrl
    ? `  <link rel="icon" href="${escapeHtml(faviconUrl)}" />\n`
    : '  <link rel="icon" href="data:," />\n'

  const gaScript = gaId
    ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', ${JSON.stringify(gaId)});
  </script>`
    : ''

  const posthogScript = posthogKey
    ? `
  <script>
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");
    2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}
    (p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",
    (r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",
    u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},
    u.people.toString=function(){return u.toString(1)+".people"},o="init capture register register_once alias unregister identify set_config reset opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing".split(" "),
    n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init(${JSON.stringify(posthogKey)}, { api_host: 'https://us.i.posthog.com' });
  </script>`
    : ''

  const faqScript = hasFaq
    ? `
    <script>
      function toggleFaq(btn) {
        var content = btn.nextElementSibling;
        var chevron = btn.querySelector('.faq-chevron');
        var isOpen = btn.getAttribute('aria-expanded') === 'true';

        // Close all
        var items = btn.closest('section').querySelectorAll('[aria-expanded]');
        items.forEach(function(b) {
          b.setAttribute('aria-expanded', 'false');
          b.nextElementSibling.style.maxHeight = '0';
          b.nextElementSibling.style.paddingBottom = '0';
          var c = b.querySelector('.faq-chevron');
          if (c) { c.style.transform = ''; c.classList.remove('text-brand'); c.classList.add('text-text-3'); }
        });

        // Toggle current
        if (!isOpen) {
          btn.setAttribute('aria-expanded', 'true');
          content.style.maxHeight = '500px';
          content.style.paddingBottom = '1rem';
          if (chevron) { chevron.style.transform = 'rotate(180deg)'; chevron.classList.add('text-brand'); chevron.classList.remove('text-text-3'); }
        }
      }
    </script>`
    : ''

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" data-widget-site="${escapeHtml(config.name)}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>
${descriptionMeta}  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
${ogDescriptionMeta}${ogImageMeta}${faviconLink}

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${fontUrl}" />

  <!-- Tailwind CSS (Play CDN) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          // Colours read the same variables the editor does, as channel
          // triplets so opacity modifiers (bg-brand/10) keep working. That
          // indirection is what lets a section re-point them for itself.
          colors: {
            'bg-0': 'rgb(var(--rgb-bg-0) / <alpha-value>)',
            'bg-1': 'rgb(var(--rgb-bg-1) / <alpha-value>)',
            'bg-2': 'rgb(var(--rgb-bg-2) / <alpha-value>)',
            'bg-3': 'rgb(var(--rgb-bg-3) / <alpha-value>)',
            'bg-4': 'rgb(var(--rgb-bg-4) / <alpha-value>)',
            'bg-5': 'rgb(var(--rgb-bg-5) / <alpha-value>)',
            'text-0': 'rgb(var(--rgb-text-0) / <alpha-value>)',
            'text-1': 'rgb(var(--rgb-text-1) / <alpha-value>)',
            'text-2': 'rgb(var(--rgb-text-2) / <alpha-value>)',
            'text-3': 'rgb(var(--rgb-text-3) / <alpha-value>)',
            'brand': {
              DEFAULT: 'rgb(var(--rgb-brand) / <alpha-value>)',
              dim: 'rgb(var(--rgb-brand-dim) / <alpha-value>)',
            },
            'border-default': 'rgb(var(--rgb-border-default) / <alpha-value>)',
            'border-subtle': 'rgb(var(--rgb-border-subtle) / <alpha-value>)',
            'border-hover': 'rgb(var(--rgb-border-hover) / <alpha-value>)',
          },
          fontFamily: {
            sans: ['"${theme.fontSans}"', '-apple-system', 'system-ui', 'sans-serif'],
            display: ['"${theme.fontDisplay}"', 'system-ui', 'sans-serif'],
            mono: ['"${theme.fontMono}"', 'ui-monospace', 'monospace'],
          },
          borderRadius: {
            DEFAULT: '${theme.radius}px',
            lg: '${theme.radiusLg}px',
          },
        },
      },
    }
  </script>

  <!-- Theme CSS Custom Properties -->
  <style>
    :root {
${Object.entries(themeToCSS(theme)).map(([name, value]) => `      ${name}: ${value};`).join(NEWLINE)}
    }

    *, *::before, *::after { box-sizing: border-box; }
    a[aria-current="page"] { color: var(--color-brand); font-weight: 600; }
    [data-nav-mobile="links"] nav { flex-wrap: wrap; justify-content: center; }
    [data-nav-mobile="links"] nav .hidden:not([data-edit]) { display: flex !important; flex-wrap: wrap; justify-content: center; gap: 8px 16px; }
    [data-nav-mobile="links"] nav details { display: none; }
    @keyframes sb-fade { from { opacity: 0 } to { opacity: 1 } }
    @keyframes sb-slide-up { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }
    @keyframes sb-slide-left { from { opacity: 0; transform: translateX(32px) } to { opacity: 1; transform: none } }
    @keyframes sb-zoom { from { opacity: 0; transform: scale(.94) } to { opacity: 1; transform: none } }
    @media (prefers-reduced-motion: reduce) { [style*="sb-"] { animation: none !important } }
    @media (max-width: 1024px) { .sb-tablet-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
    @media (max-width: 640px) { .sb-stack, .sb-tablet-2 { grid-template-columns: minmax(0, 1fr) !important; flex-direction: column !important; } }

    /* The width a section's content runs to. The section itself stays full
       width so a background still reaches both edges; only what is inside it
       is capped and centred, which is what stops a headline stretching the
       whole of a wide monitor. */
    body { --site-content-width: 1200px; }
    body section > * { max-width: var(--site-content-width); margin-inline: auto; }
    body section > .full-bleed { max-width: none; }

    body {
      margin: 0;
      background-color: ${theme.bg0};
      color: ${theme.text0};
      font-family: "${theme.fontSans}", -apple-system, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: "${theme.fontDisplay}", system-ui, sans-serif;
    }

    .faq-content {
      transition: max-height 0.2s ease, padding-bottom 0.2s ease;
    }

    .faq-chevron {
      transition: transform 0.2s ease;
    }

    /* Buttons, selection and image sections, from the theme variables. */
${themeRulesCss()}

    /* Per-section colours and styling, including the tablet and phone overrides. */
${sectionCss}
  </style>
${gaScript}
${posthogScript}
</head>
<body>

${blocksHtml}
${faqScript}
${sliderScript}
${hasAdditionalTabs ? `<script>${additionalWidgetScript}</script>` : ''}
${enquiryScript}
<style>${functionalCss}</style>
<script>${functionalWidgetScript}</script>
</body>
</html>`
}

export async function exportToHTML(
  config: SiteConfig,
  options?: ExportSiteOptions
): Promise<string> {
  return exportSiteToHTML(config, options)
}

export function downloadHTML(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function previewHTML(html: string): void {
  const previewWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!previewWindow) {
    throw new Error('Preview popup was blocked')
  }
  previewWindow.document.open()
  previewWindow.document.write(html)
  previewWindow.document.close()
}

/** One published page: where it lives and what it contains. */
export interface ExportedPage {
  /** Address within the site — "" for the home page, "about-us" for the rest. */
  slug: string
  /** File name if the site is saved to disk. */
  file: string
  name: string
  html: string
}

/**
 * The whole site, one HTML file per page.
 *
 * Publishing used to send a single page — whichever one happened to be open —
 * so a site with an About and a Services page went live as a home page and
 * nothing else, with a menu of links that led nowhere.
 *
 * Each page is rendered with the shared header and footer around it, and with
 * the menu resolved against every page, so the links work from any of them.
 */
export function exportSitePages(
  config: SiteConfig,
  options?: ExportSiteOptions,
): ExportedPage[] {
  const pages = ensurePages(config)

  return pages.map((page) => {
    const file = pageFileName(page, pages)
    const isHome = pages[0]?.id === page.id

    // Each page is exported as if it were the active one.
    const html = exportSiteToHTML({ ...config, blocks: page.blocks, pageColors: page.colors }, {
      ...options,
      activePageId: page.id,
      settings: {
        ...options?.settings,
        // The page's own name titles it, unless the site set a title itself.
        seoTitle:
          options?.settings?.seoTitle ??
          (isHome ? config.name : `${page.name} — ${config.name}`),
      },
    })

    return {
      slug: isHome ? '' : file.replace(/\.html$/, ''),
      file,
      name: page.name,
      html,
    }
  })
}
