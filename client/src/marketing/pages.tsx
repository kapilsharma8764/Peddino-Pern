import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, FileText, LayoutTemplate, MessageSquare, Search } from 'lucide-react'
import { BRAND } from '@/brand'
import { leadsEndpoint } from '@/lib/api'
import { columnsOf, listOf, textOf, usePageContent } from '@/services/contentApi'
import { usePricing } from '@/services/pricingApi'
import { BuildLink, CardGrid, Faq, MarketingPage, PageHero, Section } from './MarketingPage'
import { BuilderPreview } from './BuilderPreview'
import { CardsSection, CtaSection, HeroSection } from './content'
import { cardItems, fill, iconFor, type CardContent } from './content-helpers'

const UPDATED = '2 October 2026'

/* ───────────────────────── Features ───────────────────────── */
export function Features() {
  const { sections: c, status } = usePageContent('features')
  return (
    <MarketingPage busy={status === 'loading'} title="Features" description={`Everything in ${BRAND.name}: a drag-and-drop editor, 200+ widgets, layouts, templates, colours and one-click export.`}>
      <HeroSection section={c.hero}>
        <div className="mk-cta-actions" style={{ marginTop: 28 }}>
          <BuildLink className="mk-btn mk-btn-primary">Start building <ArrowRight size={16} /></BuildLink>
          <Link className="mk-btn mk-btn-ghost" to="/how-it-works">See how it works</Link>
        </div>
      </HeroSection>

      <section className="studio-container mk-preview-section"><BuilderPreview />{c.proof && <div className="mk-proof-strip">{listOf<{ icon?: string; text?: string }>(c.proof.content.items).map((item) => <span key={item.text}>{iconFor(item.icon, 16)} {item.text}</span>)}</div>}</section>

      <CardsSection section={c.build} />
      <CardsSection section={c.design} />
      <CardsSection section={c.publish} />
      <CtaSection section={c.cta} />
    </MarketingPage>
  )
}

/* ───────────────────────── How it works ───────────────────────── */
export function HowItWorks() {
  const { sections: c, status } = usePageContent('how-it-works')
  const steps = listOf<{ label?: string; title?: string; text?: string; points?: string[] }>(c.steps?.content.items)
  return (
    <MarketingPage busy={status === 'loading'} title="How it works" description={`How ${BRAND.name} takes you from an idea to a published website in five steps.`}>
      <HeroSection section={c.hero} />
      {steps.length > 0 && <Section>
        <nav className="mk-process" aria-label="Website creation steps">{steps.map((step, index) => <a key={step.title} href={`#step-${index + 1}`}><span>0{index + 1}</span><b>{step.label}</b><ArrowRight size={16} /></a>)}</nav>
        <div className="mk-steps">
          {steps.map((step, index) => (
            <article id={`step-${index + 1}`} key={step.title} className="mk-step" style={{ ['--i' as string]: Math.min(index, 6) }}>
              <span className="mk-step-num" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {step.points && <ul>{step.points.map((point) => <li key={point}>{point}</li>)}</ul>}
              </div>
            </article>
          ))}
        </div>
      </Section>}
      <CtaSection section={c.cta} />
    </MarketingPage>
  )
}

