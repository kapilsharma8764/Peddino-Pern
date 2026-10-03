import type { SectionColors, SiteConfig } from '@/blocks/types'
import { readSectionColors, writeSectionColors } from '@/lib/original-sections'
import { safeEdits, type ColourEdits } from '@/lib/section-colour-probe'

/** The saved source stays authoritative; never save a script-mutated preview DOM. */
export const NODE_ATTR = 'data-builder-node'
const contentSelector = 'h1,h2,h3,h4,h5,h6,p,a,button,img,label,li,span,small,strong,b,em,div,td,figcaption'
export interface VisualNode {
  id: string
  label: string
  kind: 'image' | 'link' | 'text' | 'section'
  text: string
  href: string
  src: string
  alt: string
  color: string
  background: string
  backgroundImage: string
  width: string
  height: string
  margin: string
  fontFamily: string
  fontWeight: string
  borderRadius: string
  fontSize: string
  padding: string
  align: string
  hidden: boolean
  children: string[]
  /** Section colours stored on the element, if it has been restyled. */
  ptColors?: SectionColors
}
export interface VisualSection { id: string; label: string; kind: 'header' | 'menu' | 'section' | 'footer' }
export interface VisualPatch { width?: string; height?: string; margin?: string; fontFamily?: string; fontWeight?: string; borderRadius?: string; text?: string; href?: string; src?: string; alt?: string; color?: string; background?: string; backgroundImage?: string; fontSize?: string; padding?: string; align?: string; hidden?: boolean; imageFrame?: { width: number; height: number } | null
  /** Section colours; null removes them. Stored on the element, so they save and export with the page. */
  ptColors?: SectionColors | null }

export function parseOriginal(html: string): Document {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll(`[${NODE_ATTR}]`).forEach(el => el.removeAttribute(NODE_ATTR))
  doc.body.querySelectorAll('*').forEach((el, index) => {
    if (!el.matches('script,style,link,meta,br,path,use')) el.setAttribute(NODE_ATTR, `n${index}`)
  })
  return doc
}

function canEditText(el: Element) {
  const ownText = [...el.childNodes].some(node => node.nodeType === 3 && node.textContent?.trim())
  return el.matches(contentSelector) && !el.matches('img') && !el.querySelector('h1,h2,h3,h4,h5,h6,p,ul,ol,div,section,img') && (!el.querySelector('a,button') || ownText) && Boolean(el.textContent?.trim())
}
export function describeNode(el: HTMLElement): VisualNode {
  const kind = el.matches('img') ? 'image' : el.matches('a,button') ? 'link' : canEditText(el) ? 'text' : 'section'
  const content = !el.matches('a,button') && el.querySelector('a,button') ? [...el.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('') : el.textContent || ''
  const text = kind === 'text' || kind === 'link' ? content.trim() : ''
  const label = kind === 'image' ? el.getAttribute('alt') || 'Image' : text.slice(0, 48) || el.querySelector('h1,h2,h3,h4')?.textContent?.trim().slice(0, 48) || (el.matches('nav,.navbar,.nav') ? 'Navigation' : el.matches('footer') ? 'Footer' : 'Section')
  return {
    id: el.getAttribute(NODE_ATTR)!, label, kind, text,
    href: el.getAttribute('href') || '', src: el.getAttribute('src') || '', alt: el.getAttribute('alt') || '',
    color: el.style.color, background: el.style.backgroundColor, backgroundImage: el.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1] || '', fontSize: el.style.fontSize.replace('px', ''),
    width: el.style.width, height: el.style.height, margin: el.style.margin, fontFamily: el.style.fontFamily, fontWeight: el.style.fontWeight, borderRadius: el.style.borderRadius,
    padding: el.style.padding.replace('px', ''), align: el.style.textAlign, hidden: el.style.display === 'none', ptColors: readSectionColors(el),
    children: kind !== 'section' ? [] : [...el.querySelectorAll<HTMLElement>(contentSelector)]
      .filter(child => child.matches('img,a,button') || (canEditText(child) && !child.closest('a,button') && !child.parentElement?.matches('h1,h2,h3,h4,h5,h6,p')))
      .map(child => child.getAttribute(NODE_ATTR)!).filter(Boolean),
  }
}

/** The header, main nav and footer of a parsed document, by the markup patterns real templates use. */
export function findChrome(doc: Document) {
  const footer = doc.body.querySelector<HTMLElement>('[data-site-region="footer"],footer,[role="contentinfo"],#footer,.site-footer,.footer,.footer-area,.footer-section,#footer-wrapper')
  const menu = [...doc.body.querySelectorAll<HTMLElement>('nav,.navbar,[role="navigation"],.main-menu,#main-menu,#mainNav,.mainNav,#navigation,.navigation,#nav,.main-nav,#menu,.mainmenu')].find(el => !footer?.contains(el)) || null
  const header = doc.body.querySelector<HTMLElement>('[data-site-region="header"]') || menu?.closest<HTMLElement>('header,[role="banner"],#header,.site-header,.header-area,.header-section,.header,#header-wrapper') || menu || doc.body.querySelector<HTMLElement>('header,[role="banner"],#header,.site-header,.header-area,.header-section,.header,#header-wrapper')
  return { header, menu, footer }
}

