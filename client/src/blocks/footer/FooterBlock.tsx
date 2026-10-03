import type { BlockConfig } from '../types'
import { navigationLinks, type NavigationLink } from '@/lib/site-links'
import { SiteNavigationLink } from '../SiteNavigationLink'

interface FooterProps {
  logo: string
  logoImage?: string
  copyright: string
  description?: string
  links: NavigationLink[]
  contactDetails?: string
  columns?: { title: string; links: string[] }[]
  /** For the "columns" style: how many link columns sit beside the logo (1 to 4). */
  columnCount?: number
  newsletterTitle?: string
  social?: string[]
}

function FooterSimple({ props }: { props: FooterProps }) {
  return (
    <footer className="px-6 @md:px-10 py-8 border-t border-border-subtle">
      <div className="flex flex-col @lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {props.logoImage ? (
            <img data-image="logoImage" src={props.logoImage} alt={props.logo} className="h-6 w-auto object-contain" />
          ) : (
            <div className="w-6 h-6 rounded-md bg-brand/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-brand" />
            </div>
          )}
          <span data-edit="logo" className="text-sm font-semibold text-text-1">{props.logo}</span>
        </div>

        <div className="flex items-center gap-4">
          {props.links.map((link, i) => (
            <SiteNavigationLink
              key={i}
              index={i}
              link={link}
              className="text-[12px] text-text-3 hover:text-text-1 transition-colors cursor-pointer"
            />
          ))}
        </div>

        <span data-edit="copyright" className="text-[11px] text-text-3">{props.copyright}</span>
      </div>
    </footer>
  )
}