/* ───────────────────────── Pricing ───────────────────────── */
export function Pricing() {
  const { plans, status: planStatus } = usePricing()
  const { sections: c, status } = usePageContent('pricing')
  const comparison = c.comparison?.content
  const columns = listOf<string>(comparison?.columns)
  const rows = listOf<string[]>(comparison?.rows)
  return (
    <MarketingPage busy={status === 'loading' || planStatus === 'loading'} title="Pricing" description={`${BRAND.name} is free to start. See what is included and what is coming next.`}>
      <HeroSection section={c.hero} />
      <Section>
        {plans.length === 0 ? (
          <div className="mk-empty"><h3>Plans are not available right now</h3><p>Please check back in a moment, or <Link to="/contact">contact us</Link>.</p></div>
        ) : (
          <div className="mk-plans">
            {plans.map((plan, index) => (
              <article key={plan.slug} className={`mk-plan ${plan.featured ? 'is-featured' : ''}`} style={{ ['--i' as string]: Math.min(index, 6) }}>
                {plan.featured && <span className="mk-badge">AVAILABLE NOW</span>}
                <h3>{plan.name}</h3>
                <div className="mk-price">{plan.priceLabel}</div>
                <small style={{ color: 'var(--mk-muted)', fontWeight: 600 }}>{plan.note}</small>
                <p style={{ marginTop: 12 }}>{plan.description}</p>
                <ul>{plan.features.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
                <BuildLink className={`mk-btn ${plan.featured ? 'mk-btn-primary' : 'mk-btn-ghost'}`} to={plan.ctaTo}>{plan.ctaLabel} <ArrowRight size={15} /></BuildLink>
              </article>
            ))}
          </div>
        )}
      </Section>
      {c.comparison && columns.length > 0 && <Section eyebrow={textOf(comparison?.eyebrow) || undefined} title={c.comparison.title} lede={c.comparison.subtitle} tone={comparison?.tone === 'soft' ? 'soft' : undefined}>
        <div className="mk-comparison" tabIndex={0} role="region" aria-label="Plan comparison"><table><caption className="sr-only">Available and planned features by plan</caption><thead><tr><th scope="col">Capability</th>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{rows.map(([feature, ...values]) => <tr key={feature}><th scope="row">{feature}</th>{values.map((value, index) => <td key={index}><span className={value === 'Included' ? 'mk-included' : 'mk-planned'}>{value === 'Included' && <Check size={14} />}{value}</span></td>)}</tr>)}</tbody></table></div>
      </Section>}
      {c.faq && <Section id="faq" eyebrow={textOf(c.faq.content.eyebrow) || undefined} title={c.faq.title}>
        <Faq items={listOf<[string, string]>(c.faq.content.items)} />
      </Section>}
      <CtaSection section={c.cta} />
    </MarketingPage>
  )
}

/* ───────────────────────── About ───────────────────────── */
export function About() {
  const { sections: c, status } = usePageContent('about')
  const stats = listOf<{ value?: string; label?: string }>(c.mission?.content.stats)
  return (
    <MarketingPage busy={status === 'loading'} title="About us" description={`${BRAND.name} helps small businesses, schools and individuals get a professional website without developers.`}>
      <HeroSection section={c.hero} />
      {c.mission && <Section eyebrow={textOf(c.mission.content.eyebrow) || undefined} title={c.mission.title} lede={c.mission.subtitle} tone={c.mission.content.tone === 'soft' ? 'soft' : undefined}>
        <div className="mk-stats">{stats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div>
      </Section>}
      <Section>
        <div className="mk-split">
          {c.why && <div className="mk-prose">
            <h2>{c.why.title}</h2>
            {listOf<string>(c.why.content.paragraphs).map((paragraph) => <p key={paragraph}>{fill(paragraph)}</p>)}
          </div>}
          {c.care && <div className="mk-prose">
            <h2>{c.care.title}</h2>
            <CardGrid columns={columnsOf(c.care.content.columns, 2)} items={cardItems(c.care)} />
          </div>}
        </div>
      </Section>
      <CtaSection section={c.cta} />
    </MarketingPage>
  )
}

/* ───────────────────────── Contact ───────────────────────── */
type Sent = 'idle' | 'sending' | 'done' | 'error'
export function Contact() {
  const [status, setStatus] = useState<Sent>('idle')
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // Kept now: the event's currentTarget is gone by the time the request finishes.
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const message = String(data.get('message') ?? '').trim()
    const next: typeof errors = {}
    if (!name) next.name = 'Please tell us your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email so we can reply.'
    if (message.length < 10) next.message = 'Write a few words about how we can help.'
    setErrors(next)
    if (Object.keys(next).length) return
    setStatus('sending')
    try {
      const response = await fetch(leadsEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, message, topic: String(data.get('topic') ?? ''), source: 'peddino-contact-page' }),
      })
      if (!response.ok) throw new Error('failed')
      setStatus('done')
      form.reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <MarketingPage title="Contact" description={`Questions, ideas or feedback for ${BRAND.name}? Send us a message.`}>
      <PageHero eyebrow="CONTACT" title="We’d love to" accent="hear from you." lede="Questions about the builder, an idea for a feature, or help with your site. Send a message and we will reply to the email you give us." />
      <Section>
        <div className="mk-split">
          <div className="mk-prose">
            <h2>How we can help</h2>
            <div className="mk-contact-list">
              <div><span className="mk-icon"><MessageSquare size={20} /></span><p><b>Questions and feedback</b>Tell us what is unclear or what you wish the builder did.</p></div>
              <div><span className="mk-icon"><LayoutTemplate size={20} /></span><p><b>Help with your site</b>Stuck on a layout or a template? Describe it and we will point you the right way.</p></div>
              <div><span className="mk-icon"><FileText size={20} /></span><p><b>Plans and teams</b>Working with several clients? Tell us how, so we can plan for it.</p></div>
            </div>
            <p>Looking for quick answers? The <Link to="/help" style={{ color: 'var(--mk-brand)', fontWeight: 700 }}>help centre</Link> covers the common ones.</p>
          </div>
          <form className="mk-form" onSubmit={(event) => void submit(event)} noValidate aria-label="Contact us">
            <div className="mk-form-heading"><span className="mk-eyebrow">LET’S TALK</span><h2>Send us a message</h2><p>Share a little detail so we can help you get moving.</p></div>
            <label>Your name<input name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} />{errors.name && <span className="mk-error" role="alert">{errors.name}</span>}</label>
            <label>Email<input name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} />{errors.email && <span className="mk-error" role="alert">{errors.email}</span>}</label>
            <label>What is it about?<select name="topic" defaultValue="Question"><option>Question</option><option>Feedback or idea</option><option>Help with my site</option><option>Plans and pricing</option><option>Something else</option></select></label>
            <label>Message<textarea name="message" aria-invalid={Boolean(errors.message)} />{errors.message && <span className="mk-error" role="alert">{errors.message}</span>}</label>
            {status === 'done' && <p className="mk-ok" role="status">Thank you. Your message was received and we will reply by email.</p>}
            {status === 'error' && <p className="mk-error" role="alert">We could not send that right now. Please try again in a moment.</p>}
            <button className="mk-btn mk-btn-primary" type="submit" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send message'} <ArrowRight size={16} /></button>
          </form>
        </div>
      </Section>
    </MarketingPage>
  )
}

