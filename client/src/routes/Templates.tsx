import { ImportedTemplates } from './ImportedTemplates'
import { TemplateOptions } from './TemplateOptions'
import { OnboardingProgress } from '@/start/OnboardingShell'
import { useOnboardingStore } from '@/start/onboardingStore'
import { typeScore, websiteTypeMap } from '@/start/website-types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Eye, FileUp, Loader2, Monitor, Search, Smartphone, Tablet, X } from 'lucide-react'
import { toast } from 'sonner'
import { loadOriginalTemplate, type OriginalTemplate } from '@/templates/library/originals'
import { useOriginalTemplates } from '@/templates/library/template-catalog'
import { initBuilder } from '@/builder/core'
import { usePublishStore } from '@/store/publishStore'
import { useBusinessStore } from '@/store/businessStore'
import { categoryOptions } from '@/onboarding/profile'
import { categoryMatches } from '@/lib/category'
import { api } from '@/lib/api'
import { templates as layoutTemplates, buildTemplate, type RealTemplate } from '@/templates/library'
import { SitePreview } from '@/builder/SitePreview'

/**
 * One gallery entry: either an original downloaded design (its own HTML, edited
 * visually) or one of the builder's own widget-based layouts — which is where
 * every template generated for this project lives. They used to sit on a
 * separate `/layouts` page, so this gallery only ever showed the originals.
 */
type Entry =
  | { kind: 'original'; id: string; name: string; category: string; template: OriginalTemplate }
  | { kind: 'layout'; id: string; name: string; category: string; template: RealTemplate }

/**
 * A layout imported from a download shares its identity with that download's
 * original ("website_b_school_…" / "website-templates-b-school-…"), so the two
 * are the same design under different ids. Comparing on this stripped form is
 * what keeps such a design from appearing twice.
 */
function designKey(id: string): string {
  return id.toLowerCase().replace(/_/g, '-').replace(/^(website-templates-|free-bundle-|website-|free-)/, '').replace(/-master$/, '')
}

/** Everything in one category, originals first, with a layout hidden when its original is already listed. */
function entriesFor(originals: OriginalTemplate[], category: string): Entry[] {
  const all = category === 'all'
  const own: Entry[] = originals
    .filter(t => all || categoryMatches(t.category, category))
    .map(t => ({ kind: 'original', id: `original:${t.id}`, name: t.name, category: t.category, template: t }))
  const seen = new Set(own.map(e => designKey((e.template as OriginalTemplate).id)))
  const layouts: Entry[] = []
  for (const t of layoutTemplates) {
    const key = designKey(t.id)
    if (seen.has(key) || !(all || categoryMatches(t.category, category))) continue
    seen.add(key)
    layouts.push({ kind: 'layout', id: `layout:${t.id}`, name: t.name, category: t.category, template: t })
  }
  return [...own, ...layouts]
}

const collections = [
  ['all', 'All templates'], ['free-bundle', 'Free bundle 2019'],
  ['html-templates', 'HTML templates'], ['website-templates', 'Website templates'],
] as const
const devices = { desktop: { width: 1280, icon: Monitor }, tablet: { width: 820, icon: Tablet }, mobile: { width: 390, icon: Smartphone } }
const PAGE_SIZE = 24

/**
 * Style filters. Templates carry no style tag of their own, so a style is a set of
 * words looked for in the template's name and sources: a loose guide, not a promise.
 */
const STYLES: [string, RegExp][] = [
  ['Modern', /modern|new|smart|fresh|next|neo/], ['Minimal', /minimal|clean|simple|basic|plain|mono/],
  ['Professional', /pro\b|professional|business|consult|expert/], ['Creative', /creative|portfolio|studio|art|photo|design|craft/],
  ['Dark', /dark|night|black|noir|midnight/], ['Light', /light|white|bright|soft|pure/],
  ['Corporate', /corporate|finance|law|bank|company|enterprise/], ['Elegant', /elegant|luxury|royal|wedding|classic|boutique|grand/],
]
const TEMPLATE_STEPS = ['Website type', 'Business details', 'Choose template', 'Preview']

