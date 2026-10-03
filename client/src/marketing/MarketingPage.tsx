import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Layers3 } from 'lucide-react'
import { BRAND, legalPages } from '@/brand'
import { Reveal } from '@/components/studio/Motion'
import { useAuthStore } from '@/store/authStore'
import './marketing.css'

/**
 * The frame of every public page: it scrolls by itself (the app shell does not), sets the page title,
 * and ends with the shared footer. Entrances use the same `Reveal` as the home page, so they fire once
 * and are switched off for visitors who prefer reduced motion.
 */
export function MarketingPage({ title, description, children, busy }: { title: string; description: string; children: ReactNode; busy?: boolean }) {
  useEffect(() => {
    const previous = document.title
    document.title = `${title} — ${BRAND.name}`
    const meta = document.querySelector('meta[name="description"]')
    const before = meta?.getAttribute('content') ?? null
    meta?.setAttribute('content', description)
    return () => { document.title = previous; if (before !== null) meta?.setAttribute('content', before) }
  }, [title, description])

  return (
    <div className="studio-landing mk h-full overflow-y-auto overflow-x-hidden" id="landing-scroll" data-mk-page aria-busy={busy || undefined}>
      {children}
      <MarketingFooter />
    </div>
  )
}

export function BrandMark({ size = 20 }: { size?: number }) {
  return <><span className="brand-mark"><Layers3 size={size} /></span><span className="mk-brand-text"><b>{BRAND.short}</b><span>{BRAND.tag}</span></span></>
}

export function MarketingFooter() {
  return (
    <footer className="mk-footer studio-container" aria-label="Site footer">
      <div className="mk-footer-top">
        <div className="mk-footer-about">
          <Link to="/" className="studio-brand mk-footer-brand" aria-label={`${BRAND.name} home`}><BrandMark /></Link>
          <p>{BRAND.tagline}</p>
          <Link className="mk-footer-cta" to="/start">Start building <ArrowRight size={14} /></Link>
        </div>
        <nav aria-label="Product"><h3>Product</h3><Link to="/features">Features</Link><Link to="/how-it-works">How it works</Link><Link to="/pricing">Pricing</Link><Link to="/start">Choose a template</Link></nav>
        <nav aria-label="Company"><h3>Company</h3><Link to="/about">About us</Link><Link to="/contact">Contact</Link><Link to="/sign-in">Your account</Link></nav>
        <nav aria-label="Resources"><h3>Resources</h3><Link to="/help">Help centre</Link><Link to="/help#faq">Questions</Link>{legalPages.map((page) => <Link key={page.to} to={page.to}>{page.label}</Link>)}</nav>
      </div>
      <div className="mk-footer-bottom">
        <small>© {BRAND.year} {BRAND.name}. All rights reserved.</small>
        <span>Made for small businesses, schools and individuals</span>
      </div>
    </footer>
  )
}

/** Title block at the top of a page. */
export function PageHero({ eyebrow, title, accent, lede, children }: { eyebrow: string; title: string; accent?: string; lede: string; children?: ReactNode }) {
  return (
    <section className="mk-hero studio-container" aria-label={eyebrow}>
      <i className="mk-glow mk-glow-a" aria-hidden="true" /><i className="mk-glow mk-glow-b" aria-hidden="true" />
      <Reveal className="mk-hero-inner">
        <span className="mk-eyebrow mk-hero-label"><Layers3 size={14} />{eyebrow}</span>
        <h1>{title}{accent && <> <span className="mk-grad">{accent}</span></>}</h1>
        <p className="mk-lede">{lede}</p>
        {children}
      </Reveal>
    </section>
  )
}

export function Section({ id, eyebrow, title, lede, children, tone }: { id?: string; eyebrow?: string; title?: string; lede?: string; children: ReactNode; tone?: 'soft' }) {
  return (
    <section id={id} className={`mk-section studio-container ${tone === 'soft' ? 'mk-soft' : ''}`}>
      <Reveal>
        {(eyebrow || title) && <header className="mk-section-head">{eyebrow && <span className="mk-eyebrow">{eyebrow}</span>}{title && <h2>{title}</h2>}{lede && <p className="mk-lede">{lede}</p>}</header>}
        {children}
      </Reveal>
    </section>
  )
}

/** Cards that rise in one after another (capped, so the last one never feels left behind). */
export function CardGrid({ items, columns = 3 }: { items: { icon: ReactNode; title: string; text: string }[]; columns?: 2 | 3 | 4 }) {
  return (
    <div className={`mk-grid mk-cols-${columns}`}>
      {items.map((item, index) => (
        <article key={item.title} className="mk-card" style={{ ['--i' as string]: Math.min(index, 6) }}>
          <span className="mk-icon">{item.icon}</span>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </article>
      ))}
    </div>
  )
}

export function Faq({ items }: { items: [string, string][] }) {
  return (
    <div className="mk-faq">
      {items.map(([question, answer]) => (
        <details key={question}><summary>{question}</summary><p>{answer}</p></details>
      ))}
    </div>
  )
}

export function CtaBand({ title, text, label = 'Start building', to = '/start', secondary }: { title: string; text: string; label?: string; to?: string; secondary?: { label: string; to: string } }) {
  return (
    <section className="mk-section studio-container">
      <Reveal className="mk-cta">
        <h2>{title}</h2>
        <p>{text}</p>
        <div className="mk-cta-actions">
          <BuildLink className="mk-btn mk-btn-primary" to={to}>{label} <ArrowRight size={16} /></BuildLink>
          {secondary && <Link className="mk-btn mk-btn-ghost" to={secondary.to}>{secondary.label}</Link>}
        </div>
      </Reveal>
    </section>
  )
}

export function BuildLink({ to = '/start', className, children }: { to?: string; className: string; children: ReactNode }) {
  const token = useAuthStore((state) => state.token)
  const needsAccount = ['/start', '/create', '/build'].includes(to) && !token
  return <Link className={className} to={needsAccount ? '/sign-in' : to} state={needsAccount ? { from: to } : undefined}>{children}</Link>
}