/* ───────────────────────── Help ───────────────────────── */
export function Help() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All topics')
  const { sections: c, status } = usePageContent('help')
  const questions = listOf<{ topic: string; question: string; answer: string }>(c.faq?.content.items)
  const topics = ['All topics', ...listOf<string>(c.faq?.content.topics)]
  const visible = questions.filter(({ topic, question, answer }) => (category === 'All topics' || topic === category) && `${question} ${answer}`.toLowerCase().includes(query.trim().toLowerCase()))
  const more = listOf<CardContent>(c.more?.content.items)
  return (
    <MarketingPage busy={status === 'loading'} title="Help centre" description={`Answers to common questions about building, editing and publishing with ${BRAND.name}.`}>
      <HeroSection section={c.hero}>
        <label className="mk-help-search"><Search size={20} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pages, colours, publishing…" aria-label="Search help" /></label>
        <p className="mk-search-hint">Try “add a page”, “colours” or “publish”.</p>
      </HeroSection>
      <CardsSection section={c.start} />
      {c.faq && <Section id="faq" eyebrow={textOf(c.faq.content.eyebrow) || undefined} title={c.faq.title}>
        <div className="mk-topic-filters" role="group" aria-label="Help topics">{topics.map((topic) => <button key={topic} type="button" aria-pressed={category === topic} onClick={() => setCategory(topic)}>{topic}</button>)}</div>
        <p className="mk-result-count" role="status">{visible.length} {visible.length === 1 ? 'answer' : 'answers'}{query.trim() && ` for “${query.trim()}”`}</p>
        {visible.length ? <Faq items={visible.map(({ question, answer }) => [question, answer])} /> : <div className="mk-empty"><Search size={28} /><h3>No answers found</h3><p>Try another word or browse all topics.</p><button className="mk-btn mk-btn-ghost" onClick={() => { setQuery(''); setCategory('All topics') }}>Clear search</button></div>}
      </Section>}
      {c.more && more.length > 0 && <Section eyebrow={textOf(c.more.content.eyebrow) || undefined} title={c.more.title} tone={c.more.content.tone === 'soft' ? 'soft' : undefined}>
        <div className="mk-grid mk-cols-2">{more.map((item) => <article key={item.title} className="mk-card"><span className="mk-icon">{iconFor(item.icon)}</span><h3>{item.title}</h3><p>{item.text}</p>{item.linkTo && <Link className="mk-card-link" to={item.linkTo}>{item.linkLabel} <ArrowRight size={15} /></Link>}</article>)}</div>
      </Section>}
      <CtaSection section={c.cta} />
    </MarketingPage>
  )
}