function PreviewDialog({ template, busy, onClose, onUse }: { template: OriginalTemplate; busy: boolean; onClose: () => void; onUse: () => void }) {
  const [device, setDevice] = useState<keyof typeof devices>('desktop')
  const [pageUrl, setPageUrl] = useState(template.url)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const elements = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),select,iframe')
        const first = elements?.[0], last = elements?.[elements.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  return <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${template.name} preview`} className="fixed inset-0 z-50 bg-bg-0 flex flex-col">
    <div className="shrink-0 flex flex-wrap items-center gap-3 p-4 border-b border-border-default bg-bg-1">
      <div className="min-w-0"><h2 className="font-semibold text-sm">{template.name}</h2><p className="text-xs text-text-2">{template.category} · {template.pages.length > 1 ? `${template.pages.length} pages: ${template.pages.slice(0, 6).map(page => page.name).join(', ')}` : '1 page'} · Click to edit</p></div>
      {template.pages.length > 1 && <select aria-label="Template page" value={pageUrl} onChange={e => setPageUrl(e.target.value)} className="max-w-48 rounded-lg bg-bg-2 border border-border-default p-2 text-xs">{template.pages.map(page => <option key={page.url} value={page.url}>{page.name}</option>)}</select>}
      <div className="flex gap-1 ml-auto">{(Object.keys(devices) as (keyof typeof devices)[]).map(key => { const Icon = devices[key].icon; return <button key={key} aria-label={key} aria-pressed={key === device} onClick={() => setDevice(key)} className={`p-2 rounded-md ${key === device ? 'bg-brand text-bg-0' : 'text-text-2'}`}><Icon size={17} /></button> })}</div>
      <button disabled={busy} onClick={onUse} className="studio-button !py-2 !px-4">{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{busy ? 'Opening…' : 'Use this template'}</button>
      <button ref={closeRef} onClick={onClose} aria-label="Close preview" className="p-2 rounded-lg hover:bg-bg-3"><X size={19} /></button>
    </div>
    <div className="flex-1 min-h-0 overflow-auto flex justify-center p-3 bg-bg-2">
      <iframe key={pageUrl} title={`${template.name} original preview`} sandbox="allow-scripts" src={pageUrl} className="border-0 bg-white h-full shrink-0 shadow-xl" style={{ width: `min(100%, ${devices[device].width}px)` }} />
    </div>
  </div>
}

function layoutPages(template: RealTemplate) {
  return [{ name: 'Home' }, ...template.pages.map(p => ({ name: p.name }))]
}

function LayoutPreviewDialog({ template, busy, onClose, onUse }: { template: RealTemplate; busy: boolean; onClose: () => void; onUse: () => void }) {
  const [device, setDevice] = useState<keyof typeof devices>('desktop')
  const [pageIndex, setPageIndex] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  const built = useMemo(() => buildTemplate(template), [template])
  const pages = layoutPages(template)
  const blocks = [...(built.header ?? []), ...(built.pages?.[pageIndex]?.blocks ?? []), ...(built.footer ?? [])]
  return <div role="dialog" aria-modal="true" aria-label={`${template.name} preview`} className="fixed inset-0 z-50 bg-bg-0 flex flex-col">
    <div className="shrink-0 flex flex-wrap items-center gap-3 p-4 border-b border-border-default bg-bg-1">
      <div className="min-w-0"><h2 className="font-semibold text-sm">{template.name}</h2><p className="text-xs text-text-2">Widget-based layout · Fully editable</p></div>
      {pages.length > 1 && <select aria-label="Template page" value={pageIndex} onChange={e => setPageIndex(Number(e.target.value))} className="max-w-48 rounded-lg bg-bg-2 border border-border-default p-2 text-xs">{pages.map((page, i) => <option key={i} value={i}>{page.name}</option>)}</select>}
      <div className="flex gap-1 ml-auto">{(Object.keys(devices) as (keyof typeof devices)[]).map(key => { const Icon = devices[key].icon; return <button key={key} aria-label={key} aria-pressed={key === device} onClick={() => setDevice(key)} className={`p-2 rounded-md ${key === device ? 'bg-brand text-bg-0' : 'text-text-2'}`}><Icon size={17} /></button> })}</div>
      <button disabled={busy} onClick={onUse} className="studio-button !py-2 !px-4">{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}{busy ? 'Opening…' : 'Use this template'}</button>
      <button ref={closeRef} onClick={onClose} aria-label="Close preview" className="p-2 rounded-lg hover:bg-bg-3"><X size={19} /></button>
    </div>
    <div className="flex-1 min-h-0 overflow-auto flex justify-center p-3 bg-bg-2">
      <div className="relative h-full shrink-0 shadow-xl bg-white" style={{ width: `min(100%, ${devices[device].width}px)` }}>
        <SitePreview theme={template.theme} blocks={blocks} scrollable />
      </div>
    </div>
  </div>
}

function LayoutCard({ template, applying, onPreview, onUse }: { template: RealTemplate; applying: boolean; onPreview: () => void; onUse: () => void }) {
  const pageCount = 1 + template.pages.length
  const previewBlocks = useMemo(() => {
    const built = buildTemplate(template)
    return [...(built.header ?? []), ...built.blocks]
  }, [template])
  return (
    <article className="group rounded-xl overflow-hidden border border-border-default bg-bg-1 hover:border-brand/50 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300">
      <div className="relative w-full aspect-[1280/900] overflow-hidden bg-bg-2">
        <button onClick={onPreview} aria-label={`Preview ${template.name}`} className="block w-full h-full cursor-pointer relative">
          <SitePreview theme={template.theme} blocks={previewBlocks} fitWidth width={1280} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex justify-between gap-3 items-center">
          <h2 className="font-semibold text-sm truncate">{template.name}</h2>
          <span className="text-[9px] rounded border border-border-default text-text-2 px-2 py-1 shrink-0 uppercase tracking-wider font-medium">
            {categoryOptions.find(c => c.value === template.category)?.label ?? template.category}
          </span>
        </div>
        <p className="text-xs text-text-3 mt-2 truncate" title={template.description}>{template.description}</p>
        <p className="text-[11px] text-text-2 mt-2">{pageCount} {pageCount === 1 ? 'page' : 'pages'} · Widget-based · Fully editable</p>
        <div className="flex gap-2 mt-4">
          <button type="button" onClick={onPreview} className="flex-1 flex justify-center gap-2 items-center rounded-lg border border-border-default py-2 text-xs font-medium hover:bg-bg-2 transition-colors cursor-pointer"><Eye size={14} /> Preview</button>
          <button type="button" disabled={applying} onClick={onUse} className="flex-1 flex justify-center gap-2 items-center rounded-lg bg-brand text-bg-0 py-2 text-xs font-semibold disabled:opacity-50 hover:bg-brand-dim transition-colors cursor-pointer">
            {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{applying ? 'Opening…' : 'Use this'}
          </button>
        </div>
      </div>
    </article>
  )
}

function TemplateCard({
  template,
  applying,
  onPreview,
  onUse,
}: {
  template: OriginalTemplate
  applying: boolean
  onPreview: () => void
  onUse: () => void
}) {
  return (
    <article className="group rounded-xl overflow-hidden border border-border-default bg-bg-1 hover:border-brand/50 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300">
      <div className="relative w-full aspect-[1280/900] overflow-hidden bg-bg-2">
        <button
          onClick={onPreview}
          aria-label={`Preview ${template.name}`}
          className="block w-full h-full cursor-pointer relative"
        >
          <img
            src={template.thumbnail}
            alt={`${template.name} original website design`}
            width={1280}
            height={900}
            loading="lazy"
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.025]"
          />
        </button>
      </div>

      <div className="p-4">
        <div className="flex justify-between gap-3 items-center">
          <h2 className="font-semibold text-sm truncate">{template.name}</h2>
          <span className="text-[9px] rounded border border-border-default text-text-2 px-2 py-1 shrink-0 uppercase tracking-wider font-medium">
            {template.category || 'ORIGINAL'}
          </span>
        </div>
        <p className="text-xs text-text-3 mt-2 truncate" title={template.sources.join('\n')}>
          {template.sources[0]?.split('/').pop() || template.name}
        </p>
        <p className="text-[11px] text-text-2 mt-2">
          {template.pages.length} {template.pages.length === 1 ? 'page' : 'pages'} · Visual editing
        </p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onPreview}
            className="flex-1 flex justify-center gap-2 items-center rounded-lg border border-border-default py-2 text-xs font-medium hover:bg-bg-2 transition-colors cursor-pointer"
          >
            <Eye size={14} /> Preview
          </button>
          <button
            type="button"
            disabled={applying}
            onClick={onUse}
            className="flex-1 flex justify-center gap-2 items-center rounded-lg bg-brand text-bg-0 py-2 text-xs font-semibold disabled:opacity-50 hover:bg-brand-dim transition-colors cursor-pointer"
          >
            {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {applying ? 'Opening…' : 'Use this'}
          </button>
        </div>
      </div>
    </article>
  )
}

export function Templates() {
  const originalTemplates = useOriginalTemplates()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const query = params.get('search') ?? ''
  const collection = params.get('collection') ?? 'all'
  const profile = useBusinessStore(s => s.profile)
  // The category chosen in the wizard is what brought someone here, so it is
  // the filter's starting point — not just a tiebreaker in the sort order,
  // which is what let templates from every other category show alongside it.
  // "All categories" is available too, but has to be chosen on purpose.
  const category = params.get('category') ?? profile.category ?? 'all'
  // Arrived from "Choose a template": the website type ranks the most fitting designs first.
  const fromStart = params.get('from') === 'start'
  const websiteType = websiteTypeMap.get(useOnboardingStore((s) => s.typeId) ?? '')
  const style = params.get('style') ?? 'all'
  const requestedPage = Math.max(1, Number(params.get('page')) || 1)
  const [previewing, setPreviewing] = useState<Entry | null>(null)
  const [applying, setApplying] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inCategory = useMemo(() => entriesFor(originalTemplates, category), [originalTemplates, category])
  const counts = useMemo(() => {
    const byCategory: Record<string, number> = { all: entriesFor(originalTemplates, 'all').length }
    for (const option of categoryOptions) byCategory[option.value] = entriesFor(originalTemplates, option.value).length
    return byCategory
  }, [originalTemplates])
  const visible = useMemo(() => inCategory.filter(entry => {
    // Layouts have no collection of their own, so they only appear under "All templates".
    if (collection !== 'all' && (entry.kind === 'layout' || !entry.template.collections.includes(collection))) return false
    const text = entry.kind === 'original'
      ? `${entry.name} ${entry.category} ${entry.template.sources.join(' ')}`
      : `${entry.name} ${entry.category} ${entry.template.description}`
    if (!text.toLowerCase().includes(query.trim().toLowerCase())) return false
    const wanted = STYLES.find(([name]) => name === style)
    return !wanted || wanted[1].test(`${entry.name} ${entry.id}`.toLowerCase())
  }).map((entry, order) => ({ entry, order, score: fromStart ? typeScore(websiteType, `${entry.name} ${entry.category} ${entry.id}`) : 0 }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ entry }) => entry), [inCategory, query, collection, style, fromStart, websiteType])
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const shown = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: true }); scrollRef.current?.scrollTo({ top: 0 })
  }
  async function use(entry: Entry) {
    if (applying) return
    const template = entry.template
    setApplying(entry.id)
    try {
      const config = entry.kind === 'original' ? await loadOriginalTemplate(entry.template, profile) : buildTemplate(entry.template, profile)
      initBuilder(config)
      usePublishStore.getState().clear()
      try {
        const created = await api.createSite({ name: config.name, config, profile })
        usePublishStore.getState().setSite(created.id)
      } catch { /* Local editing remains available when the API is offline. */ }
      toast(entry.kind === 'original' ? `${template.name} opened with its original design` : `${template.name} is ready to edit`)
      navigate('/editor')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not open this template. Please try again.') }
    finally { setApplying(null) }
  }
  return <div className="h-full flex flex-col overflow-hidden">
    <div className="shrink-0 px-5 pt-6 pb-4 border-b border-border-default"><div className="max-w-6xl mx-auto">
      {fromStart && <div className="mb-5"><OnboardingProgress steps={TEMPLATE_STEPS} current={2} /></div>}
      <button onClick={() => navigate(fromStart ? '/start/template/details' : '/create')} className="inline-flex items-center gap-2 text-xs text-text-2"><ArrowLeft size={14} /> Back to details</button>
      <div className="flex flex-wrap justify-between items-end gap-4 mt-4"><div><span className="studio-eyebrow">THE ORIGINAL COLLECTION</span><h1 className="text-3xl font-semibold mt-2">Find your starting point.</h1><p className="text-xs text-text-2 mt-2">{counts.all} templates. Original designs and widget-based layouts. Their own layouts, colours and images. Click to change text, photos, menus and colours. No coding needed.</p></div><button onClick={() => navigate('/upload')} className="studio-button secondary !py-2 !px-3"><FileUp size={14} /> Upload a site</button></div>
    </div></div>
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5"><div className="max-w-6xl mx-auto">
      <TemplateOptions />
      <div className="flex flex-col gap-4 mb-6"><label className="relative max-w-md"><Search size={15} className="absolute left-3 top-3 text-text-3" /><input aria-label="Search templates" value={query} onChange={e => filter('search', e.target.value)} placeholder="Search by name, category or folder…" className="w-full h-10 pl-10 pr-3 bg-bg-1 border border-border-default rounded-lg text-sm" /></label>
      {fromStart && websiteType && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-bg-1 px-4 py-3 text-[12.5px] text-text-1" data-testid="start-ranking">
        <span>Showing the best templates for <strong>{websiteType.name}</strong>{category === 'all' ? ' first, then everything else' : ''}.</span>
        {category !== 'all' && <button type="button" onClick={() => filter('category', 'all')} className="font-semibold text-brand hover:underline">View all templates</button>}
      </div>}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Template style">
        {['all', ...STYLES.map(([name]) => name)].map(name => <button key={name} aria-pressed={style === name} onClick={() => filter('style', name === 'all' ? '' : name)} className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-medium ${style === name ? 'bg-brand text-white border-brand' : 'border-border-default text-text-2 hover:text-text-0'}`}>{name === 'all' ? 'Any style' : name}</button>)}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Template category">
        <button aria-pressed={category === 'all'} onClick={() => filter('category', 'all')} className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-medium ${category === 'all' ? 'bg-brand text-bg-0 border-brand' : 'border-border-default text-text-2 hover:bg-bg-2'}`}>All categories <span className="opacity-60 ml-1">{counts.all}</span></button>
        {categoryOptions.map(option => {
          const count = counts[option.value]
          return <button key={option.value} aria-pressed={category === option.value} onClick={() => filter('category', option.value)} className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-medium ${category === option.value ? 'bg-brand text-bg-0 border-brand' : 'border-border-default text-text-2 hover:bg-bg-2'}`}>{option.label} <span className="opacity-60 ml-1">{count}</span></button>
        })}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Template collections">{collections.map(([key, label]) => <button key={key} aria-pressed={collection === key} onClick={() => filter('collection', key)} className={`shrink-0 px-3 py-2 rounded-lg border text-xs ${collection === key ? 'bg-brand text-bg-0 border-brand' : 'border-border-default text-text-2'}`}>{label} <span className="opacity-60 ml-1">{key === 'all' ? inCategory.length : inCategory.filter(e => e.kind === 'original' && e.template.collections.includes(key)).length}</span></button>)}</div></div>
      <p className="text-xs text-text-3 mb-4" aria-live="polite">{visible.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, visible.length)} of ${visible.length} templates` : category !== 'all' ? `No templates found in ${categoryOptions.find(c => c.value === category)?.label ?? category} yet.` : 'No templates match your search.'}</p>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-default py-16 px-6 text-center">
          <p className="text-sm font-medium mb-1">No templates found in this category</p>
          <p className="text-xs text-text-2 mb-5">Try another category, clear the search, or start from a blank layout instead.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {category !== 'all' && <button onClick={() => filter('category', 'all')} className="studio-button secondary !py-2 !px-4">Browse all categories</button>}
            <button onClick={() => navigate('/create')} className="studio-button !py-2 !px-4">Build a blank layout instead</button>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {shown.map((entry) => entry.kind === 'original' ? (
          <TemplateCard
            key={entry.id}
            template={entry.template}
            applying={applying === entry.id}
            onPreview={() => setPreviewing(entry)}
            onUse={() => void use(entry)}
          />
        ) : (
          <LayoutCard
            key={entry.id}
            template={entry.template}
            applying={applying === entry.id}
            onPreview={() => setPreviewing(entry)}
            onUse={() => void use(entry)}
          />
        ))}
      </div>
      )}
      <ImportedTemplates query={query} />
      {pageCount > 1 && <nav aria-label="Template pages" className="flex items-center justify-center gap-5 py-8"><button disabled={page === 1} onClick={() => filter('page', String(page - 1))} className="studio-button secondary !py-2">Previous</button><span className="text-xs text-text-2">Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => filter('page', String(page + 1))} className="studio-button secondary !py-2">Next</button></nav>}
    </div></div>
    {previewing?.kind === 'original' && <PreviewDialog template={previewing.template} busy={applying !== null} onClose={() => setPreviewing(null)} onUse={() => void use(previewing)} />}
    {previewing?.kind === 'layout' && <LayoutPreviewDialog template={previewing.template} busy={applying !== null} onClose={() => setPreviewing(null)} onUse={() => void use(previewing)} />}
  </div>
}

