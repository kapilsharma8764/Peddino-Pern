import { useEffect, useRef, type ReactNode, type SyntheticEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, Check, Globe2, Image as ImageIcon, LayoutTemplate, Lightbulb, MousePointer2, PanelsTopLeft, Sparkles, SquareDashedMousePointer, Type } from 'lucide-react'

import { useMotion } from './motion-context'


export function AmbientBackground() {
  return <div className="studio-ambient" aria-hidden="true"><i /><i /><div className="studio-stars" /></div>
}

export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { node.classList.add('is-visible'); observer.disconnect() }
    }, { threshold: 0.08 })
    node.classList.add('will-reveal')
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`studio-reveal ${className}`}>{children}</div>
}

const showcaseTemplates = [
  { id: 'interior', name: 'Ideal Interior', category: 'Architecture & interiors' },
  { id: 'osteriax', name: 'Osteriax', category: 'Food & hospitality' },
  { id: 'fitgym', name: 'FitGym', category: 'Fitness & wellbeing' },
  { id: 'traveller', name: 'Traveller', category: 'Travel & experiences' },
  { id: 'bizpage', name: 'BizPage', category: 'Business & agencies' },
  { id: 'bedoctor', name: 'BeDoctor', category: 'Health & care' },
]

const orbitLoop = [...showcaseTemplates, ...showcaseTemplates]
const templateFallback =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 960 640%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 x2=%221%22 y1=%220%22 y2=%221%22%3E%3Cstop stop-color=%22%23f7f5ff%22/%3E%3Cstop offset=%221%22 stop-color=%22%23e9f0ff%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=%22960%22 height=%22640%22 fill=%22url(%23g)%22/%3E%3Crect x=%2280%22 y=%2278%22 width=%22800%22 height=%22484%22 rx=%2232%22 fill=%22%23ffffff%22 stroke=%22%23ddd7ef%22 stroke-width=%223%22/%3E%3Ccircle cx=%22122%22 cy=%22122%22 r=%2211%22 fill=%22%237c52d6%22/%3E%3Crect x=%22155%22 y=%22113%22 width=%22140%22 height=%2218%22 rx=%229%22 fill=%22%23ded7f2%22/%3E%3Crect x=%22122%22 y=%22202%22 width=%22310%22 height=%2228%22 rx=%2214%22 fill=%22%23252440%22/%3E%3Crect x=%22122%22 y=%22252%22 width=%22234%22 height=%2218%22 rx=%229%22 fill=%22%239b8ab5%22/%3E%3Crect x=%22122%22 y=%22286%22 width=%22272%22 height=%2218%22 rx=%229%22 fill=%22%23c9bfdc%22/%3E%3Crect x=%22528%22 y=%22192%22 width=%22290%22 height=%22192%22 rx=%2220%22 fill=%22%23d9e4ff%22/%3E%3Cpath d=%22M556 354l74-86 66 62 44-38 64 62z%22 fill=%22%237c52d6%22 opacity=%22.32%22/%3E%3Ctext x=%22480%22 y=%22480%22 text-anchor=%22middle%22 font-family=%22Arial,sans-serif%22 font-size=%2228%22 font-weight=%22700%22 fill=%22%23786499%22%3ETemplate preview%3C/text%3E%3C/svg%3E'

function showTemplateFallback(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.src = templateFallback
}

export function TemplateOrbit({ compact = false }: { compact?: boolean }) {
  return <div className={`template-orbit ${compact ? 'orbit-compact' : ''}`}>
    <div className="orbit-center-static"><span className="studio-eyebrow">A SPACE FOR EVERY IDEA</span><h3>Made for you.<br /><em>Made by you.</em></h3><Link className="studio-button secondary" to="/create">Start building <ArrowDown size={15} /></Link></div>
    <div className="orbit-marquee">
      <div className="orbit-track">
        {orbitLoop.map((template, index) => <Link key={`${template.id}-${index}`} to={`/templates?search=${encodeURIComponent(template.name)}`} className="orbit-card" aria-label={`Explore ${template.name} template`} aria-hidden={index >= showcaseTemplates.length} tabIndex={index >= showcaseTemplates.length ? -1 : undefined}>
          <div className="mini-browser" aria-hidden="true"><i /><i /><i /><span>{template.name.toLowerCase().replaceAll(' ', '')}.site</span></div>
          <span className="orbit-preview"><img src={`/media/templates/${template.id}.png`} alt={`${template.name} website design`} width="960" height="640" loading="lazy" onError={showTemplateFallback} /></span>
          <span className="orbit-caption">{template.name}<span>{template.category}</span></span>
        </Link>)}
      </div>
    </div>
  </div>
}

