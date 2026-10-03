import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Droplet, Image, Images, Layers3, LayoutGrid, LayoutTemplate, Loader2, Monitor, MousePointer2, Palette, Pencil, Sparkles, Square, Type, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { openStarterEditor, openTemplatesPath } from './brief-actions'
import { loadCatalog, useCatalog } from '@/store/catalogStore'
import {
  analyzeBusinessBrief, briefError, briefFromDirection, chipPresets, detectPreset, generalPreset, loadBrief, MAX_BRIEF_LENGTH,
  onBriefAdopted, samplePreview, saveBrief, type BusinessDirection, type ChipId,
} from './business-brief'

type Status = 'idle' | 'typing' | 'selected' | 'validating' | 'analyzing' | 'success' | 'error'

const widgetIcons: Record<string, typeof Type> = { Text: Type, Image, Button: Square, Section: Layers3, Container: LayoutTemplate, Gallery: Images }
const sampleColours = ['#7c3aed', '#ec4899', '#3b82f6', '#06b6d4', '#f97316', '#9ca3af']

/**
 * "05 / Try your idea": the prompt on the left, a picture of the builder on the
 * right that follows the kind of business. All the per-business values come from
 * `business-brief.ts`; this file only draws them and moves between states.
 */
export function TryYourIdea() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const [saved] = useState(loadBrief)
  const presets = useCatalog((s) => s.presets)
  const chips = useMemo(() => chipPresets(presets), [presets])
  const [description, setDescription] = useState(saved?.description ?? '')
  const [selected, setSelected] = useState<ChipId | null>(saved?.selectedPreset ?? null)
  const [direction, setDirection] = useState<BusinessDirection | null>(saved?.direction ?? null)
  const [status, setStatus] = useState<Status>(saved?.direction ? 'success' : saved?.description ? 'typing' : 'idle')
  const [error, setError] = useState('')
  const [opening, setOpening] = useState<'template' | 'widgets' | null>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const descriptionRef = useRef(description)
  const result = useRef<HTMLDivElement>(null)
  // A newer edit makes an analysis that is still running out of date.
  const run = useRef(0)

  useEffect(() => { descriptionRef.current = description }, [description])

  // The presets come from the API; the bundled copy shows meanwhile.
  useEffect(() => { void loadCatalog() }, [])

  // A brief saved on another device arrives after sign-in. It fills an untouched box, never one being typed in.
  useEffect(() => onBriefAdopted((brief) => {
    if (descriptionRef.current.trim()) return
    run.current += 1
    setDescription(brief.description)
    setSelected(brief.selectedPreset ?? null)
    setDirection(brief.direction ?? null)
    setStatus(brief.direction ? 'success' : brief.description ? 'typing' : 'idle')
  }), [])

  const presetId = selected ?? detectPreset(description, presets) ?? (description.trim() ? 'general' : null)
  const activePreset = presetId ? presets.find((preset) => preset.id === presetId) ?? generalPreset(presets) : null
  const preview = activePreset ? activePreset.preview : samplePreview
  const theme = activePreset ? activePreset.direction.themeDirection : null
  const analyzing = status === 'analyzing'

  // Keep the draft, so a refresh or the next step still has what was typed.
  useEffect(() => {
    if (direction) saveBrief(briefFromDirection(description, selected, direction))
    else if (description || selected) saveBrief({ description, selectedPreset: selected })
  }, [description, selected, direction])

  function edit(next: string, chip: ChipId | null, nextStatus: Status) {
    run.current += 1
    setDescription(next)
    setSelected(chip)
    setDirection(null)
    setError('')
    setStatus(nextStatus)
  }

  function chooseExample(id: ChipId) {
    edit(presets.find((preset) => preset.id === id)?.example ?? '', id, 'selected')
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (analyzing) return
    setStatus('validating')
    const problem = briefError(description)
    if (problem) {
      setError(problem)
      setStatus('error')
      field.current?.focus()
      return
    }
    const mine = ++run.current
    setError('')
    setStatus('analyzing')
    try {
      const found = await analyzeBusinessBrief(description, selected, presets)
      if (mine !== run.current) return
      setDirection(found)
      setStatus('success')
      requestAnimationFrame(() => result.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }))
    } catch {
      if (mine !== run.current) return
      setError('We could not read that just now. Please try again.')
      setStatus('error')
    }
  }

  /** The next steps live inside the app, so a signed-out visitor signs in first; the brief is already saved. */
  function needSignIn(): boolean {
    if (token) return false
    toast('Sign in to continue. Your idea is saved.')
    navigate('/sign-in', { state: { from: '/' } })
    return true
  }

  function chooseTemplate() {
    if (!direction || needSignIn()) return
    navigate(openTemplatesPath(description, direction))
  }

  async function buildWithWidgets() {
    if (!direction || opening || needSignIn()) return
    setOpening('widgets')
    try { navigate(await openStarterEditor(description, direction)) }
    catch (problem) { toast.error(problem instanceof Error ? problem.message : 'Could not open the editor. Please try again.') }
    finally { setOpening(null) }
  }

  const style = { '--tx-a': preview.tint[0], '--tx-b': preview.tint[1], '--tx-ink': preview.ink, '--tx-accent': theme?.accentColor ?? '#cdb394' } as CSSProperties
  const dots = theme ? [theme.primaryColor, theme.accentColor, ...sampleColours.slice(2)] : sampleColours

  return <>
    <i className="tryx-glow tryx-glow-a" aria-hidden="true" /><i className="tryx-glow tryx-glow-b" aria-hidden="true" /><div className="tryx-grid">
      <div className="tryx-left">
        <span className="tryx-eyebrow">05 / TRY YOUR IDEA</span>
        <h2>Turn your idea into a<br /><span className="tryx-grad">stunning website</span> with AI.</h2>
        <p className="tryx-lede">Describe your business in a few words and we’ll turn your idea into a clear website direction.</p>
        <form className="tryx-card" noValidate onSubmit={(event) => void submit(event)}>
          <label htmlFor="business-brief">What are you building?</label>
          <textarea id="business-brief" ref={field} maxLength={MAX_BRIEF_LENGTH} value={description}
            onChange={(event) => edit(event.target.value, detectPreset(event.target.value, presets), event.target.value ? 'typing' : 'idle')}
            placeholder="A design studio called Forma, creating thoughtful interiors for modern homes…" rows={5}
            aria-invalid={Boolean(error)} aria-describedby={error ? 'business-brief-error' : 'business-brief-count'} />
          <div className="tryx-meta">
            <p id="business-brief-error" className="tryx-error" role="alert">{error}</p>
            <small id="business-brief-count" className="tryx-count">{description.length} / {MAX_BRIEF_LENGTH}</small>
          </div>
          <div className="tryx-chips" role="group" aria-label="Try an example"><span>Try an example:</span>{chips.map((chip) => <button key={chip.id} type="button" className={`tryx-chip${selected === chip.id ? ' is-active' : ''}`} aria-pressed={selected === chip.id} onClick={() => chooseExample(chip.id)}>{chip.label}</button>)}</div>
          <button className="tryx-cta" type="submit" disabled={analyzing} aria-busy={analyzing}>
            {analyzing ? <><Loader2 size={18} className="animate-spin" /> Finding your direction...</>
              : status === 'success' ? <><Check size={18} /> Direction ready</>
                : <><Wand2 size={18} /> Find my direction <ArrowRight size={17} /></>}
          </button>
          <span className="sr-only" role="status">{analyzing ? 'Finding your direction' : status === 'success' ? 'Your website direction is ready below' : ''}</span>
        </form>
      </div>
      <div className="tryx-right">
        <div className="tryx-stage"><div className="tryx-orbit one" aria-hidden="true" /><div className="tryx-orbit two" aria-hidden="true" /><div className="tryx-builder" aria-hidden="true">
          <div className="tryx-bar"><i /><i /><i /><span>{presetId ? `${preview.title} · ${preview.tagline}` : 'Peddino Site Builder · Editor'}</span><div className="tryx-bar-actions"><em><Sparkles size={11} />AI draft</em><b>Publish</b></div></div>
          <div className="tryx-command-row"><span><Wand2 size={12} /> Generate layout</span><span><Palette size={12} /> Match brand</span><span><Monitor size={12} /> Responsive</span></div>
          <div className="tryx-body">
            <aside><strong>Widgets</strong>{preview.widgets.map((name) => { const Icon = widgetIcons[name] ?? LayoutTemplate; return <span key={name}><Icon size={13} />{name}</span> })}</aside>
            <div className={`tryx-canvas${presetId ? ' is-themed' : ''}`} style={style}>
              <div className="tryx-nav"><b>{preview.brand}</b>{preview.nav.map((item) => <span key={item}>{item}</span>)}<button>{preview.navButton}</button></div>
              <div className="tryx-hero">
                <div className="tryx-copy-block"><span>{preview.kind}</span><h4>{preview.headline.split('\n').map((line, i) => <Fragment key={line}>{i > 0 && <br />}{line}</Fragment>)}</h4><p>{preview.blurb}</p><em>{preview.cta}</em></div>
                <div className="tryx-photo"><i /><i /><i /><strong>New project</strong></div>
              </div>
              <div className="tryx-section-row">{preview.stats.map(([value, label]) => <span key={label}><b>{value}</b> {label}</span>)}</div>
              <div className="tryx-selection"><i /><i /><i /><i /><span><Pencil size={12} /> {preview.selected}</span></div>
            </div>
          </div>
        </div>
        <div className="tryx-float tryx-float-templates"><strong><LayoutTemplate size={14} /> Choose a Template</strong><div>{['Business', 'Portfolio', 'Restaurant', 'Education'].map((name, i) => <span key={name} className={`tryx-thumb t${i}`}><i />{name}</span>)}</div><Link to="/start">View templates <ArrowRight size={13} /></Link></div>
        <div className="tryx-float tryx-float-ai"><strong><Sparkles size={14} /> AI Suggestions</strong><span>{preview.ai}</span><small><Check size={12} /> {preview.ready}% ready</small></div>
        <div className="tryx-float tryx-float-colors"><strong><Droplet size={14} /> Theme Colors</strong><div>{dots.map((color) => <i key={color} style={{ background: color }} />)}</div></div>
        </div>
        <div className="tryx-badges"><span><LayoutGrid size={14} /> 200+ Widgets</span><span><LayoutTemplate size={14} /> 300+ Templates</span><span><MousePointer2 size={14} /> Drag &amp; Drop</span></div>
        <div aria-live="polite">
          {direction && status === 'success' && <div ref={result} tabIndex={-1} className="brief-result has-result tryx-result">
            <span className="studio-badge"><Check size={13} /> YOUR WEBSITE DIRECTION</span>
            <h3>{direction.businessName}</h3>
            <p>{direction.businessType} · {direction.suggestedTemplateCategory} · {direction.themeDirection.style}</p>
            <dl className="tryx-dir">
              <div><dt>Recommended pages</dt><dd>{direction.suggestedPages.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Sections</dt><dd>{direction.suggestedSections.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Recommended features</dt><dd>{direction.recommendedFeatures.map((item) => <span key={item}>{item}</span>)}</dd></div>
              <div><dt>Colours</dt><dd><i className="tryx-swatch" style={{ background: direction.themeDirection.primaryColor }} /><i className="tryx-swatch" style={{ background: direction.themeDirection.accentColor }} /></dd></div>
            </dl>
            <div className="tryx-next">
              <button type="button" className="tryx-next-primary" onClick={chooseTemplate} disabled={opening !== null}><LayoutTemplate size={15} /> Choose a Template</button>
              <button type="button" className="tryx-next-secondary" onClick={() => void buildWithWidgets()} disabled={opening !== null}>{opening === 'widgets' ? <Loader2 size={15} className="animate-spin" /> : <Layers3 size={15} />} {opening === 'widgets' ? 'Opening the editor…' : 'Build with Widgets'}</button>
            </div>
          </div>}
        </div>
      </div>
    </div>
  </>
}