export function originalModel(html: string) {
  const doc = parseOriginal(html)
  const nodes = new Map([...doc.body.querySelectorAll<HTMLElement>(`[${NODE_ATTR}]`)].map(el => [el.getAttribute(NODE_ATTR)!, describeNode(el)]))
  const { header, menu, footer } = findChrome(doc)
  const sections: VisualSection[] = []
  const add = (el: HTMLElement | null, label: string, kind: VisualSection['kind']) => {
    const id = el?.getAttribute(NODE_ATTR)
    if (id) sections.push({ id, label, kind })
  }
  add(header, 'Header', 'header')
  add(menu?.querySelector<HTMLElement>('ul') || menu, 'Main menu', 'menu')
  const candidates = [...doc.body.querySelectorAll<HTMLElement>('section,main > div,article,header,body > div,body > div > div')]
    .filter(el => el !== header && el !== footer && !header?.contains(el) && !footer?.contains(el) && !el.contains(header) && !el.contains(footer) && (el.textContent?.trim() || el.hasAttribute('data-studio-widget')))
  candidates.filter(el => !candidates.some(parent => parent !== el && parent.contains(el))).forEach((el, i) => add(el, el.dataset.widgetLabel || el.querySelector('h1,h2,h3')?.textContent?.trim().slice(0, 38) || `Page section ${i + 1}`, 'section'))
  doc.querySelectorAll<HTMLElement>('[data-studio-widget]').forEach(el => {
    if (!sections.some(section => section.id === el.getAttribute(NODE_ATTR))) add(el, el.dataset.widgetLabel || 'Widget', 'section')
  })
  add(footer, 'Footer', 'footer')
  return { doc, nodes, sections }
}

