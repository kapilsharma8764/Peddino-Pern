import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronDown, Code2, Droplet, Globe2, Image, LayoutTemplate, Monitor, MousePointer2, Network, Palette, PanelsTopLeft, Pencil, Play, Rocket, Sparkles, Square, Type, Upload, Wand2 } from 'lucide-react'
import { TryYourIdea } from '@/landing/TryYourIdea'
import { listOf, usePageContent } from '@/services/contentApi'
import { EditorScene, Reveal, ShowreelVideo, TemplateOrbit, WorkflowDiagram } from '@/components/studio/Motion'
import { LandingHeroVideo } from '@/components/studio/LandingHeroVideo'
import { MarketingFooter } from '@/marketing/MarketingPage'

export function Landing() {
  const navigate = useNavigate()
  // The FAQ is managed in the database (site_content, page "home"); the bundled copy shows until it answers.
  const { sections } = usePageContent('home')
  const questions = listOf<[string, string]>(sections.faq?.content.items)
  const scrollRoot = useRef<HTMLDivElement>(null)

  return <div ref={scrollRoot} className="studio-landing h-full overflow-y-auto overflow-x-hidden" id="landing-scroll">
    <section className="studio-hero studio-container">
      <LandingHeroVideo scrollRoot={scrollRoot} />
      <div className="hero-orbit-line" aria-hidden="true" />
      <span className="studio-badge"><span className="live-dot" /> YOUR NEXT CHAPTER STARTS HERE <ArrowRight size={12} /></span>
      <h1>Your vision.<br />A website <em>worth sharing.</em></h1>
      <p>From that first idea to your own corner of the internet.<br className="desktop-break" /> Design, customise and launch. All in one creative space.</p>
      <div className="studio-actions"><button className="studio-button" onClick={() => navigate('/start')}>Get started <ArrowRight size={17} /></button><a className="studio-button secondary" href="#showreel"><Play size={15} /> Watch the film</a></div>
      <div className="hero-details"><span><Check size={12} /> No coding needed</span><span><Check size={12} /> Built for your business</span><span><Check size={12} /> Make it yours</span></div>
      <EditorScene />
    </section>

    <div className="studio-trust studio-container"><span>ONE STUDIO.<br /><b>EVERY KIND OF AMBITION.</b></span><div>Independent businesses</div><div>Creative studios</div><div>Local favourites</div><div>Big ideas</div></div>

    <section id="workflow" className="studio-section studio-container">
      <Reveal className="studio-split wf-split"><div className="wf-left">
        <span className="wf-pill"><Sparkles size={14} /> READY-MADE TEMPLATES</span>
        <h2>Start with a template.<br /><em>Finish with your brand.</em></h2>
        <p className="studio-copy">Choose a template, customize colors and content, preview every screen, and publish your website in minutes — no coding required.</p>
        <div className="wf-chips">{([[LayoutTemplate, 'Template library'], [Droplet, 'Theme colors'], [Pencil, 'Live editing'], [Monitor, 'Responsive preview']] as const).map(([Icon, label]) => <span key={label}><Icon size={15} />{label}</span>)}</div>
        <div className="wf-steps">{([[PanelsTopLeft, 'Choose a template', 'Pick from 100+ professionally designed templates for any business.'], [Palette, 'Change colors & content', 'Make it yours with your brand colors, images and content.'], [Upload, 'Publish your site', 'Preview every screen and go live in minutes — no code required.']] as const).map(([Icon, title, text], i) => <div key={title} className="wf-step"><span className="wf-step-icon"><Icon size={20} /><b>{i + 1}</b></span><h4>{title}</h4><p>{text}</p></div>)}</div>
        <div className="wf-structure"><span className="wf-structure-label"><Network size={15} /> Site structure</span><div className="wf-structure-flow">{['Header', 'Pages', 'Widgets', 'Footer'].map((item, i) => <span key={item}>{i > 0 && <ArrowRight size={12} />}<em>{item}</em></span>)}</div><Link to="/build">Build by structure <ArrowRight size={14} /></Link></div>
        <div className="wf-templates" aria-hidden="true">{([['interior', 'Business'], ['osteriax', 'Portfolio'], ['fitgym', 'Online Store']] as const).map(([id, label]) => <figure key={id}><img src={`/media/templates/${id}.png`} alt="" loading="lazy" /><figcaption>{label}</figcaption></figure>)}</div>
        <div className="wf-cta"><button className="studio-button wf-browse" onClick={() => navigate('/templates')}><Sparkles size={16} /> Browse templates <ArrowRight size={16} /></button><span className="wf-note"><Code2 size={20} /><span><b>No code required</b>Works for business, portfolio, agency, store</span></span></div>
      </div><WorkflowDiagram /></Reveal>
    </section>

    <section id="templates" className="studio-template-section"><Reveal className="studio-container section-heading"><span className="studio-eyebrow">02 / THE COLLECTION</span><h2>A head start.<br /><em>Not a blank canvas.</em></h2><p className="studio-copy">Explore designs for real businesses. Find your starting point and turn it into something entirely your own.</p></Reveal><TemplateOrbit /></section>

    <section id="features" className="studio-section studio-container">
      <Reveal>
        <div className="section-heading how-heading"><span className="how-pill">How it works</span><h2>Build Your Website in <strong>3 Simple Steps</strong></h2><p className="studio-copy">A powerful yet simple platform to create, customize and publish stunning websites without writing a single line of code.</p></div>
        <div className="how-steps-grid">
          <article className="how-step-card">
            <span className="step-number">01</span>
            <div className="step-icon step-icon-purple"><MousePointer2 size={26} /></div>
            <span className="step-kicker">Visual Editing</span>
            <h3>See it. Change it.<br />Love it.</h3>
            <p>Click on any element to edit. Customize text, images, colours and layout with simple controls — no code required.</p>
            <div className="step-visual edit-visual" aria-hidden="true">
              <div className="mini-window editor-window">
                <div className="window-dots"><i /><i /><i /></div>
                <div className="editor-panel">
                  <span><Type size={13} />Text</span>
                  <span><Image size={13} />Image</span>
                  <span><Square size={13} />Button</span>
                </div>
                <div className="editor-canvas-card">
                  <div className="editor-toolbar"><b>Inter</b><b>32</b><b>B</b><b>I</b></div>
                  <div className="selected-copy">Build Your<br /><strong>Dream Website</strong></div>
                  <div className="landscape-thumb" />
                </div>
              </div>
              <div className="colour-popover">
                <b>Text Color</b>
                <span className="colour-row"><i /><i /><i /><i /><i /></span>
                <span className="colour-slider" />
              </div>
              <MousePointer2 className="floating-cursor" size={36} />
            </div>
            <Link className="step-link" to="/create">See live editing in action <ArrowRight size={17} /></Link>
          </article>

          <article className="how-step-card">
            <span className="step-number">02</span>
            <div className="step-icon step-icon-blue"><Monitor size={26} /></div>
            <span className="step-kicker blue">Responsive Design</span>
            <h3>Every screen.<br />Considered.</h3>
            <p>Your website looks perfect on desktop, tablet and mobile. Switch between devices and fine-tune every detail.</p>
            <div className="step-visual responsive-visual" aria-hidden="true">
              <span className="device-pill desktop"><Monitor size={14} />Desktop</span>
              <div className="mock-device desktop-device">
                <div className="site-bar">Brand <span>Home About Services Contact</span></div>
                <h4>Modern & Creative<br />Websites</h4>
                <i />
                <div className="device-cta">Get Started</div>
              </div>
              <div className="mock-device tablet-device">
                <div className="site-bar">Brand <span>Menu</span></div>
                <h4>Modern & Creative<br />Websites</h4>
                <i />
              </div>
              <div className="mock-device phone-device">
                <div className="site-bar">Menu</div>
                <h4>Modern<br />Websites</h4>
                <i />
              </div>
              <span className="device-pill tablet">Tablet</span>
              <span className="device-pill mobile">Mobile</span>
            </div>
            <Link className="step-link" to="/create">Explore responsive design <ArrowRight size={17} /></Link>
          </article>

          <article className="how-step-card">
            <span className="step-number">03</span>
            <div className="step-icon step-icon-purple"><Rocket size={26} /></div>
            <span className="step-kicker">Publishing</span>
            <h3>From an idea<br />to out there.</h3>
            <p>Publish your website, revisit your designs and keep customer enquiries in one place.</p>
            <div className="step-visual publish-visual" aria-hidden="true">
              <div className="mini-window publish-window">
                <div className="window-dots"><i /><i /><i /></div>
                <h4>Publish Your Website</h4>
                {['Layout finalised', 'Colours selected', 'SEO optimised', 'Ready to publish'].map((label) => <span key={label}>{label}<Check size={15} /></span>)}
                <div className="publish-now-chip">Publish now <ArrowRight size={15} /></div>
              </div>
              <div className="globe-mark"><Globe2 size={58} /></div>
              <div className="live-card">Live<br />on the web!</div>
              <div className="url-chip">https://yourwebsite.com</div>
            </div>
            <Link className="step-link" to="/create">See how publishing works <ArrowRight size={17} /></Link>
          </article>
        </div>
      </Reveal>
    </section>

    <section id="showreel" className="studio-section studio-container"><Reveal><div className="showreel-heading"><div><span className="studio-eyebrow">04 / A LITTLE PERSPECTIVE</span><h2>Good ideas.<br /><em>In full motion.</em></h2></div><p className="studio-copy">A closer look at the possibilities.<br />Explore our templates from a different angle.</p></div><ShowreelVideo /></Reveal></section>

    <section id="try-it" className="studio-section studio-container"><Reveal className="brief-section tryx"><TryYourIdea /></Reveal></section>

    <section className="studio-section faq-section">
      <Reveal className="studio-container faq-pro">
        <i className="faq-blob faq-blob-a" aria-hidden="true" />
        <i className="faq-blob faq-blob-b" aria-hidden="true" />
        <i className="faq-spark faq-spark-a" aria-hidden="true" />
        <i className="faq-spark faq-spark-b" aria-hidden="true" />
        <div className="faq-copy">
          <span className="studio-eyebrow">A FEW GOOD QUESTIONS</span>
          <h2>A little clarity.<br /><em>Before you begin.</em></h2>
          <p>Find quick answers to common questions before starting your website. Still need help? We’re here for you anytime.</p>
          <div className="faq-pills" aria-hidden="true">
            <span><Code2 size={17} /> No coding</span>
            <span><Monitor size={17} /> Mobile ready</span>
            <span><Wand2 size={17} /> Easy updates</span>
          </div>
        </div>
        <div className="studio-faq faq-cards">
          {questions.map(([question, answer], index) => {
            const faqIcons = [Code2, Palette, Monitor, Wand2] as const
            const Icon = faqIcons[index] || Code2
            return <details key={question} open={index === 0} className={`faq-card tone-${index}`}>
              <summary><span className="faq-icon"><Icon size={22} /></span><strong>{question}</strong><span className="faq-toggle"><ChevronDown size={18} /></span></summary>
              <p>{answer}</p>
            </details>
          })}
        </div>
      </Reveal>
    </section>
    <section className="studio-final studio-container"><Reveal><span className="studio-badge"><Sparkles size={13} /> THE NEXT MOVE IS YOURS</span><h2>Make something<br /><em>you’re proud of.</em></h2><Link className="studio-button" to="/start">Let’s build your website <ArrowRight size={17} /></Link></Reveal></section>
    <MarketingFooter />
  </div>
}
