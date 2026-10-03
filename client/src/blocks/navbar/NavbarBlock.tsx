import type { BlockConfig } from '../types'
import { navigationLinks, type NavigationLink } from '@/lib/site-links'
import { SiteNavigationLink } from '../SiteNavigationLink'
import { useState } from 'react'
import { Menu, Phone, Search, ShoppingBag, User } from 'lucide-react'
import '@/layouts/layouts.css'

interface NavbarProps {
  logo: string
  /** The business's own logo. Shown instead of the name when there is one. */
  logoImage?: string
  links: NavigationLink[]
  ctaText: string
  ctaUrl?: string
  /** Shown beside the button in the "contact" style, and in the top bar. */
  phone?: string
  email?: string
  topText?: string
  /** "button" folds the menu behind a button on small screens (default); "links" keeps the links showing. */
  mobileMenu?: 'button' | 'links'
}

/**
 * The business's mark in the header.
 *
 * A logo uploaded during setup belongs here — it was collected on the promise
 * of appearing on the site, and until now the header only ever showed text
 * beside a generic coloured dot.
 */

/**
 * One item in the menu.
 *
 * On the canvas it switches the page being edited, which is how you get to
 * About or Services without hunting for them in the side panel. On the
 * published site it is an ordinary link. Either way the words the owner typed
 * are matched against the pages that exist — before this, every menu item was
 * a span and clicking one did nothing at all.
 */
function NavLink({ label, className, index }: { label: NavigationLink; className: string; index:number }) {
  return <SiteNavigationLink link={label} index={index} className={className} />
}

function MobileMenu({ links }: { links: NavigationLink[] }) {
  return <details className="@4xl:hidden relative shrink-0">
    <summary onClick={(event) => event.stopPropagation()} aria-label="Open navigation menu" className="list-none cursor-pointer p-2 rounded border border-border-default"><Menu size={16} /></summary>
    <div className="absolute right-0 top-full z-20 min-w-48 p-3 rounded border border-border-default bg-bg-1 flex flex-col gap-3">
      {links.map((link, index) => <SiteNavigationLink key={index} index={index} link={link} className="text-sm text-text-1" />)}
    </div>
  </details>
}

function Brand({ logo, logoImage }: { logo: string; logoImage?: string }) {
  // A logo that fails to load (a moved file, a lost upload) would otherwise show
  // a broken-image icon with the business name wrapped beside it. Fall back to
  // the name so the header always reads properly.
  const [failed, setFailed] = useState<string | null>(null)
  if (logoImage && failed !== logoImage) {
    return (
      <img
        data-image="logoImage"
        src={logoImage}
        alt={logo}
        onError={() => setFailed(logoImage)}
        className="h-8 w-auto max-w-[180px] object-contain shrink-0"
      />
    )
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-brand" />
      </div>
      <span data-edit="logo" className="font-semibold text-[15px] text-text-0 tracking-tight whitespace-nowrap">{logo}</span>
    </div>
  )
}

function NavbarDefault({ props }: { props: NavbarProps }) {
  const { logo, links = [], ctaText } = props

  return (
    <nav className="px-6 @md:px-10 py-4 flex items-center justify-between gap-4">
      {/* Logo */}
      <Brand logo={logo} logoImage={props.logoImage} />

      {/* Desktop nav links */}
      <div className="hidden @4xl:flex items-center gap-5 @6xl:gap-6 min-w-0">
        {links.map((link, i) => (
          <NavLink
            key={i}
            index={i}
            label={link}
            className="text-[13px] text-text-2 hover:text-text-0 transition-colors cursor-pointer no-underline whitespace-nowrap"
          />
        ))}
      </div>

      {/* CTA + mobile menu */}
      <div className="flex items-center gap-3 shrink-0">
        {ctaText && <SiteNavigationLink path="ctaText" urlPath="ctaUrl" link={{ label: ctaText, url: props.ctaUrl ?? '' }} className="px-4 py-2 rounded-lg bg-brand text-white text-[13px] font-semibold whitespace-nowrap shrink-0" />}
        <MobileMenu links={links} />
      </div>
    </nav>
  )
}

