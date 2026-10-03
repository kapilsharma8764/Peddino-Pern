import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  ChefHat,
  Dumbbell,
  GraduationCap,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Scissors,
  Stethoscope,
  Upload,
  Wand2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { useBusinessStore } from '@/store/businessStore'
import { categoryOptions } from '@/onboarding/profile'
import { suggestAbout, suggestSlogans } from '@/onboarding/suggestions'
import { ImageReadError, readImageAsDataUrl } from '@/onboarding/read-image'
import { LogoDesigner } from '@/onboarding/LogoDesigner'
import { toSquare, trimEdges } from '@/onboarding/crop'
import { useAIAssist } from '@/onboarding/useAIAssist'
import { GeneratingScreen } from '@/onboarding/GeneratingScreen'
import { DoneScreen } from '@/onboarding/DoneScreen'
import { useMotion } from '@/components/studio/motion-context'
import { customSite } from '@/layouts/custom-site'
import { initBuilder } from '@/builder/core'
import { usePublishStore } from '@/store/publishStore'
import { api } from '@/lib/api'

/**
 * The Create Website flow: business + category, brand, story, contact
 * details, then a short transition into the template chooser — the site
 * itself is built there once a design is picked, so this wizard only ever
 * saves the profile. Four short steps rather than one long form.
 */

const STEP_LABELS = ['Business', 'Story', 'Details']

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  GraduationCap,
  ChefHat,
  Scissors,
  Dumbbell,
  Stethoscope,
  Building2,
  Wrench,
  Briefcase,
  LayoutGrid,
}

const CATEGORY_IMAGES: Record<string, string> = {
  education: '/media/categories/education.jpg',
  food: '/media/categories/food.jpg',
  beauty: '/media/categories/beauty.jpg',
  fitness: '/media/categories/fitness.jpg',
  health: '/media/categories/clinic-team.jpg',
  'home-services': '/media/categories/home-services.jpg',
  professional: '/media/categories/professional.jpg',
  realestate: '/media/categories/realestate.jpg',
  other: '/media/categories/other.jpg',
}

interface CategoryCardProps {
  label: string
  hint: string
  selected: boolean
  onSelect: () => void
  icon?: string
  image?: string
}

