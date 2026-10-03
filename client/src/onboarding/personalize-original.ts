import type { BusinessProfile } from './profile'

const BRAND_SELECTORS = '[data-site-name],.navbar-brand,.logo a,.logo,.site-title,.logo-text,.brand,.site-logo,header .logo'
const GENERIC_NAMES = new Set(['home', 'welcome', 'index', 'template', 'website', 'menu', 'about', 'contact', 'logo'])
const TITLE_FILLER = new Set(['free', 'template', 'templates', 'html', 'html5', 'css', 'css3', 'bootstrap', 'responsive', 'website', 'theme', 'by', 'ecommerce', 'one', 'page', 'onepage'])
const PHONE_TEXT = /\+?\(?\d[\d\s().-]{7,}\d/g
const EMAIL_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const SOCIAL_SITES = ['facebook', 'instagram', 'twitter', 'x.com', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'whatsapp']
const ADDRESS_SELECTORS = 'address,.address,.contact-address,.footer-address,[data-address]'

function textNodes(root: Node): Text[] {
  const found: Text[] = []
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (parent && !parent.closest('script,style,noscript,textarea')) found.push(node as Text)
  }
  return found
}

/** The template's own business name, read from its logo or its title, so it can be swapped everywhere it is written. */
export function originalBrandNames(doc: Document): string[] {
  const names = new Set<string>()
  const keep = (value: string | null | undefined) => {
    const text = value?.replace(/\s+/g, ' ').trim() ?? ''
    if (text.length >= 3 && text.length <= 40 && !GENERIC_NAMES.has(text.toLowerCase())) names.add(text)
  }
  doc.querySelectorAll<HTMLElement>(BRAND_SELECTORS).forEach((el) => { if (!el.querySelector('img') || el.textContent?.trim()) keep(el.textContent) })
  doc.querySelectorAll<HTMLImageElement>(BRAND_SELECTORS.split(',').map((selector) => `${selector} img`).join(',')).forEach((img) => keep(img.alt))
  const parts = (doc.title ?? '').split(/\s+[|\-–—:·•]\s+/).map((part) => part.trim())
  const first = parts[0]
  const bare = (first ?? '').split(/\s+/).filter((word) => !TITLE_FILLER.has(word.toLowerCase())).join(' ')
  if (names.size === 0 && bare && bare.split(' ').length <= 3) keep(bare)
  else for (const part of parts) if (names.has(part)) keep(part)
  return [...names].sort((a, b) => b.length - a.length)
}

function swapEverywhere(doc: Document, olds: string[], name: string) {
  for (const node of textNodes(doc.body)) {
    let text = node.data
    for (const old of olds) text = text.split(old).join(name)
    if (text !== node.data) node.data = text
  }
  doc.querySelectorAll<HTMLElement>('[alt],[title],[aria-label]').forEach((el) => {
    for (const attr of ['alt', 'title', 'aria-label']) {
      const value = el.getAttribute(attr)
      if (value && olds.some((old) => value.includes(old))) el.setAttribute(attr, olds.reduce((out, old) => out.split(old).join(name), value))
    }
  })
}

const MAX_ADDRESS_SPOTS = 4
const ADDRESS_ICON = /map-marker|geo-alt|map-pin|location|lni-map/i
const ADDRESS_LABEL = /^(address|location|find us|our location|visit us|our address)$/i