function NavbarCentered({ props }: { props: NavbarProps }) {
  const { logo, links = [], ctaText } = props
  const mid = Math.ceil(links.length / 2)
  const leftLinks = links.slice(0, mid)
  const rightLinks = links.slice(mid)

  return (
    <nav className="px-6 @md:px-10 py-4 flex items-center justify-between gap-4">
      {/* Left links */}
      <div className="hidden @4xl:flex items-center gap-5 @6xl:gap-6 min-w-0 flex-1">
        {leftLinks.map((link, i) => (
          <NavLink
            key={i}
            index={i}
            label={link}
            className="text-[13px] text-text-2 hover:text-text-0 transition-colors cursor-pointer no-underline whitespace-nowrap"
          />
        ))}
      </div>

      {/* Center logo */}
      <Brand logo={logo} logoImage={props.logoImage} />

      {/* Right links + CTA */}
      <div className="hidden @4xl:flex items-center gap-5 @6xl:gap-6 min-w-0 flex-1 justify-end">
        {rightLinks.map((link, i) => (
          <NavLink
            key={i}
            index={i}
            label={link}
            className="text-[13px] text-text-2 hover:text-text-0 transition-colors cursor-pointer no-underline whitespace-nowrap"
          />
        ))}
        {ctaText && <SiteNavigationLink path="ctaText" urlPath="ctaUrl" link={{ label: ctaText, url: props.ctaUrl ?? '' }} className="px-4 py-2 rounded-lg bg-brand text-white text-[13px] font-semibold whitespace-nowrap shrink-0" />}
      </div>

      {/* Mobile menu */}
      <MobileMenu links={links} />
    </nav>
  )
}

const linkClass = 'text-[13px] text-text-2 hover:text-text-0 transition-colors cursor-pointer no-underline whitespace-nowrap'
const ctaClass = 'px-4 py-2 rounded-lg bg-brand text-white text-[13px] font-semibold whitespace-nowrap shrink-0'

function Cta({ props }: { props: NavbarProps }) {
  if (!props.ctaText) return null
  return <SiteNavigationLink path="ctaText" urlPath="ctaUrl" link={{ label: props.ctaText, url: props.ctaUrl ?? '' }} className={ctaClass} />
}

function Links({ links, separator }: { links: NavigationLink[]; separator?: boolean }) {
  return <>{links.map((link, i) => <span key={i} className="inline-flex items-center gap-5">{separator && i > 0 && <span aria-hidden="true" className="text-text-3 -mr-2">|</span>}<NavLink index={i} label={link} className={linkClass} /></span>)}</>
}

/** Always-visible menu button, for the "logo + hamburger" style. */
function BurgerMenu({ links }: { links: NavigationLink[] }) {
  return <details className="relative shrink-0">
    <summary onClick={(event) => event.stopPropagation()} aria-label="Open navigation menu" className="list-none cursor-pointer p-2 rounded border border-border-default"><Menu size={16} /></summary>
    <div className="absolute right-0 top-full z-20 min-w-48 p-3 rounded border border-border-default bg-bg-1 flex flex-col gap-3">
      {links.map((link, index) => <SiteNavigationLink key={index} index={index} link={link} className="text-sm text-text-1" />)}
    </div>
  </details>
}

/** Logo on top, menu on a second row. */
function NavbarStacked({ props, separator }: { props: NavbarProps; separator?: boolean }) {
  return (
    <nav className="px-6 @md:px-10 py-4 flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-center relative">
        <Brand logo={props.logo} logoImage={props.logoImage} />
        <div className="absolute right-0 @4xl:hidden"><MobileMenu links={props.links} /></div>
      </div>
      <div className="hidden @4xl:flex items-center justify-center gap-5 flex-wrap">
        <Links links={props.links} separator={separator} />
        <Cta props={props} />
      </div>
    </nav>
  )
}