function CategoryCard({ label, hint, selected, onSelect, icon }: CategoryCardProps) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || LayoutGrid
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`wizard-category group relative flex h-[140px] w-full flex-col justify-between overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-500 ${
        selected
          ? 'border-2 border-[#7C3AED] bg-purple-50/20 ring-2 ring-[#7C3AED]/15'
          : 'border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
          <Icon size={17} strokeWidth={1.8} />
        </span>
        <span aria-hidden="true" className="mr-6 flex h-12 w-12 rotate-[-8deg] items-center justify-center rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-violet-100 text-violet-400 shadow-[3px_5px_0_rgba(124,58,237,0.08)]">
          <Icon size={29} strokeWidth={1.4} />
        </span>
      </div>
      <div>
        <span className="block text-sm font-semibold leading-tight text-slate-900">{label}</span>
        <span className="mt-0.5 block text-xs leading-normal text-slate-500 line-clamp-2">{hint}</span>
      </div>
      {selected && <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-sm"><Check size={12} strokeWidth={3} /></span>}
    </button>
  )
}

/** The unified AI-assist pill — same shape whether it opens a designer or types a suggestion in. */
function AIAssist({ label, busy, onClick }: { label: string; busy?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} className={`ai-assist ${busy ? 'ai-assist-busy' : ''}`}>
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={12} />}
      {!busy && label}
    </button>
  )
}

export function LogoRow({
  index,
  label,
  help,
  value,
  onChange,
  businessName,
  onDesign,
}: {
  index: number
  label: string
  help: string
  value: string
  onChange: (v: string) => void
  businessName?: string
  /** Only the main logo offers to design one; the square mark follows it. */
  onDesign?: (logo: string, squareMark: string) => void
}) {
  const [broken, setBroken] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [reading, setReading] = useState(false)
  const [designing, setDesigning] = useState(false)
  const inputId = `logo-${label.replace(/\s+/g, '-').toLowerCase()}`
  const hasImage = Boolean(value) && !broken

  async function tidy(operation: (source: string) => Promise<string>, done: string) {
    if (!value) return
    setReading(true)
    try {
      const next = await operation(value)
      if (next === value) toast('Nothing to change there')
      else {
        onChange(next)
        toast(done)
      }
    } catch {
      toast.error('Could not change that image')
    } finally {
      setReading(false)
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return
    setReading(true)
    try {
      const dataUrl = await readImageAsDataUrl(file)
      setBroken(false)
      setLoaded(false)
      onChange(dataUrl)
    } catch (error) {
      toast.error(error instanceof ImageReadError ? error.message : 'Could not read that image')
    } finally {
      setReading(false)
    }
  }

  return (
    <div className="create-field" style={{ animationDelay: `${index * 55}ms` }}>
      <div className="create-field-label-row">
        <label className="create-label" htmlFor={inputId}>
          {label}
        </label>
        {onDesign && (
          <AIAssist label={designing ? 'Close' : 'Design one'} onClick={() => setDesigning((open) => !open)} />
        )}
      </div>

      <div className="logo-row">
        <div className={`logo-preview ${hasImage ? 'has-image' : ''}`}>
          {hasImage ? (
            <img
              src={value}
              alt=""
              className={loaded ? 'is-loaded' : ''}
              onLoad={() => setLoaded(true)}
              onError={() => setBroken(true)}
            />
          ) : (
            <ImageIcon size={18} className="logo-preview-empty" />
          )}
        </div>

        <div className="logo-actions">
          <div className="logo-buttons-row">
            <label htmlFor={inputId} className="logo-file-btn">
              {reading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {value ? 'Change' : 'Choose a file'}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                void pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            {value && (
              <>
                <button type="button" className="logo-remove" onClick={() => void tidy(trimEdges, 'Edges trimmed')} disabled={reading}>
                  Trim edges
                </button>
                <button type="button" className="logo-remove" onClick={() => void tidy((src) => toSquare(src), 'Squared off')} disabled={reading}>
                  Make square
                </button>
                <button
                  type="button"
                  className="logo-remove"
                  onClick={() => {
                    onChange('')
                    setLoaded(false)
                  }}
                >
                  Remove
                </button>
              </>
            )}
          </div>

          <input
            type="url"
            className="create-input"
            value={value.startsWith('data:') ? '' : value}
            placeholder="…or paste an image link"
            onChange={(e) => {
              setBroken(false)
              setLoaded(false)
              onChange(e.target.value)
            }}
          />
          <p className="create-helper">{help}</p>
        </div>
      </div>

      {designing && onDesign && (
        <div className="mt-3">
          <LogoDesigner
            businessName={businessName ?? ''}
            onUse={(logo, squareMark) => {
              setLoaded(false)
              onDesign(logo, squareMark)
              setDesigning(false)
              toast('Logo added')
            }}
            onCancel={() => setDesigning(false)}
          />
        </div>
      )}
    </div>
  )
}

function SloganField({ index }: { index: number }) {
  const profile = useBusinessStore((s) => s.profile)
  const update = useBusinessStore((s) => s.update)
  const { paused } = useMotion()
  const [cycle, setCycle] = useState(0)
  const assist = useAIAssist((value) => update({ slogan: value }))

  return (
    <div className="create-field" style={{ animationDelay: `${index * 55}ms` }}>
      <div className="create-field-label-row">
        <label className="create-label" htmlFor="slogan">
          Slogan
        </label>
        <AIAssist
          label="Suggest one"
          busy={assist.busy}
          onClick={() =>
            assist.run(() => {
              const options = suggestSlogans(profile)
              const text = options[cycle % options.length]
              setCycle((n) => n + 1)
              return text
            }, paused)
          }
        />
      </div>
      <div className={`create-ai-field ${assist.flash ? 'create-ai-flash' : ''}`}>
        <input
          id="slogan"
          type="text"
          className="create-input"
          value={profile.slogan}
          maxLength={140}
          placeholder="Learning that lasts"
          onChange={(e) => update({ slogan: e.target.value })}
        />
        {assist.busy && <div className="create-ai-shimmer" />}
      </div>
    </div>
  )
}

function AboutField({ index }: { index: number }) {
  const profile = useBusinessStore((s) => s.profile)
  const update = useBusinessStore((s) => s.update)
  const { paused } = useMotion()
  const assist = useAIAssist((value) => update({ about: value }))

  return (
    <div className="create-field" style={{ animationDelay: `${index * 55}ms` }}>
      <div className="create-field-label-row">
        <label className="create-label" htmlFor="about">
          About the business
        </label>
        <AIAssist label="Write a first draft" busy={assist.busy} onClick={() => assist.run(() => suggestAbout(profile), paused)} />
      </div>
      <div className={`create-ai-field ${assist.flash ? 'create-ai-flash' : ''}`}>
        <textarea
          id="about"
          rows={5}
          className="create-textarea"
          value={profile.about}
          placeholder="A few lines about what you do and who you do it for."
          onChange={(e) => update({ about: e.target.value })}
        />
        {assist.busy && <div className="create-ai-shimmer" />}
      </div>
      <p className="create-helper">A draft to edit, not a finished text — change anything that is not true of you.</p>
    </div>
  )
}

function ServicesField({ index }: { index: number }) {
  const profile = useBusinessStore((s) => s.profile)
  const update = useBusinessStore((s) => s.update)
  return <Field index={index} label="Services or what you offer" htmlFor="services" helper="Describe the main services, products, courses, or packages you want customers to see.">
    <textarea id="services" rows={4} maxLength={2000} className="create-textarea" value={profile.services} placeholder="For example: Home tuition, test preparation, and small group classes." onChange={(e) => update({ services: e.target.value })} />
  </Field>
}

function Field({ index, label, htmlFor, helper, children }: { index: number; label: string; htmlFor: string; helper?: string; children: ReactNode }) {
  return (
    <div className="create-field" style={{ animationDelay: `${index * 55}ms` }}>
      <div className="create-field-label-row">
        <label className="create-label" htmlFor={htmlFor}>
          {label}
        </label>
      </div>
      {children}
      {helper && <p className="create-helper">{helper}</p>}
    </div>
  )
}

export function CreateWebsite() {
  const navigate = useNavigate()
  const profile = useBusinessStore((s) => s.profile)
  const update = useBusinessStore((s) => s.update)
  const updateContact = useBusinessStore((s) => s.updateContact)
  const complete = useBusinessStore((s) => s.complete)
  const { paused } = useMotion()

  const [view, setView] = useState<'form' | 'generating' | 'done'>('form')
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [transitioning, setTransitioning] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [shakeAttempt, setShakeAttempt] = useState(0)

  const headingRef = useRef<HTMLHeadingElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [vpHeight, setVpHeight] = useState<number | 'auto'>('auto')

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => setVpHeight(el.scrollHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [step])

  useEffect(() => {
    if (view === 'form') headingRef.current?.focus()
  }, [step, view])

  function goToStep(target: number, dir: 1 | -1) {
    if (paused) {
      setDirection(dir)
      setStep(target)
      return
    }
    setDirection(dir)
    setTransitioning(true)
    window.setTimeout(() => {
      setStep(target)
      setTransitioning(false)
    }, 180)
  }

  function back() {
    if (step === 0) {
      navigate('/')
      return
    }
    goToStep(step - 1, -1)
  }

  function validateBusinessStep(): boolean {
    const missingName = !profile.name.trim()
    const missingCategory = !profile.category
    if (missingName) {
      setNameError('Business name is required')
      setShakeAttempt((n) => n + 1)
    }
    if (missingCategory) setCategoryError('Choose a category to continue')
    return !missingName && !missingCategory
  }

  function continueStep() {
    if (step === 0 && !validateBusinessStep()) return
    if (step === STEP_LABELS.length - 1) {
      setView('generating')
      return
    }
    goToStep(step + 1, 1)
  }

  function skipStep() {
    if (step === STEP_LABELS.length - 1) {
      setView('generating')
      return
    }
    goToStep(step + 1, 1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'TEXTAREA' || tag === 'BUTTON') return
    e.preventDefault()
    continueStep()
  }

  const [building, setBuilding] = useState(false)
  /** The "build it yourself" path: a clean starter site with the profile poured in, opened in the widget editor. */
  async function buildFromWidgets() {
    if (building) return
    setBuilding(true)
    try {
      const config = customSite(profile)
      initBuilder(config)
      usePublishStore.getState().clear()
      try {
        const created = await api.createSite({ name: config.name, config, profile })
        usePublishStore.getState().setSite(created.id)
      } catch { /* Local editing remains available when the API is offline. */ }
      toast(`${config.name} is ready to build`)
      navigate('/editor')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not open the editor. Please try again.') }
    finally { setBuilding(false) }
  }

  async function performFinish() {
    complete()
  }

  const savedItems = [
    profile.name.trim() && 'Business details',
    (profile.logo || profile.logoSquare) && 'Brand assets',
    (profile.slogan || profile.about || profile.services) && 'Your story',
    (profile.contact.mobile || profile.contact.email) && 'Contact info',
  ].filter((item): item is string => Boolean(item))

  if (view === 'generating') {
    return (
      <div className="create-page min-h-full h-full overflow-y-auto bg-bg-0 text-text-0">
        <GeneratingScreen reduced={paused} onFinish={performFinish} onDone={() => setView('done')} />
      </div>
    )
  }

  if (view === 'done') {
    return (
      <div className="create-page min-h-full h-full overflow-y-auto bg-bg-0 text-text-0">
        <DoneScreen
          name={profile.name}
          categoryImage={profile.category ? CATEGORY_IMAGES[profile.category] : undefined}
          categoryLabel={categoryOptions.find((c) => c.value === profile.category)?.label}
          savedItems={savedItems}
          onBrowseTemplates={() => navigate('/templates')}
          onBuildFromWidgets={() => void buildFromWidgets()}
          building={building}
          onBackToSites={() => navigate('/dashboard')}
        />
      </div>
    )
  }

  return (
    <div className="create-page min-h-full h-full overflow-y-auto bg-bg-0 text-text-0">
      <div className="create-shell-layout">
        <aside className="create-sidebar" aria-label="Website setup progress">
          {STEP_LABELS.map((label, i) => (
            <div key={label} aria-current={i === step ? 'step' : undefined} className={`create-sidebar-step ${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''}`}>
              <span className="create-sidebar-num">{i < step ? <Check size={12} /> : i + 1}</span>
              {label}
              <span className="create-sidebar-rule" />
            </div>
          ))}
        </aside>

        <div className="create-main">
          <div className="create-mobile-progress">
            <div className="flex items-center gap-1.5 mb-2">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="h-1 flex-1 rounded-full" style={{ background: i <= step ? 'var(--color-brand)' : 'var(--color-bg-4)' }} />
              ))}
            </div>
            <p className="text-[11.5px]" style={{ color: 'var(--color-text-3)' }}>
              Step {step + 1} of {STEP_LABELS.length}
            </p>
          </div>

          <div className="create-column">
            <div className="create-panel" onKeyDown={handleKeyDown}>
              <div
                className="create-step-viewport"
                style={{
                  height: vpHeight === 'auto' ? 'auto' : `${vpHeight}px`,
                  transition: paused ? 'none' : 'height var(--dur-3) var(--ease-out)',
                }}
              >
                <div
                  key={step}
                  ref={contentRef}
                  className={`create-step-content ${
                    transitioning ? (direction === 1 ? 'leave-fwd' : 'leave-back') : direction === 1 ? 'enter-fwd' : 'enter-back'
                  }`}
                >
                  <h1 className="create-heading" tabIndex={-1} ref={headingRef}>
                    {STEP_LABELS[step]}
                  </h1>
                  {step === 0 && <p className="create-subheading">Your business name and the kind of website you're building.</p>}

                  <div className="mt-7">
                    {step === 0 && (
                      <>
                        <Field index={0} label="Website title" htmlFor="business-name">
                          <div key={shakeAttempt} className={nameError ? 'is-shaking' : ''}>
                            <input
                              id="business-name"
                              autoComplete="organization"
                              aria-invalid={Boolean(nameError)}
                              aria-describedby={nameError ? "business-name-help business-name-error" : "business-name-help"}
                              type="text"
                              className="create-input"
                              value={profile.name}
                              maxLength={80}
                              placeholder="Sharma Coaching Classes"
                              onChange={(e) => {
                                update({ name: e.target.value })
                                if (nameError) setNameError(null)
                              }}
                            />
                          </div>
                          <p id="business-name-help" className="mt-1.5 text-xs text-slate-400">The name customers see on your website. You can change it later.</p>
                          {nameError && <p id="business-name-error" role="alert" className="create-error-message">{nameError}</p>}
                        </Field>

                        <div className="create-field" style={{ animationDelay: '55ms' }}>
                          <div className="mb-5 grid gap-4 sm:grid-cols-2">
                            <label className="create-label">Website type<select className="create-input mt-2" value={profile.websiteType || (profile.category === 'education' ? 'education' : 'business')} onChange={e => { const websiteType = e.target.value as 'education' | 'business' | 'technology'; update({websiteType, category: websiteType === 'education' ? 'education' : websiteType === 'technology' ? 'professional' : profile.category === 'education' ? 'other' : profile.category, offer: websiteType === 'education' ? null : profile.offer || 'services'}) }}><option value="education">Education</option><option value="business">Business</option><option value="technology">Technology</option></select></label>
                            {(profile.websiteType || (profile.category === 'education' ? 'education' : 'business')) !== 'education' && <label className="create-label">Business offering<select className="create-input mt-2" value={profile.offer || 'services'} onChange={e=>update({offer:e.target.value as 'product' | 'services' | 'both'})}><option value="product">Products</option><option value="services">Services</option><option value="both">Products and services</option></select></label>}
                          </div>
                          <div className="create-field-label-row">
                            <span className="create-label">Industry / category</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mt-6 p-1">
                            {categoryOptions.map((option) => (
                              <CategoryCard
                                key={option.value}
                                label={option.label}
                                hint={option.hint}
                                icon={option.icon}
                                image={CATEGORY_IMAGES[option.value]}
                                selected={profile.category === option.value}
                                onSelect={() => {
                                  update({
                                    category: option.value,
                                    offer: option.value === 'education' ? null : profile.offer || 'services',
                                  })
                                  if (categoryError) setCategoryError(null)
                                }}
                              />
                            ))}
                          </div>
                          {categoryError && <p className="create-error-message">{categoryError}</p>}
                        </div>
                      </>
                    )}

                    {/* eslint-disable-next-line no-constant-binary-expression -- kept for later */}
                    {false && (
                      <>
                        <LogoRow
                          index={0}
                          label="Logo"
                          help="Shown in the header. A PNG with a transparent background looks best — or design one here."
                          value={profile.logo}
                          onChange={(logo) => update({ logo })}
                          businessName={profile.name}
                          onDesign={(logo, squareMark) => update({ logo, logoSquare: squareMark })}
                        />
                        <LogoRow
                          index={1}
                          label="Square logo"
                          help="Optional. Used for the browser tab icon."
                          value={profile.logoSquare}
                          onChange={(logoSquare) => update({ logoSquare })}
                        />
                      </>
                    )}

                    {step === 1 && (
                      <>
                        <SloganField index={0} />
                        <AboutField index={1} />
                        <ServicesField index={2} />
                      </>
                    )}

                    {step === 2 && (
                      <>
                        <Field index={0} label="Mobile number" htmlFor="mobile">
                          <input
                            id="mobile"
                            type="tel"
                            className="create-input"
                            value={profile.contact.mobile}
                            placeholder="98765 43210"
                            onChange={(e) => updateContact({ mobile: e.target.value })}
                          />
                          <label className="create-checkbox">
                            <input
                              type="checkbox"
                              checked={profile.contact.whatsapp}
                              onChange={(e) => updateContact({ whatsapp: e.target.checked })}
                              className="accent-brand"
                            />
                            This number is on WhatsApp — adds a chat button to the site
                          </label>
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field index={1} label="Second number" htmlFor="alt-mobile">
                            <input
                              id="alt-mobile"
                              type="tel"
                              className="create-input"
                              value={profile.contact.altMobile}
                              onChange={(e) => updateContact({ altMobile: e.target.value })}
                            />
                          </Field>
                          <Field index={1} label="Email" htmlFor="email">
                            <input
                              id="email"
                              type="email"
                              className="create-input"
                              value={profile.contact.email}
                              placeholder="hello@business.com"
                              onChange={(e) => updateContact({ email: e.target.value })}
                            />
                          </Field>
                        </div>

                        <Field index={2} label="Address" htmlFor="address">
                          <textarea
                            id="address"
                            rows={2}
                            className="create-textarea"
                            value={profile.contact.address}
                            onChange={(e) => updateContact({ address: e.target.value })}
                          />
                        </Field>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field index={3} label="Google Maps link" htmlFor="map">
                            <input
                              id="map"
                              type="url"
                              className="create-input"
                              value={profile.contact.mapUrl}
                              placeholder="https://maps.google.com/…"
                              onChange={(e) => updateContact({ mapUrl: e.target.value })}
                            />
                          </Field>
                          <Field index={3} label="Opening hours" htmlFor="timing">
                            <input
                              id="timing"
                              type="text"
                              className="create-input"
                              value={profile.contact.officeTiming}
                              placeholder="Mon–Sat, 9 AM – 7 PM"
                              onChange={(e) => updateContact({ officeTiming: e.target.value })}
                            />
                          </Field>
                        </div>

                        <p className="create-helper">Everything on this page is optional, and all of it can be changed later from the editor.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="create-footer">
                <button type="button" className="create-btn create-btn-ghost" onClick={back}>
                  <ArrowLeft size={15} />
                  Back
                </button>
                <div className="create-footer-right">
                  {step > 0 && (
                    <button type="button" className="create-btn create-btn-skip" onClick={skipStep}>
                      Skip for now
                    </button>
                  )}
                  <button type="button" className="create-btn create-btn-accent" disabled={transitioning} onClick={continueStep}>
                    {step === STEP_LABELS.length - 1 ? 'Finish' : 'Continue'}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
