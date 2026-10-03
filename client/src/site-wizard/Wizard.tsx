import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Icons from 'lucide-react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Download, FileUp, Loader2, Monitor, Plus, Save, Smartphone, Sparkles, Tablet, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { initBuilder } from '@/builder/core'
import { api } from '@/lib/api'
import { usePublishStore } from '@/store/publishStore'
import { exportSitePages } from '@/lib/export-html'
import { buildSiteAssetsZip, downloadBlob } from '@/lib/export-assets-zip'
import { blockMetadata } from '@/lib/block-metadata'
import { compile, metaFor, parseRef } from './compile'
import { layouts, layoutMap, slotKey } from './registry/layouts'
import { footerChoices, headerChoices, siteTypes } from './registry/site-types'
import { fillEmpty, quickPage, quickSite } from './spec'
import { specFromJson, specToJson } from './template-io'
import type { PageOptions, PageSpec, SiteSpec, SiteTypeId } from './types'

const STEPS = ['Website type', 'Header & footer', 'Pages & layouts', 'Widgets', 'Preview & export']
const DEVICES = [
  { id: 'desktop', label: 'Desktop', width: '100%', icon: Monitor },
  { id: 'tablet', label: 'Tablet', width: '768px', icon: Tablet },
  { id: 'mobile', label: 'Mobile', width: '375px', icon: Smartphone },
] as const

const card = 'rounded-xl border border-border-default bg-bg-1 p-4 text-left transition-colors hover:border-border-hover'
const active = 'border-brand ring-1 ring-brand'
const btn = 'inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-2 px-3 py-1.5 text-[13px] font-medium text-text-1 hover:border-border-hover disabled:opacity-40'
const primary = 'inline-flex items-center gap-1.5 rounded-md border border-brand bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dim disabled:opacity-40'