/** Logo, menu, then a phone number and the button. */
function NavbarContact({ props }: { props: NavbarProps }) {
  return (
    <nav className="px-6 @md:px-10 py-4 flex items-center justify-between gap-4">
      <Brand logo={props.logo} logoImage={props.logoImage} />
      <div className="hidden @4xl:flex items-center gap-5 min-w-0"><Links links={props.links} /></div>
      <div className="flex items-center gap-3 shrink-0">
        {props.phone && <span data-edit="phone" className="hidden @2xl:inline-flex items-center gap-1.5 text-[13px] text-text-1 whitespace-nowrap"><Phone size={14} />{props.phone}</span>}
        <Cta props={props} />
        <MobileMenu links={props.links} />
      </div>
    </nav>
  )
}

/** Logo and a hamburger, with a few links shown on wide screens. */
function NavbarBurger({ props }: { props: NavbarProps }) {
  return (
    <nav className="px-6 @md:px-10 py-4 flex items-center justify-between gap-4">
      <Brand logo={props.logo} logoImage={props.logoImage} />
      <div className="hidden @4xl:flex items-center gap-5 min-w-0"><Links links={props.links.slice(0, 3)} /></div>
      <BurgerMenu links={props.links} />
    </nav>
  )
}

/** Logo left, menu in the middle, button right. */
function NavbarSplitCenter({ props }: { props: NavbarProps }) {
  return (
    <nav className="px-6 @md:px-10 py-4 grid grid-cols-[auto_1fr_auto] items-center gap-4">
      <Brand logo={props.logo} logoImage={props.logoImage} />
      <div className="hidden @4xl:flex items-center justify-center gap-5 min-w-0"><Links links={props.links} /></div>
      <div className="flex items-center gap-3 justify-end col-start-3"><Cta props={props} /><MobileMenu links={props.links} /></div>
    </nav>
  )
}

/** Logo left, menu right, icon buttons at the far right. */
function NavbarIcons({ props }: { props: NavbarProps }) {
  return (
    <nav className="px-6 @md:px-10 py-4 flex items-center justify-between gap-4">
      <Brand logo={props.logo} logoImage={props.logoImage} />
      <div className="flex items-center gap-5 min-w-0">
        <div className="hidden @4xl:flex items-center gap-5"><Links links={props.links} /></div>
        <span className="hidden @2xl:flex items-center gap-3 text-text-1" aria-hidden="true"><Search size={16} /><User size={16} /><ShoppingBag size={16} /></span>
        <MobileMenu links={props.links} />
      </div>
    </nav>
  )
}

/** A thin strip of contact details above the ordinary header. */
function NavbarTopBar({ props }: { props: NavbarProps }) {
  return (
    <div>
      <div className="px-6 @md:px-10 py-1.5 flex items-center justify-between gap-4 text-[11.5px] text-text-2 border-b border-border-subtle bg-bg-2">
        <span data-edit="topText" className="truncate">{props.topText || 'Welcome'}</span>
        <span className="flex items-center gap-4 shrink-0">{props.phone && <span data-edit="phone" className="inline-flex items-center gap-1"><Phone size={11} />{props.phone}</span>}{props.email && <span data-edit="email" className="hidden @lg:inline">{props.email}</span>}</span>
      </div>
      <NavbarDefault props={props} />
    </div>
  )
}

export function NavbarBlock({ block }: { block: BlockConfig }) {
  const props = { ...block.props, links: navigationLinks(block.props) } as unknown as NavbarProps
  const inner = <NavbarVariant variant={block.variant} props={props} />
  return props.mobileMenu === 'links' ? <div data-nav-mobile="links">{inner}</div> : inner
}

function NavbarVariant({ variant, props }: { variant: string; props: NavbarProps }) {
  switch (variant) {
    case 'centered':
      return <NavbarCentered props={props} />
    case 'stacked':
      return <NavbarStacked props={props} />
    case 'stacked-pipes':
      return <NavbarStacked props={props} separator />
    case 'contact':
      return <NavbarContact props={props} />
    case 'burger':
      return <NavbarBurger props={props} />
    case 'split-center':
      return <NavbarSplitCenter props={props} />
    case 'icons':
      return <NavbarIcons props={props} />
    case 'topbar':
      return <NavbarTopBar props={props} />
    default:
      return <NavbarDefault props={props} />
  }
}