export function safeVisualUrl(value: string, image = false): boolean {
  if (!value) return true
  if (!image && /^page:[^\s#]+(?:#.*)?$/.test(value)) return true
  const clean = [...value].filter(character => character.charCodeAt(0) > 32).join('')
  if (image && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(clean)) return true
  return !/^[a-z][a-z0-9+.-]*:/i.test(clean) || /^(https?:|mailto:|tel:)/i.test(clean)
}

export function patchOriginal(html: string, id: string, patch: VisualPatch): string {
  const doc = parseOriginal(html)
  const el = [...doc.body.querySelectorAll<HTMLElement>(`[${NODE_ATTR}]`)].find(node => node.getAttribute(NODE_ATTR) === id)
  if (!el) throw new Error('Select this item again before editing.')
  if (patch.text !== undefined) {
    const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const texts: Text[] = []
    while (walker.nextNode()) if (walker.currentNode.textContent?.trim() && !(walker.currentNode.parentElement?.closest('script,style')) && (el.matches('a,button') || !walker.currentNode.parentElement?.closest('a,button'))) texts.push(walker.currentNode as Text)
    if (texts.length) { texts[0].textContent = patch.text; texts.slice(1).forEach(node => { node.textContent = '' }) }
    else el.append(doc.createTextNode(patch.text))
  }
  for (const key of ['href', 'src', 'alt'] as const) {
    const value = patch[key]
    if (value === undefined) continue
    if (key !== 'alt' && !safeVisualUrl(value, key === 'src')) throw new Error('Use a website address or choose an image file.')
    el.setAttribute(key, value)
    if (key === 'src') {
      el.removeAttribute('srcset')
      for (const lazy of ['data-src', 'data-original', 'data-lazy']) if (el.hasAttribute(lazy)) el.setAttribute(lazy, value)
      el.closest('picture')?.querySelectorAll('source').forEach(source => source.setAttribute('srcset', value))
      const frame = patch.imageFrame
      if (frame && frame.width > 0 && frame.height > 0) {
        const ratio = `${Math.round(frame.width)} / ${Math.round(frame.height)}`
        el.style.setProperty('display', 'block', 'important')
        el.style.setProperty('width', '100%', 'important')
        el.style.setProperty('max-width', '100%', 'important')
        el.style.setProperty('height', '100%', 'important')
        el.style.setProperty('object-fit', 'cover', 'important')
        el.style.setProperty('object-position', 'center', 'important')
        el.parentElement?.style.setProperty('position', 'relative', 'important')
        el.parentElement?.style.setProperty('width', '100%', 'important')
        el.parentElement?.style.setProperty('aspect-ratio', ratio, 'important')
        el.parentElement?.style.setProperty('overflow', 'hidden', 'important')
      }
    }
  }
  for (const [key, property] of [['color','color'],['background','background-color'],['align','text-align'],['fontSize','font-size'],['padding','padding'],['width','width'],['height','height'],['margin','margin'],['fontFamily','font-family'],['fontWeight','font-weight'],['borderRadius','border-radius']] as const) {
    if (patch[key] !== undefined) {
      const value = patch[key]!.trim()
      if (!value) el.style.removeProperty(property)
      else el.style.setProperty(property, (['fontSize','padding','width','height','margin','borderRadius'].includes(key)) && /^\d+(\.\d+)?$/.test(value) ? `${value}px` : value, 'important')
    }
  }
  if (patch.ptColors !== undefined) writeSectionColors(el, patch.ptColors)
  if (patch.hidden !== undefined) {
    if (patch.hidden) el.style.setProperty('display', 'none', 'important')
    else el.style.removeProperty('display')
  }
  if (patch.backgroundImage !== undefined) {
    if (!safeVisualUrl(patch.backgroundImage, true)) throw new Error('Use an image address or upload an image.')
    if (patch.backgroundImage) el.style.setProperty('background-image', `url(${JSON.stringify(patch.backgroundImage)})`, 'important')
    else el.style.removeProperty('background-image')
  }
  doc.querySelectorAll(`[${NODE_ATTR}]`).forEach(node => node.removeAttribute(NODE_ATTR))
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

/**
 * Writes colour edits (node id -> colour property -> `#rrggbb`) into the saved page as inline styles on exactly
 * those elements. Anything that is not a known colour property with a real colour is dropped.
 */
export function recolorOriginal(html: string, edits: ColourEdits): string {
  const clean = safeEdits(edits)
  const doc = parseOriginal(html)
  const nodes = new Map([...doc.body.querySelectorAll<HTMLElement>(`[${NODE_ATTR}]`)].map(el => [el.getAttribute(NODE_ATTR)!, el]))
  for (const [id, props] of Object.entries(clean)) {
    const el = nodes.get(id)
    if (!el) continue
    for (const [property, value] of Object.entries(props)) el.style.setProperty(property, value, 'important')
  }
  doc.querySelectorAll(`[${NODE_ATTR}]`).forEach(node => node.removeAttribute(NODE_ATTR))
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}

export function sharedRegion(model: ReturnType<typeof originalModel>, id: string) {
  const selected = model.doc.querySelector(`[${NODE_ATTR}="${id}"]`)
  return model.sections.find(section => (section.kind === 'header' || section.kind === 'footer') && model.doc.querySelector(`[${NODE_ATTR}="${section.id}"]`)?.contains(selected))
}

/** Match shared content by its original identity, never by another page's node index. */
export function sharedOriginalEdits(config: SiteConfig, id: string, patch: VisualPatch): Record<string, string> {
  const current = config.blocks.find(block => block.props.originalTemplate)!
  const model = originalModel(String(current.props.html))
  const region = sharedRegion(model, id)
  const element = model.doc.querySelector(`[${NODE_ATTR}="${id}"]`)!
  const updates: Record<string, string> = { [current.id]: patchOriginal(String(current.props.html), id, patch) }
  if (!region) return updates
  const identity = (el: Element) => `${el.tagName}|${el.matches('img') ? el.getAttribute('src') : el.textContent?.replace(/\s+/g, ' ').trim()}`
  for (const page of config.pages || []) for (const block of page.blocks) {
    if (!block.props.originalTemplate || block.id === current.id) continue
    const other = originalModel(String(block.props.html))
    const otherRegion = other.sections.find(section => section.kind === region.kind)
    if (!otherRegion) continue
    const root = other.doc.querySelector(`[${NODE_ATTR}="${otherRegion.id}"]`)!
    const matches = id === region.id ? [root] : [...root.querySelectorAll(`[${NODE_ATTR}]`)].filter(el => identity(el) === identity(element))
    // An ambiguous match is left untouched instead of changing the wrong text.
    if (matches.length === 1) updates[block.id] = patchOriginal(String(block.props.html), matches[0].getAttribute(NODE_ATTR)!, patch)
  }
  return updates
}

/** Move within the existing parent to preserve the template's layout hierarchy. */
export function moveOriginalNode(html: string, id: string, direction: -1 | 1): string {
  const doc = parseOriginal(html)
  const node = doc.querySelector(`[${NODE_ATTR}="${id}"]`)
  if (!node) throw new Error('Select the item again.')
  let sibling = direction === -1 ? node.previousElementSibling : node.nextElementSibling
  while (sibling && sibling.matches('script,style,link')) sibling = direction === -1 ? sibling.previousElementSibling : sibling.nextElementSibling
  if (!sibling) return html
  if (direction === -1) sibling.before(node); else sibling.after(node)
  doc.querySelectorAll(`[${NODE_ATTR}]`).forEach(el=>el.removeAttribute(NODE_ATTR))
  return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
}