/** Most templates write the address as a pin icon followed by the text; this puts the visitor's address after each pin. */
function personalizeAddressNextToIcons(doc: Document, address: string) {
  // An address is written a few times (header, contact, footer); more pins than that are listings, not the business.
  let written = 0
  doc.querySelectorAll<HTMLElement>('i,span').forEach((icon) => {
    if (written >= MAX_ADDRESS_SPOTS || icon.children.length || icon.textContent?.trim() || !ADDRESS_ICON.test(icon.className)) return
    // `<span class="ic"><i class="pin"></i></span> text`: the icon's own wrapper is what the text follows.
    let anchor: HTMLElement = icon
    while (anchor.parentElement && anchor.parentElement.children.length === 1 && !anchor.parentElement.textContent?.trim()) anchor = anchor.parentElement
    for (let next = anchor.nextSibling; next; next = next.nextSibling) {
      const text = next.textContent?.trim() ?? ''
      if (!text) continue
      if (ADDRESS_LABEL.test(text)) return
      if (next.nodeType === Node.TEXT_NODE) { (next as Text).data = ` ${address}`; written++ }
      else if (next instanceof HTMLElement && !next.querySelector('a,form,input,img')) { next.textContent = address; written++ }
      return
    }
    // Icon and text sit together inside a link or paragraph with nothing after the icon: the text is in the parent.
    const parent = anchor.parentElement
    if (parent && !ADDRESS_LABEL.test(parent.textContent?.trim() ?? '') && (parent.textContent?.trim().length ?? 0) > 6 && !parent.querySelector('form,input,img') && parent.children.length <= 2) {
      const own = [...parent.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
      if (own) { (own as Text).data = ` ${address}`; written++ }
    }
  })
}

/** Writes the visitor's own phone, email, address and social links over the template's sample ones, wherever they appear. */
function personalizeContacts(doc: Document, profile: BusinessProfile) {
  const { mobile, email, address } = profile.contact
  const digits = (value: string) => value.replace(/\D/g, '').length
  for (const node of textNodes(doc.body)) {
    let text = node.data
    if (mobile) text = text.replace(PHONE_TEXT, (match) => (digits(match) >= 9 && digits(match) <= 15 ? mobile : match))
    if (email) text = text.replace(EMAIL_TEXT, email)
    if (text !== node.data) node.data = text
  }
  if (address) doc.querySelectorAll<HTMLElement>(ADDRESS_SELECTORS).forEach((el) => { if (!el.querySelector('a,form,input')) el.textContent = address })
  if (address) personalizeAddressNextToIcons(doc, address)
  const links = (profile.social ?? '').split(/\s+/).filter((link) => /^https?:\/\//i.test(link))
  for (const site of SOCIAL_SITES) {
    const mine = links.find((link) => link.toLowerCase().includes(site))
    if (mine) doc.querySelectorAll<HTMLAnchorElement>(`a[href*="${site}"]`).forEach((a) => { a.href = mine })
  }
}

/** Apply supplied business details to recognizable template slots, and swap the sample brand, phone, email and address. */
export function personalizeOriginal(html: string, profile: BusinessProfile): string {
 const doc = new DOMParser().parseFromString(html,'text/html')
 const name = profile.name.trim()
 const setFirstText=(selectors:string,value:string)=>{if(!value)return;const el=doc.querySelector<HTMLElement>(selectors);if(el)el.textContent=value}
 const olds = name ? originalBrandNames(doc) : []
 if(name) {
  doc.title = name
  doc.querySelectorAll<HTMLElement>('[data-site-name],.navbar-brand,.logo a,.site-title,.logo-text').forEach(el=>{if(!el.querySelector('img') && !el.children.length)el.textContent=name})
 }
 if(profile.logo) doc.querySelectorAll<HTMLImageElement>('.navbar-brand img,.logo img,header img[alt*="logo" i]').forEach(img=>{img.src=profile.logo;img.alt=name || 'Company logo'})
 if(profile.logoSquare){let icon=doc.querySelector<HTMLLinkElement>('link[rel="icon"]');if(!icon){icon=doc.createElement('link');icon.rel='icon';doc.head.append(icon)}icon.href=profile.logoSquare}
 for(const [prefix,value] of [['tel:',profile.contact.mobile],['mailto:',profile.contact.email]] as const){if(value)doc.querySelectorAll<HTMLAnchorElement>(`a[href^="${prefix}"]`).forEach(a=>{a.href=prefix+value;if(!a.children.length)a.textContent=value})}
 if(profile.contact.address)doc.querySelectorAll('address').forEach(el=>{el.textContent=profile.contact.address})
 setFirstText('[data-site-slogan],.hero .tagline,.hero .subtitle,.banner .tagline,.banner .subtitle',profile.slogan)
 setFirstText('#about p,.about-section p,[data-about] p,.about p',profile.about)
 setFirstText('#services p,.services-section p,[data-services] p,.services p',profile.services)
 if(profile.slogan){let description=doc.querySelector<HTMLMetaElement>('meta[name="description"]');if(!description){description=doc.createElement('meta');description.name='description';doc.head.append(description)}description.content=profile.slogan}
 if(name && olds.length) swapEverywhere(doc, olds, name)
 personalizeContacts(doc, profile)
 return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML
}