export function WorkflowDiagram() {
  return <div className="wf" aria-label="Your business details and a template come together in the visual editor, ready to publish">
    <i className="wf-sphere" aria-hidden="true" /><i className="wf-dots" aria-hidden="true" />
    <div className="wf-row">
      <div className="wf-card wf-idea"><div className="wf-head"><span className="wf-badge"><Lightbulb size={20} /></span><div><strong>Your idea</strong><small>DETAILS & CONTENT</small></div></div><span className="wf-line" /><span className="wf-line short" /></div>
      <div className="wf-card wf-design"><div className="wf-head"><span className="wf-badge"><LayoutTemplate size={20} /></span><div><strong>Your design</strong><small>CURATED TEMPLATES</small></div></div><div className="wf-thumbs">{['interior', 'osteriax', 'fitgym'].map((id) => <img key={id} src={`/media/templates/${id}.png`} alt="" width="96" height="64" loading="lazy" />)}</div></div>
    </div>
    <svg className="wf-join" viewBox="0 0 520 90" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path id="wf-p1" className="wf-path" d="M130 0 C130 55 260 30 260 90" /><path id="wf-p2" className="wf-path" d="M390 0 C390 55 260 30 260 90" />
      <circle className="wf-ball" r="4"><animateMotion dur="3.2s" repeatCount="indefinite" begin="1.6s"><mpath href="#wf-p1" /></animateMotion></circle>
      <circle className="wf-ball" r="4"><animateMotion dur="3.2s" repeatCount="indefinite" begin="2.4s"><mpath href="#wf-p2" /></animateMotion></circle>
    </svg>
    <div className="wf-card wf-studio"><div className="wf-head"><span className="wf-badge"><PanelsTopLeft size={22} /></span><div><strong>Peddino Site Builder</strong><small>MAKE EVERY DETAIL YOURS</small></div></div>
      <div className="wf-editor"><div className="wf-bar"><i /><i /><i /></div><div className="wf-edit-body"><div className="wf-tools"><Type size={13} /><ImageIcon size={13} /><SquareDashedMousePointer size={13} /><LayoutTemplate size={13} /></div><div className="wf-canvas"><div className="wf-chips"><b /><b /><b /><em /></div><div className="wf-hero" /></div></div><MousePointer2 className="wf-cursor" size={22} /></div></div>
    <svg className="wf-stem" viewBox="0 0 4 40" aria-hidden="true"><line className="wf-path" x1="2" y1="0" x2="2" y2="40" /><circle className="wf-ball" r="3.5" cx="2"><animate attributeName="cy" from="0" to="40" dur="1.8s" repeatCount="indefinite" begin="2s" /></circle></svg>
    <div className="wf-card wf-live"><div className="wf-head"><span className="wf-badge"><Globe2 size={22} /></span><div><strong>Your website, live. <span className="live-dot" /></strong><small>READY FOR THE WORLD</small></div></div>
      <div className="wf-devices" aria-hidden="true"><div className="wf-monitor"><i /></div><div className="wf-tablet"><i /></div><div className="wf-phone"><i /></div></div></div>
    <div className="flow-footer"><span><Check size={13} /> Your content</span><span><Check size={13} /> Your style</span><span><Check size={13} /> Every screen</span></div>
  </div>
}

export function EditorScene() {
  return <div className="editor-scene" aria-label="A preview of the Peddino Site Builder visual editor">
    <div className="scene-glow" aria-hidden="true" />
    <div className="editor-float"><div className="scene-toolbar"><span><PanelsTopLeft size={15} /> Peddino Site Builder <b>/ Ideal Interior</b></span><span className="scene-devices">Desktop <span>Tablet</span> <span>Mobile</span></span><span className="scene-publish">Publish <ArrowDown size={11} /></span></div>
      <div className="scene-body"><aside><span className="studio-eyebrow">ELEMENTS</span><div className="scene-tools">{['Heading', 'Image', 'Button', 'Columns', 'Video', 'Form'].map((item, index) => <div key={item}><span>{['T', '◩', '↗', '▥', '▷', '☷'][index]}</span>{item}</div>)}</div><span className="studio-eyebrow">LAYERS</span><p>⌄ &nbsp; Main page</p><p> &nbsp; ↳ Navigation</p><p className="layer-selected"> &nbsp; ↳ Hero section</p><p> &nbsp; ↳ Our work</p></aside><div className="scene-canvas"><img src="/media/templates/interior.png" alt="Ideal Interior template inside the visual editor" width="960" height="640" /><span className="scene-selection"><b>Hero section</b></span><span className="scene-cursor"><MousePointer2 size={20} fill="currentColor" /> You</span></div></div>
    </div>
    <div className="scene-chip scene-chip-one"><span className="chip-icon"><Sparkles size={18} /></span><div><strong>Designed around you</strong><small>Your brand. Every detail.</small></div></div>
    <div className="scene-chip scene-chip-two"><span className="live-dot" /><span>Ready to publish</span><Check size={14} /></div>
  </div>
}

export function ShowreelVideo() {
  const ref = useRef<HTMLVideoElement>(null)
  const { paused } = useMotion()
  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (paused) { video.pause(); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) video.play().catch(() => {})
      else video.pause()
    }, { threshold: 0.5 })
    observer.observe(video)
    return () => observer.disconnect()
  }, [paused])
  return <div className="studio-showreel"><video ref={ref} playsInline loop muted preload="none" poster="/media/studio-film-poster.jpg" aria-label="Peddino Site Builder 3D template showcase, a silent animation of website designs">
    <source src="/media/studio-film.webm" type="video/webm" />
    Your browser cannot play this video. <a href="/media/studio-film.webm">Download the template showcase</a>.
  </video><div className="showreel-caption"><span><span className="live-dot" /> SITEBUILDER IN MOTION</span><span>3D template showcase · 12 seconds · No audio</span></div></div>
}

