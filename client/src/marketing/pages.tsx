import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Check, Download, FileText, Globe2, Heart, Inbox, LayoutGrid, LayoutTemplate, Layers3, MessageSquare, MonitorSmartphone,
  MousePointer2, Palette, PanelsTopLeft, Rocket, Search, ShieldCheck, Sparkles, Type, Wand2,
} from 'lucide-react'
import { BRAND } from '@/brand'
import { leadsEndpoint } from '@/lib/api'
import { CardGrid, CtaBand, Faq, MarketingPage, PageHero, Section } from './MarketingPage'

const UPDATED = '2 October 2026'

/* ───────────────────────── Features ───────────────────────── */
export function Features() {
  return (
    <MarketingPage title="Features" description={`Everything in ${BRAND.name}: a drag-and-drop editor, 200+ widgets, layouts, templates, colours and one-click export.`}>
      <PageHero eyebrow="FEATURES" title="Everything you need to" accent="build your website." lede={`${BRAND.name} gives you a visual editor, ready-made templates and a library of building blocks. Start from a design or from a blank page, and change anything by clicking it.`}>
        <div className="mk-cta-actions" style={{ marginTop: 28 }}>
          <Link className="mk-btn mk-btn-primary" to="/start">Start building <ArrowRight size={16} /></Link>
          <Link className="mk-btn mk-btn-ghost" to="/how-it-works">See how it works</Link>
        </div>
      </PageHero>

      <Section eyebrow="BUILD" title="A real visual editor" lede="Click text, an image or a button on the page and edit it right there. Nothing to install and no code to touch.">
        <CardGrid items={[
          { icon: <MousePointer2 size={20} />, title: 'Click to edit', text: 'Change words, photos, links and buttons directly on the page, with undo and redo whenever you need them.' },
          { icon: <LayoutGrid size={20} />, title: '200+ widgets', text: 'Headings, forms, galleries, pricing, FAQs, calculators and more, searchable and sorted into categories.' },
          { icon: <PanelsTopLeft size={20} />, title: 'Layouts that start empty', text: 'Pick a column, grid, sidebar or hero layout and fill each place with your own widgets. 75+ layouts, no fake content.' },
          { icon: <Layers3 size={20} />, title: 'Page structures', text: 'Business, education, portfolio, shop and service skeletons: labelled empty sections you complete yourself.' },
          { icon: <Type size={20} />, title: 'Headers and footers', text: 'Choose from many header and footer styles. They are shared, so one change updates every page, and the menu follows your pages.' },
          { icon: <MonitorSmartphone size={20} />, title: 'Desktop, tablet, mobile', text: 'Switch the preview size as you work. Columns stack on phones and become two columns on tablets.' },
        ]} />
      </Section>

      <Section eyebrow="DESIGN" title="Make it look like you" tone="soft">
        <CardGrid columns={3} items={[
          { icon: <LayoutTemplate size={20} />, title: 'Ready-made templates', text: 'Browse templates by kind of business, preview them on three screen sizes, and open one in the editor with your details filled in.' },
          { icon: <Palette size={20} />, title: 'Colours at three levels', text: 'Change colours for the whole site, for one page, or for a single section. Header and footer colours too.' },
          { icon: <Wand2 size={20} />, title: 'Starting designs', text: 'Choose a look first, then pick your pages. You get a working starter site to change, not an empty screen.' },
        ]} />
      </Section>

      <Section eyebrow="PUBLISH" title="Take it live, or take it with you">
        <CardGrid columns={3} items={[
          { icon: <Rocket size={20} />, title: 'Publish', text: 'Publish your site to its own address and update it any time by editing and publishing again.' },
          { icon: <Download size={20} />, title: 'Export', text: 'Download your whole site as HTML files or a ZIP and host it wherever you like. What you export matches the editor.' },
          { icon: <Inbox size={20} />, title: 'Enquiries inbox', text: 'Contact forms on your site send messages to an Enquiries page in your workspace.' },
        ]} />
      </Section>

      <CtaBand title="See it for yourself" text="Start with a template or a blank page. It takes a few minutes to have something real on screen." secondary={{ label: 'Read the help centre', to: '/help' }} />
    </MarketingPage>
  )
}

