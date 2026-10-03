import { Check, Globe2, Layers3, MonitorSmartphone, MousePointer2, Palette } from 'lucide-react'

/** A small illustration of the workflow, without a second editor. */
export function BuilderPreview() {
  const tools = [{ icon: MousePointer2, label: 'Edit content' }, { icon: Layers3, label: 'Add sections' }, { icon: Palette, label: 'Your colours' }, { icon: MonitorSmartphone, label: 'Preview sizes' }]
  return <div className="mk-builder" aria-label="Visual editing, responsive preview and publishing">
    <div className="mk-builder-bar"><span><Layers3 size={17} /> Your next website</span><span><Check size={14} /> Made with Peddino</span></div>
    <div className="mk-builder-body">
      <aside><span className="mk-eyebrow">YOUR TOOLKIT</span>{tools.map(({ icon: Icon, label }) => <span key={label}><Icon size={17} />{label}</span>)}</aside>
      <div className="mk-builder-canvas" aria-hidden="true"><div className="mk-demo-nav"><b>Your brand</b><span>Home · About · Contact</span></div><div className="mk-demo-hero"><span className="mk-demo-kicker">A SPACE THAT IS YOURS</span><strong>Bring your<br /><em>ideas to life.</em></strong><p>Your story. Your style. Your website.</p><span className="mk-demo-button">Explore our work <Globe2 size={14} /></span><div className="mk-demo-selection"><MousePointer2 size={19} /> Click to make it yours</div></div><div className="mk-demo-cards"><span /><span /><span /></div></div>
    </div>
    <div className="mk-builder-caption"><Check size={15} /> Start with a design. Make every detail your own.</div>
  </div>
}