function FooterMultiColumn({ props }: { props: FooterProps }) {
  const columns = props.columns || [
    { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
    { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
    { title: 'Resources', links: ['Documentation', 'API Reference', 'Guides', 'Community'] },
    { title: 'Legal', links: ['Privacy', 'Terms', 'Security', 'Cookie Policy'] },
  ]

  return (
    <footer className="px-6 @md:px-10 py-12 border-t border-border-subtle">
      <div className="grid grid-cols-2 @2xl:grid-cols-5 gap-8 mb-10">
        {/* Brand column */}
        <div className="col-span-2 @2xl:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            {props.logoImage ? (
              <img data-image="logoImage" src={props.logoImage} alt={props.logo} className="h-7 w-auto object-contain" />
            ) : (
              <div className="w-7 h-7 rounded-md bg-brand/10 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-brand" />
              </div>
            )}
            <span data-edit="logo" className="text-sm font-semibold">{props.logo}</span>
          </div>
          <p className="text-[12px] text-text-3 leading-relaxed max-w-[200px]">
            {props.description}
          </p>
        </div>

        {/* Link columns */}
        {columns.map((col, i) => (
          <div key={i}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-2 mb-3">
              {col.title}
            </h4>
            <ul className="space-y-2">
              {col.links.map((link, j) => (
                <li key={j}>
                  <SiteNavigationLink path={`columns.${i}.links.${j}`} urlPath={`columnUrls.${i}.${j}`} link={link} className="text-[12.5px] text-text-3 hover:text-text-1 transition-colors cursor-pointer" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="pt-6 border-t border-border-subtle flex flex-col @lg:flex-row items-center justify-between gap-3">
        <span data-edit="copyright" className="text-[11px] text-text-3">{props.copyright}</span>
        <div className="flex gap-4">
          {props.links.map((link, i) => (
            <SiteNavigationLink
              key={i}
              index={i}
              link={link}
              className="text-[11px] text-text-3 hover:text-text-1 transition-colors cursor-pointer"
            />
          ))}
        </div>
      </div>
    </footer>
  )
}

function FooterMinimal({ props }: { props: FooterProps }) {
  return (
    <footer className="px-6 @md:px-10 py-6">
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-text-3">
        <span data-edit="copyright">{props.copyright}</span>
        {props.links.length > 0 && <span className="mx-1">|</span>}
        {props.links.map((link, i) => (
          <span key={i}>
            <SiteNavigationLink index={i} link={link} className="hover:text-text-1 transition-colors cursor-pointer" />
            {i < props.links.length - 1 && <span className="mx-1">|</span>}
          </span>
        ))}
      </div>
    </footer>
  )
}

const defaultColumns = [
  { title: 'Company', links: ['About', 'Careers', 'Contact'] },
  { title: 'Services', links: ['Web Design', 'Development', 'SEO'] },
  { title: 'Resources', links: ['Blog', 'FAQ', 'Support'] },
  { title: 'Legal', links: ['Privacy', 'Terms'] },
]

function Brand({ props, size = 'md' }: { props: FooterProps; size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-2">
      {props.logoImage ? (
        <img data-image="logoImage" src={props.logoImage} alt={props.logo} className={size === 'sm' ? 'h-6 w-auto object-contain' : 'h-7 w-auto object-contain'} />
      ) : (
        <div className="w-7 h-7 rounded-md bg-brand/10 flex items-center justify-center"><div className="w-3.5 h-3.5 rounded-full bg-brand" /></div>
      )}
      <span data-edit="logo" className="text-sm font-semibold text-text-1">{props.logo}</span>
    </div>
  )
}

function SocialDots({ props }: { props: FooterProps }) {
  const items = props.social?.length ? props.social : ['Instagram', 'Facebook', 'LinkedIn']
  return <div className="flex items-center gap-3 flex-wrap">{items.map((item, i) => <span key={i} className="text-[12px] text-text-3 hover:text-text-1 transition-colors cursor-pointer">{item}</span>)}</div>
}

/** One logo row: logo, page links and social links, with the copyright underneath. */
function FooterInline({ props }: { props: FooterProps }) {
  return (
    <footer className="px-6 @md:px-10 py-8 border-t border-border-subtle">
      <div className="flex flex-col @lg:flex-row items-center justify-between gap-4">
        <Brand props={props} size="sm" />
        <div className="flex items-center gap-4 flex-wrap justify-center">{props.links.map((link, i) => <SiteNavigationLink key={i} index={i} link={link} className="text-[12px] text-text-3 hover:text-text-1 transition-colors cursor-pointer" />)}</div>
        <SocialDots props={props} />
      </div>
      <p data-edit="copyright" className="mt-6 text-center text-[11px] text-text-3">{props.copyright}</p>
    </footer>
  )
}

/** A single centred column: logo, short description, links, social, copyright. */
function FooterCentered({ props }: { props: FooterProps }) {
  return (
    <footer className="px-6 @md:px-10 py-10 border-t border-border-subtle">
      <div className="flex flex-col items-center text-center gap-4 max-w-xl mx-auto">
        <Brand props={props} />
        {props.description && <p data-edit="description" className="text-[12.5px] text-text-3 leading-relaxed">{props.description}</p>}
        <div className="flex items-center gap-4 flex-wrap justify-center">{props.links.map((link, i) => <SiteNavigationLink key={i} index={i} link={link} className="text-[12px] text-text-3 hover:text-text-1 transition-colors cursor-pointer" />)}</div>
        <SocialDots props={props} />
        <span data-edit="copyright" className="text-[11px] text-text-3">{props.copyright}</span>
      </div>
    </footer>
  )
}

/** The logo and a short description beside 1 to 4 link columns, then a bottom bar. */
function FooterColumns({ props, newsletter }: { props: FooterProps; newsletter?: boolean }) {
  const count = Math.max(1, Math.min(Number(props.columnCount) || 3, 4))
  const columns = (props.columns?.length ? props.columns : defaultColumns).slice(0, count)
  return (
    <footer className="px-6 @md:px-10 py-12 border-t border-border-subtle">
      {newsletter && (
        <div className="mb-10 pb-8 border-b border-border-subtle flex flex-col @lg:flex-row items-center justify-between gap-4">
          <h4 data-edit="newsletterTitle" className="text-base font-semibold text-text-0">{props.newsletterTitle || 'Get our latest news'}</h4>
          <div className="flex w-full @lg:w-auto gap-2"><span className="flex-1 @lg:w-64 px-3 py-2 rounded-lg border border-border-default text-[12.5px] text-text-3">Your email</span><span className="px-4 py-2 rounded-lg bg-brand text-white text-[13px] font-semibold">Subscribe</span></div>
        </div>
      )}
      <div className="grid gap-8 mb-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <div><div className="mb-3"><Brand props={props} /></div>{props.description && <p data-edit="description" className="text-[12px] text-text-3 leading-relaxed max-w-[220px]">{props.description}</p>}</div>
        {columns.map((col, i) => (
          <div key={i}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-2 mb-3">{col.title}</h4>
            <ul className="space-y-2">{col.links.map((link, j) => <li key={j}><SiteNavigationLink path={`columns.${i}.links.${j}`} urlPath={`columnUrls.${i}.${j}`} link={link} className="text-[12.5px] text-text-3 hover:text-text-1 transition-colors cursor-pointer" /></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="pt-6 border-t border-border-subtle flex flex-col @lg:flex-row items-center justify-between gap-3">
        <span data-edit="copyright" className="text-[11px] text-text-3">{props.copyright}</span>
        <SocialDots props={props} />
      </div>
    </footer>
  )
}

export function FooterBlock({ block }: { block: BlockConfig }) {
  const props = { ...block.props, links: navigationLinks(block.props) } as unknown as FooterProps
  const details = props.contactDetails ? <p className="px-6 py-3 text-sm text-text-2 text-center">{props.contactDetails}</p> : null

  switch (block.variant) {
    case 'multi-column':
      return <><FooterMultiColumn props={props} />{details}</>
    case 'minimal':
      return <><FooterMinimal props={props} />{details}</>
    case 'inline':
      return <><FooterInline props={props} />{details}</>
    case 'centered':
      return <><FooterCentered props={props} />{details}</>
    case 'columns':
      return <><FooterColumns props={props} />{details}</>
    case 'newsletter':
      return <><FooterColumns props={props} newsletter />{details}</>
    default:
      return <><FooterSimple props={props} />{details}</>
  }
}