/* ───────────────────────── How it works ───────────────────────── */
export function HowItWorks() {
  const steps: { title: string; text: string; points?: string[] }[] = [
    { title: 'Tell us what you are building', text: 'Choose the kind of website: business, school, restaurant, portfolio and more. This decides which designs and pages we suggest first.' },
    { title: 'Add your business details', text: 'Name, a short description, and, if you want, a tagline, contact details and a logo. We reuse them everywhere so you never type them twice.' },
    { title: 'Pick how to start', text: 'Two ways in, and you can switch later.', points: ['Choose a template: browse designs for your kind of business, preview them, and open one.', 'Create a site: choose a starting design and your pages, then build the rest with 200+ widgets.'] },
    { title: 'Edit visually', text: 'Click anything to change it. Add sections from the layout list, drop widgets in, and set your colours. Check desktop, tablet and mobile as you go.' },
    { title: 'Preview and publish', text: 'Preview your pages, then publish or download the site. Your project stays in your workspace so you can come back and change it.' },
  ]
  return (
    <MarketingPage title="How it works" description={`How ${BRAND.name} takes you from an idea to a published website in five steps.`}>
      <PageHero eyebrow="HOW IT WORKS" title="From idea to website in" accent="five steps." lede="No code, no waiting. Answer a few questions, choose a starting point, then edit the page the way you would edit a document." />
      <Section>
        <div className="mk-steps">
          {steps.map((step, index) => (
            <article key={step.title} className="mk-step" style={{ ['--i' as string]: Math.min(index, 6) }}>
              <span className="mk-step-num" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {step.points && <ul>{step.points.map((point) => <li key={point}>{point}</li>)}</ul>}
              </div>
            </article>
          ))}
        </div>
      </Section>
      <CtaBand title="Ready for step one?" text="It starts with a single question: what kind of website do you want?" secondary={{ label: 'Compare plans', to: '/pricing' }} />
    </MarketingPage>
  )
}

/* ───────────────────────── Pricing ───────────────────────── */
export function Pricing() {
  const plans = [
    { name: 'Free', price: '₹0', note: 'Available now', text: 'Everything you need to build and publish a website.', featured: true, cta: 'Start free', to: '/start',
      items: ['The full visual editor', '200+ widgets and 75+ layouts', 'Templates for every kind of business', 'Desktop, tablet and mobile editing', 'Publish your site and export it as HTML or ZIP', 'Enquiries inbox'] },
    { name: 'Pro', price: 'Coming soon', note: 'Planned', text: 'For businesses that want more. Tell us what you would like to see.', cta: 'Tell us what you need', to: '/contact',
      items: ['Everything in Free', 'Your own domain name (planned)', 'More space for sites and images (planned)', 'Priority help (planned)'] },
    { name: 'Business', price: 'Let’s talk', note: 'For teams and agencies', text: 'Building websites for several clients? We would like to hear how you work.', cta: 'Contact us', to: '/contact',
      items: ['Several sites under one account (planned)', 'Working together on a site (planned)', 'Help moving your existing site (on request)'] },
  ]
  return (
    <MarketingPage title="Pricing" description={`${BRAND.name} is free to start. See what is included and what is coming next.`}>
      <PageHero eyebrow="PRICING" title="Free to start." accent="Honest about what’s next." lede="You can build, publish and export a website today at no cost. Paid plans are still being planned, and we list only what is real." />
      <Section>
        <div className="mk-plans">
          {plans.map((plan, index) => (
            <article key={plan.name} className={`mk-plan ${plan.featured ? 'is-featured' : ''}`} style={{ ['--i' as string]: Math.min(index, 6) }}>
              {plan.featured && <span className="mk-badge">AVAILABLE NOW</span>}
              <h3>{plan.name}</h3>
              <div className="mk-price">{plan.price}</div>
              <small style={{ color: 'var(--mk-muted)', fontWeight: 600 }}>{plan.note}</small>
              <p style={{ marginTop: 12 }}>{plan.text}</p>
              <ul>{plan.items.map((item) => <li key={item}><Check size={16} />{item}</li>)}</ul>
              <Link className={`mk-btn ${plan.featured ? 'mk-btn-primary' : 'mk-btn-ghost'}`} to={plan.to}>{plan.cta} <ArrowRight size={15} /></Link>
            </article>
          ))}
        </div>
      </Section>
      <Section id="faq" eyebrow="QUESTIONS" title="About pricing">
        <Faq items={[
          ['Is the free plan really free?', 'Yes. You can build, publish and export websites without paying. There is no card needed to start.'],
          ['What will paid plans include?', 'The items marked “planned” above are what we are working towards. Nothing marked planned is available yet, and we will say so plainly when it is.'],
          ['Can I take my website with me?', 'Yes. You can download your site as HTML files or a ZIP and host it anywhere.'],
          ['Who do I ask about teams or agencies?', 'Use the contact form and tell us how you work. We read every message.'],
        ]} />
      </Section>
    </MarketingPage>
  )
}

