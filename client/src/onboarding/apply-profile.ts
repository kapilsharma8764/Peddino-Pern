import type { BlockConfig, SiteConfig } from '@/blocks/types'
import type { BusinessProfile } from './profile'

/**
 * Pours the answers from the Create Website flow into a template.
 *
 * This is what makes the flow worth filling in: the business types its phone
 * number once and finds it already in the footer and the contact section. A
 * template that still says "Acme Inc" after all those questions is the thing
 * that makes a builder feel fake.
 *
 * Only fields the business actually filled in are used. A blank answer leaves
 * the template's own placeholder alone, which reads better than an empty gap.
 */

function pick(value: string | undefined, fallback: unknown): unknown {
  const trimmed = value?.trim()
  return trimmed ? trimmed : fallback
}

/** The street address with the city and country after it, for the places a site shows one. */
export function fullAddress(profile: BusinessProfile): string {
  return [profile.contact.address, profile.city, profile.country].map((part) => part?.trim()).filter(Boolean).join(', ')
}

function applyToBlock(block: BlockConfig, profile: BusinessProfile): BlockConfig {
  const contact = { ...profile.contact, address: fullAddress(profile) }
  const props = { ...block.props }

  switch (block.type) {
    case 'navbar':
      props.logo = pick(profile.name, props.logo)
      // The logo was collected on the promise of appearing on the site; the
      // header is where people look for it.
      if (profile.logo.trim()) props.logoImage = profile.logo.trim()
      props.ctaText = pick(profile.ctaText, props.ctaText)
      break

    case 'hero':
      props.headline = pick(profile.name, props.headline)
      props.subheadline = pick(profile.slogan, props.subheadline)
      props.primaryCta = pick(profile.ctaText, props.primaryCta)
      break

    case 'content':
      props.body = pick(profile.about, props.body)
      break

    case 'features':
    case 'products':
      if ('description' in props) props.description = pick(profile.services, props.description)
      if ('subtitle' in props) props.subtitle = pick(profile.services, props.subtitle)
      break

    case 'contact':
      props.subtitle = pick(
        [contact.mobile, contact.altMobile, contact.email, contact.address, contact.officeTiming].filter(Boolean).join('  ·  '),
        props.subtitle,
      )
      break

    case 'slider':
      if (Array.isArray(props.slides)) props.slides = props.slides.map((slide, index) => index === 0 ? {
        ...slide, heading: pick(profile.name, slide.heading), text: pick(profile.slogan, slide.text),
      } : slide)
      break

    case 'map':
      props.address = pick(contact.address, props.address)
      props.mapUrl = pick(contact.mapUrl, props.mapUrl)
      props.timing = pick(contact.officeTiming, props.timing)
      break

    case 'whatsapp':
      // Only when the owner ticked that their mobile takes WhatsApp. Without a
      // number the widget renders nothing, so an unticked box quietly removes
      // the button rather than publishing one that goes nowhere.
      props.number = contact.whatsapp ? contact.mobile.trim() : ''
      break

    case 'footer':
      props.logo = pick(profile.name, props.logo)
      props.description = pick(profile.slogan, props.description)
      if (profile.logoSquare.trim()) props.logoImage = profile.logoSquare.trim()
      if (profile.name.trim()) {
        props.copyright = `${new Date().getFullYear()} ${profile.name.trim()}. All rights reserved.`
      }
      if (contact.mobile || contact.email || contact.address || contact.officeTiming) {
        props.contactDetails = [contact.mobile, contact.altMobile, contact.email, contact.address, contact.officeTiming].filter(Boolean).join(' · ')
      }
      break

    default:
      break
  }

  return { ...block, props }
}

export function applyProfile(config: SiteConfig, profile: BusinessProfile): SiteConfig {
  const applyAll = (blocks: BlockConfig[]) => blocks.map((block) => applyToBlock(block, profile))

  return {
    ...config,
    name: profile.name.trim() || config.name,
    // The header and footer are shared across pages, so they carry the business
    // name and logo and must be filled in too.
    header: config.header ? applyAll(config.header) : undefined,
    footer: config.footer ? applyAll(config.footer) : undefined,
    blocks: applyAll(config.blocks),
    pages: config.pages?.map((page) => ({ ...page, blocks: applyAll(page.blocks) })),
  }
}