function move<T>(list: T[], index: number, by: -1 | 1): T[] {
  const target = index + by
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

const labelOf = (ref: string) => {
  const { type, variant } = parseRef(ref)
  const meta = metaFor(type)
  return meta ? `${meta.label}${variant ? ` · ${variant}` : ''}` : ref
}

export function Wizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [spec, setSpec] = useState<SiteSpec | null>(null)
  const [name, setName] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const [opening, setOpening] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const page = spec?.pages[pageIndex]
  const update = (next: SiteSpec) => setSpec(next)
  const updatePage = (patch: (current: PageSpec) => PageSpec) => spec && update({ ...spec, pages: spec.pages.map((entry, i) => (i === pageIndex ? patch(entry) : entry)) })

  function chooseType(id: SiteTypeId) {
    setSpec(quickSite(id, name))
    setPageIndex(0)
    setStep(1)
  }

  async function loadTemplate(file: File | undefined) {
    if (!file) return
    try {
      const loaded = specFromJson(await file.text())
      setSpec(loaded)
      setName(loaded.name)
      setPageIndex(0)
      setStep(2)
      toast('Template loaded')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load the template.') }
  }

  async function openInEditor() {
    if (!spec) return
    setOpening(true)
    try {
      const config = compile({ ...spec, name: name || spec.name })
      initBuilder(config)
      usePublishStore.getState().clear()
      try {
        const created = await api.createSite({ name: config.name, config })
        usePublishStore.getState().setSite(created.id)
      } catch { /* The editor still works offline. */ }
      navigate('/editor')
    } finally { setOpening(false) }
  }

  const canNext = step === 0 ? false : Boolean(spec)

  return (
    <div className="h-full overflow-y-auto bg-bg-0 text-text-0">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {STEPS.map((label, i) => (
            <button key={label} type="button" disabled={i > 0 && !spec} onClick={() => setStep(i)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] ${i === step ? 'border-brand bg-brand/10 text-text-0' : 'border-border-default text-text-3'} disabled:opacity-40`}>
              <span className="grid h-5 w-5 place-items-center rounded-full bg-bg-3 text-[11px]">{i < step ? <Check size={12} /> : i + 1}</span>{label}
            </button>
          ))}
        </div>

        {step === 0 && (
          <section>
            <h1 className="text-2xl font-semibold">What kind of website do you want?</h1>
            <p className="mt-1 text-sm text-text-3">Pick a type and its pages and layouts are set up for you.</p>
            <label className="mt-4 block max-w-sm text-[13px] text-text-2">Site name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My website" className="mt-1 w-full rounded-md border border-border-default bg-bg-2 px-3 py-2 text-sm" />
            </label>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {siteTypes.map((type) => {
                const Icon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[type.icon] ?? Icons.Globe
                return (
                  <button key={type.id} type="button" className={card} onClick={() => chooseType(type.id)}>
                    <Icon size={22} />
                    <h3 className="mt-2 font-semibold">{type.label}</h3>
                    <p className="mt-1 text-[13px] text-text-3">{type.description}</p>
                    <p className="mt-2 text-[11.5px] text-text-3">{type.pages.length} pages</p>
                  </button>
                )
              })}
            </div>
            <div className="mt-6">
              <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => { void loadTemplate(e.target.files?.[0]); e.target.value = '' }} />
              <button type="button" className={btn} onClick={() => fileInput.current?.click()}><FileUp size={14} />Load a saved template</button>
            </div>
          </section>
        )}

        {step === 1 && spec && (
          <section className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold">Header</h2>
              <p className="mb-3 mt-1 text-sm text-text-3">Appears on every page. Its menu is built from your pages.</p>
              <div className="grid gap-3">
                {headerChoices.map((choice) => (
                  <button key={choice.ref} type="button" className={`${card} ${spec.header === choice.ref ? active : ''}`} onClick={() => update({ ...spec, header: choice.ref })}>
                    <h3 className="font-semibold">{choice.label}</h3><p className="text-[13px] text-text-3">{choice.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Footer</h2>
              <p className="mb-3 mt-1 text-sm text-text-3">Also the same on every page.</p>
              <div className="grid gap-3">
                {footerChoices.map((choice) => (
                  <button key={choice.ref} type="button" className={`${card} ${spec.footer === choice.ref ? active : ''}`} onClick={() => update({ ...spec, footer: choice.ref })}>
                    <h3 className="font-semibold">{choice.label}</h3><p className="text-[13px] text-text-3">{choice.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {step === 2 && spec && (
          <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Pages</h2>
              <div className="grid gap-1.5">
                {spec.pages.map((entry, i) => (
                  <div key={`${entry.slug}-${i}`} className={`flex items-center gap-1 rounded-md border px-2 py-1.5 ${i === pageIndex ? 'border-brand bg-brand/10' : 'border-border-default'}`}>
                    <button type="button" className="flex-1 truncate text-left text-[13px]" onClick={() => setPageIndex(i)}>{entry.name}</button>
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => { update({ ...spec, pages: move(spec.pages, i, -1) }); setPageIndex(Math.max(0, i - 1)) }}><ArrowUp size={13} /></button>
                    <button type="button" aria-label="Move down" disabled={i === spec.pages.length - 1} onClick={() => { update({ ...spec, pages: move(spec.pages, i, 1) }); setPageIndex(Math.min(spec.pages.length - 1, i + 1)) }}><ArrowDown size={13} /></button>
                    <button type="button" aria-label="Remove page" disabled={spec.pages.length === 1} onClick={() => { update({ ...spec, pages: spec.pages.filter((_, j) => j !== i) }); setPageIndex(0) }}><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
              <label className="mt-3 block text-[12.5px] text-text-3">Add a page
                <select className="mt-1 w-full rounded-md border border-border-default bg-bg-2 px-2 py-1.5 text-sm" value="" onChange={(e) => {
                  if (!e.target.value) return
                  const added = quickPage(spec.type, e.target.value)
                  update({ ...spec, pages: [...spec.pages, added] })
                  setPageIndex(spec.pages.length)
                }}>
                  <option value="">Choose a layout…</option>
                  {layouts.map((layout) => <option key={layout.id} value={layout.id}>{layout.label}</option>)}
                </select>
              </label>
            </div>

            {page && (() => {
              const layout = layoutMap.get(page.layout)!
              const setOptions = (patch: Partial<PageOptions>) => updatePage((current) => ({ ...current, options: { ...current.options, ...patch } }))
              return (
                <div className="rounded-xl border border-border-default bg-bg-1 p-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-[12.5px] text-text-3">Page name
                      <input className="mt-1 w-full rounded-md border border-border-default bg-bg-2 px-2 py-1.5 text-sm text-text-0" value={page.name} onChange={(e) => updatePage((c) => ({ ...c, name: e.target.value }))} />
                    </label>
                    <label className="text-[12.5px] text-text-3">Layout
                      <select className="mt-1 w-full rounded-md border border-border-default bg-bg-2 px-2 py-1.5 text-sm text-text-0" value={page.layout} onChange={(e) => updatePage((c) => ({ ...quickPage(spec.type, e.target.value), name: c.name, slug: c.slug }))}>
                        {layouts.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
                      </select>
                    </label>
                    <label className="flex items-end gap-2 pb-2 text-[13px]"><input type="checkbox" checked={page.showInMenu ?? page.layout !== '404'} onChange={(e) => updatePage((c) => ({ ...c, showInMenu: e.target.checked }))} />Show in menu</label>
                  </div>
                  <p className="mt-3 text-[13px] text-text-3">{layout.description}</p>

                  <div className="mt-4 flex flex-wrap gap-5">
                    {layout.supports.reverse && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={page.options.reverse} onChange={(e) => setOptions({ reverse: e.target.checked })} />Reverse left / right</label>}
                    {layout.supports.columns && (
                      <div className="flex items-center gap-2 text-[13px]">Columns
                        {([2, 3, 4] as const).map((n) => <button key={n} type="button" className={`${btn} ${page.options.columns === n ? active : ''}`} onClick={() => setOptions({ columns: n })}>{n}</button>)}
                      </div>
                    )}
                    {layout.supports.sidebar && (
                      <div className="flex items-center gap-2 text-[13px]">Sidebar
                        {(['left', 'right', 'none'] as const).map((side) => <button key={side} type="button" className={`${btn} ${page.options.sidebar === side ? active : ''}`} onClick={() => setOptions({ sidebar: side })}>{side}</button>)}
                      </div>
                    )}
                  </div>

                  <h3 className="mb-2 mt-5 text-[13px] font-semibold">Section order</h3>
                  <div className="grid gap-1.5">
                    {page.options.order.map((id, i) => (
                      <div key={id} className="flex items-center gap-2 rounded-md border border-border-default px-3 py-1.5 text-[13px]">
                        <span className="flex-1">{layout.rows.find((row) => row.id === id)?.label ?? id}</span>
                        <button type="button" aria-label="Move section up" disabled={i === 0} onClick={() => setOptions({ order: move(page.options.order, i, -1) })}><ArrowUp size={13} /></button>
                        <button type="button" aria-label="Move section down" disabled={i === page.options.order.length - 1} onClick={() => setOptions({ order: move(page.options.order, i, 1) })}><ArrowDown size={13} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </section>
        )}

        {step === 3 && spec && page && (
          <WidgetsStep spec={spec} pageIndex={pageIndex} setPageIndex={setPageIndex} onChange={update} />
        )}

        {step === 4 && spec && (
          <PreviewStep spec={{ ...spec, name: name || spec.name || 'My website' }} opening={opening} onOpen={openInEditor} />
        )}

        {step > 0 && (
          <div className="mt-8 flex justify-between">
            <button type="button" className={btn} onClick={() => setStep(step - 1)}><ArrowLeft size={14} />Back</button>
            {step < STEPS.length - 1 && <button type="button" className={primary} disabled={!canNext} onClick={() => setStep(step + 1)}>Continue<ArrowRight size={14} /></button>}
          </div>
        )}
      </div>
    </div>
  )
}

function WidgetsStep({ spec, pageIndex, setPageIndex, onChange }: { spec: SiteSpec; pageIndex: number; setPageIndex: (i: number) => void; onChange: (spec: SiteSpec) => void }) {
  const page = spec.pages[pageIndex]
  const layout = layoutMap.get(page.layout)!
  const [picking, setPicking] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const setPage = (next: PageSpec) => onChange({ ...spec, pages: spec.pages.map((entry, i) => (i === pageIndex ? next : entry)) })
  const choose = (key: string, ref: string) => { setPage({ ...page, slots: { ...page.slots, [key]: ref } }); setPicking(null); setShowAll(false); setQuery('') }
  const setContent = (key: string, prop: string, value: string) => setPage({ ...page, content: { ...page.content, [key]: { ...page.content?.[key], [prop]: value } } })

  const order = page.options.order.length ? page.options.order : layout.rows.map((row) => row.id)
  const rows = order.map((id) => layout.rows.find((row) => row.id === id)).filter(Boolean) as typeof layout.rows

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {spec.pages.map((entry, i) => <button key={`${entry.slug}-${i}`} type="button" className={`${btn} ${i === pageIndex ? active : ''}`} onClick={() => setPageIndex(i)}>{entry.name}</button>)}
        <span className="flex-1" />
        <button type="button" className={btn} onClick={() => onChange(fillEmpty(spec))}><Sparkles size={14} />Fill empty slots</button>
        <button type="button" className={primary} onClick={() => { onChange({ ...spec, pages: spec.pages.map((entry) => quickPage(spec.type, entry.layout, entry)) }); toast('Best-fit widgets applied to every page') }}><Sparkles size={14} />Quick Generate</button>
      </div>

      <div className="grid gap-4">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-border-default bg-bg-1 p-4">
            <h3 className="mb-3 text-[13px] font-semibold">{row.label} <span className="font-normal text-text-3">· {row.kind}</span></h3>
            <div className="grid gap-3 md:grid-cols-2">
              {row.slots.slice(0, row.kind === 'grid' ? page.options.columns : undefined).map((slot) => {
                const key = slotKey(row.id, slot.name)
                const ref = page.slots[key]
                const meta = ref ? metaFor(parseRef(ref).type) : undefined
                const fields = meta ? Object.entries(meta.defaultProps).filter(([, v]) => typeof v === 'string' && (v as string).length < 120).slice(0, 3) : []
                const accepted = slot.accepts.filter((type) => metaFor(type))
                const list = showAll && picking === key
                  ? blockMetadata.filter((entry) => `${entry.label} ${entry.category} ${entry.type}`.toLowerCase().includes(query.toLowerCase())).map((entry) => entry.type)
                  : accepted
                return (
                  <div key={key} className="rounded-lg border border-border-default p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div><p className="text-[12px] text-text-3">{slot.label}</p><p className="text-[13.5px] font-medium">{ref ? labelOf(ref) : 'Empty'}</p></div>
                      <button type="button" className={btn} onClick={() => setPicking(picking === key ? null : key)}>{ref ? 'Replace' : <><Plus size={13} />Add</>}</button>
                    </div>
                    {picking === key && (
                      <div className="mt-3 rounded-md border border-border-default bg-bg-2 p-2">
                        {showAll && <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all widgets" className="mb-2 w-full rounded border border-border-default bg-bg-1 px-2 py-1 text-sm" />}
                        <div className="grid max-h-56 gap-1 overflow-y-auto">
                          {list.map((type) => {
                            const widget = metaFor(type)!
                            return widget.variants.length > 1 && !showAll
                              ? widget.variants.map((variant) => <button key={`${type}:${variant}`} type="button" className="rounded px-2 py-1 text-left text-[13px] hover:bg-bg-3" onClick={() => choose(key, `${type}:${variant}`)}>{widget.label} · {variant}</button>)
                              : <button key={type} type="button" className="rounded px-2 py-1 text-left text-[13px] hover:bg-bg-3" onClick={() => choose(key, type)}>{widget.label}<span className="ml-2 text-[11px] text-text-3">{widget.category}</span></button>
                          })}
                        </div>
                        <button type="button" className="mt-2 text-[12px] text-brand" onClick={() => setShowAll(!showAll)}>{showAll ? 'Show suggested widgets' : 'Browse all widgets'}</button>
                      </div>
                    )}
                    {ref && fields.length > 0 && (
                      <details className="mt-2"><summary className="cursor-pointer text-[12px] text-text-3">Edit text</summary>
                        <div className="mt-2 grid gap-2">
                          {fields.map(([prop, value]) => (
                            <label key={prop} className="text-[11.5px] text-text-3">{prop}
                              <input className="mt-0.5 w-full rounded border border-border-default bg-bg-2 px-2 py-1 text-[13px] text-text-0" defaultValue={String(page.content?.[key]?.[prop] ?? value)} onChange={(e) => setContent(key, prop, e.target.value)} />
                            </label>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

const BRIDGE = `<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href')||'';if(/^[\\w-]+\\.html/.test(h)){e.preventDefault();parent.postMessage({sbPage:h.split('#')[0]},'*')}else if(h.charAt(0)!=='#'&&!/^(mailto|tel):/.test(h)){e.preventDefault()}})</script>`

function PreviewStep({ spec, opening, onOpen }: { spec: SiteSpec; opening: boolean; onOpen: () => void }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('desktop')
  const [file, setFile] = useState('index.html')
  const [busy, setBusy] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)

  const config = useMemo(() => compile(spec), [spec])
  const pages = useMemo(() => exportSitePages(config, { fileLinks: true }), [config])
  const current = pages.find((entry) => entry.file === file) ?? pages[0]
  const srcDoc = useMemo(() => current.html.replace('</body>', `${BRIDGE}</body>`), [current])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      const target = (event.data as { sbPage?: string } | null)?.sbPage
      if (target && pages.some((entry) => entry.file === target)) setFile(target)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [pages])

  async function downloadZip() {
    setBusy(true)
    try { downloadBlob(await buildSiteAssetsZip(config, { fileLinks: true }), `${(spec.name || 'website').replace(/[^\w-]+/g, '-').toLowerCase()}.zip`) }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not build the download.') }
    finally { setBusy(false) }
  }
  function saveTemplate() {
    downloadBlob(new Blob([specToJson(spec)], { type: 'application/json' }), `${(spec.name || 'template').replace(/[^\w-]+/g, '-').toLowerCase()}.template.json`)
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {pages.map((entry) => <button key={entry.file} type="button" className={`${btn} ${entry.file === current.file ? active : ''}`} onClick={() => setFile(entry.file)}>{entry.name}</button>)}
        <span className="flex-1" />
        {DEVICES.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-label={label} className={`${btn} ${device === id ? active : ''}`} onClick={() => setDevice(id)}><Icon size={14} /></button>)}
      </div>
      <div className="flex justify-center rounded-xl border border-border-default bg-bg-3 p-3">
        <iframe ref={frame} title="Site preview" sandbox="allow-scripts" srcDoc={srcDoc} style={{ width: DEVICES.find((entry) => entry.id === device)!.width, height: '70vh' }} className="max-w-full rounded-md border-0 bg-white" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={busy} onClick={() => void downloadZip()}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}Download site (ZIP)</button>
        <button type="button" className={btn} onClick={saveTemplate}><Save size={14} />Save template (JSON)</button>
        <button type="button" className={btn} disabled={opening} onClick={onOpen}>{opening ? <Loader2 size={14} className="animate-spin" /> : null}Open in drag-and-drop editor</button>
      </div>
    </section>
  )
}