/* ───────────────────────── About ───────────────────────── */
export function About() {
  return (
    <MarketingPage title="About us" description={`${BRAND.name} helps small businesses, schools and individuals get a professional website without developers.`}>
      <PageHero eyebrow="ABOUT" title={`We’re ${BRAND.short}.`} accent="We make websites simple." lede="Most small businesses need a good website and have neither the time nor the budget for a developer. We build the tool that closes that gap." />
      <Section>
        <div className="mk-split">
          <div className="mk-prose">
            <h2>Why we built this</h2>
            <p>A shop owner, a school, a coaching class or a freelancer should be able to put a clear, good-looking website online in an afternoon. Too many builders ask you to learn their jargon first, or hide the useful parts behind a wall of templates you cannot change.</p>
            <p>{BRAND.name} starts from a different idea: tell us what you do, pick a starting point, and change anything by clicking it. Layouts begin empty, templates stay fully editable, and your site is yours to take away.</p>
          </div>
          <div className="mk-prose">
            <h2>What we care about</h2>
            <CardGrid columns={2} items={[
              { icon: <Sparkles size={20} />, title: 'Simple first', text: 'Plain words instead of technical terms, and one clear next step on every screen.' },
              { icon: <Heart size={20} />, title: 'Made for small teams', text: 'Built around the sites small businesses, schools and individuals actually need.' },
              { icon: <ShieldCheck size={20} />, title: 'Yours to keep', text: 'Export your whole site any time. No lock-in.' },
              { icon: <Globe2 size={20} />, title: 'Works everywhere', text: 'Sites that look right on phones, tablets and computers.' },
            ]} />
          </div>
        </div>
      </Section>
      <CtaBand title="Build something with us" text="Have an idea, a question or a feature you wish existed? We would like to hear it." label="Start building" secondary={{ label: 'Get in touch', to: '/contact' }} />
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
  return (
    <MarketingPage title="Help centre" description={`Answers to common questions about building, editing and publishing with ${BRAND.name}.`}>
      <PageHero eyebrow="HELP CENTRE" title="Quick answers," accent="in plain words." lede="How to start, how to edit, and how to publish. Can’t find what you need? Write to us.">
        <div className="mk-cta-actions" style={{ marginTop: 24 }}><Link className="mk-btn mk-btn-ghost" to="/contact"><Search size={16} /> Ask us something else</Link></div>
      </PageHero>
      <Section eyebrow="GETTING STARTED">
        <CardGrid columns={3} items={[
          { icon: <Rocket size={20} />, title: 'Create your account', text: 'Sign up with your email or Google. Your sites are saved to your workspace.' },
          { icon: <LayoutTemplate size={20} />, title: 'Choose how to start', text: 'From the start page pick “Choose a template” or “Create a site”.' },
          { icon: <MousePointer2 size={20} />, title: 'Edit by clicking', text: 'Click text, images or buttons on the page. The panel on the right shows what you can change.' },
        ]} />
      </Section>
      <Section id="faq" eyebrow="QUESTIONS" title="Frequently asked">
        <Faq items={[
          ['Do I need to know how to code?', 'No. You edit by clicking, and everything is built from ready blocks you can move and style.'],
          ['What is the difference between a template and a layout?', 'A template is a finished, designed website. A layout is an empty skeleton, such as two columns or a sidebar, that you fill with widgets of your own.'],
          ['How do I add a page?', 'Open the Pages tab in the editor and press +. Name the page, and it appears in your header menu automatically.'],
          ['How do I change my colours?', 'Use Theme colours for the whole site, Page colours for one page, and Style for a single section.'],
          ['Will my site work on phones?', 'Yes. Use the Desktop, Tablet and Mobile buttons at the top of the editor to check each size as you work.'],
          ['How do I publish?', 'Use the publish or download buttons in the editor. You can also export the site as HTML files or a ZIP to host yourself.'],
          ['Where do contact-form messages go?', 'To the Enquiries page in your workspace.'],
          ['Can I undo a mistake?', 'Yes. Use Undo and Redo at the top, or the keyboard shortcuts. Replacing a page’s layout always asks first, and you can undo it.'],
          ['Who owns my website?', 'You do. You can download all of it whenever you like.'],
        ]} />
      </Section>
      <CtaBand title="Still stuck?" text="Send us a message and tell us what you were trying to do." label="Contact us" to="/contact" />
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
