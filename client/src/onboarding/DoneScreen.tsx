import { ArrowRight, Check, LayoutTemplate, Loader2, Wand2 } from 'lucide-react'

export function DoneScreen({
  name,
  categoryImage,
  categoryLabel,
  savedItems,
  onBrowseTemplates,
  onBuildFromWidgets,
  building = false,
  onBackToSites,
}: {
  name: string
  categoryImage?: string
  categoryLabel?: string
  savedItems: string[]
  onBrowseTemplates: () => void
  onBuildFromWidgets: () => void
  building?: boolean
  onBackToSites: () => void
}) {
  return (
    <div className="create-done">
      <div className="create-done-mark animate-scale-in" aria-hidden="true">
        <svg viewBox="0 0 24 24" width={30} height={30}>
          <path
            d="M4 12l5 5L20 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={0}
            className="create-done-check"
          />
        </svg>
      </div>

      <h1 className="create-heading">Your profile is ready</h1>
      <p className="create-done-sub">
        {name || 'Your business'} is saved as a draft. Choose how you'd like to start building it.
      </p>

      <div className="create-done-card">
        {categoryImage && (
          <div className="create-done-thumb">
            <img src={categoryImage} alt="" loading="lazy" />
          </div>
        )}
        <div className="create-done-info">
          <div className="create-done-title-row">
            <span className="create-done-name">{name || 'Untitled business'}</span>
            <span className="create-badge">Draft</span>
          </div>
          {categoryLabel && <p className="create-done-category">{categoryLabel}</p>}
          {savedItems.length > 0 && (
            <ul className="create-done-list">
              {savedItems.map((item) => (
                <li key={item}>
                  <Check size={13} />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="create-done-paths">
        <div className="create-done-path">
          <LayoutTemplate size={18} />
          <h3>Choose a template</h3>
          <p>Pick from ready-made designs and widget-based layouts, then edit it to fit your business.</p>
          <button type="button" className="create-btn create-btn-ghost-accent" onClick={onBrowseTemplates}>
            Browse templates
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="create-done-path">
          <Wand2 size={18} />
          <h3>Build with widgets</h3>
          <p>Start from a clean page with your details filled in, then drag in any of 200+ widgets to design your own site.</p>
          <button type="button" className="create-btn create-btn-accent" disabled={building} onClick={onBuildFromWidgets}>
            {building ? <Loader2 size={15} className="animate-spin" /> : null}
            {building ? 'Opening…' : 'Build this layout'}
            {building ? null : <ArrowRight size={15} />}
          </button>
        </div>
      </div>

      <button type="button" className="create-done-back" onClick={onBackToSites}>
        Back to sites
      </button>
    </div>
  )
}