/* ───────────────────────── Legal ───────────────────────── */
function Legal({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <MarketingPage title={title} description={description}>
      <PageHero eyebrow="LEGAL" title={title} lede={`Last updated ${UPDATED}.`} />
      <section className="mk-section studio-container"><div className="mk-legal">{children}</div></section>
    </MarketingPage>
  )
}

export function Privacy() {
  return (
    <Legal title="Privacy Policy" description={`How ${BRAND.name} handles your information.`}>
      <p>This is a plain-language summary of how {BRAND.name} handles information. It is not legal advice, and it should be reviewed by a lawyer before you rely on it.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Account details</b>: your name and email, or your Google profile name and email if you sign in with Google.</li>
        <li><b>Your websites</b>: the pages, text, images and settings you create, and the business details you enter during setup.</li>
        <li><b>Enquiries</b>: messages sent through contact forms on sites you publish, and through our own contact page.</li>
      </ul>
      <h2>How we use it</h2>
      <p>We use this information to run your account, save and publish your sites, show you the enquiries your forms receive, and reply to messages you send us. We do not sell your information.</p>
      <h2>Where it is stored</h2>
      <p>Account and site data are stored in our database. Some of your work is also kept in your own browser so you do not lose it if you close the tab. If you use an AI feature with your own key, that key stays in your browser unless you tell us otherwise.</p>
      <h2>Other services</h2>
      <p>The editor and some templates load fonts and sample photos from third parties such as Google Fonts and image libraries, which means your browser contacts those services. If you sign in with Google, Google’s own policy applies to that sign-in.</p>
      <h2>Your choices</h2>
      <p>You can edit or delete your sites at any time, and you can download them. To ask us to delete your account or to see what we hold about you, contact us through the <Link to="/contact">contact page</Link>.</p>
      <h2>Changes</h2>
      <p>If this policy changes we will update the date at the top of this page.</p>
    </Legal>
  )
}

export function Terms() {
  return (
    <Legal title="Terms of Service" description={`The terms for using ${BRAND.name}.`}>
      <p>This is a plain-language summary of the terms for using {BRAND.name}. It is not legal advice, and it should be reviewed by a lawyer before you rely on it.</p>
      <h2>Using the service</h2>
      <p>You may use {BRAND.name} to build and publish websites. You are responsible for the content you publish and for keeping your login details safe.</p>
      <h2>Your content</h2>
      <p>The websites you build are yours. You give us permission only to store, display and publish them so the service can work. You can download your site and remove it at any time.</p>
      <h2>What you must not do</h2>
      <ul>
        <li>Publish anything unlawful, deceptive or that infringes someone else’s rights.</li>
        <li>Try to break, overload or gain unauthorised access to the service.</li>
        <li>Use the service to send spam through the forms on your site.</li>
      </ul>
      <h2>Templates and images</h2>
      <p>Templates and sample images are provided to help you start. Replace sample photos and text with your own, and check the licence of anything you add.</p>
      <h2>Availability</h2>
      <p>We work to keep the service running but cannot promise it will always be available or error-free. Features may change. Paid plans, if introduced, will be described clearly before you are charged.</p>
      <h2>Ending your use</h2>
      <p>You can stop using the service at any time. We may suspend accounts that break these terms.</p>
      <h2>Contact</h2>
      <p>Questions about these terms? Use the <Link to="/contact">contact page</Link>.</p>
    </Legal>
  )
}
