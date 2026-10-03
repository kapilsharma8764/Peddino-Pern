import { applyOriginalColors, originalColorCss } from '@/lib/original-colors'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, Palette, ChevronLeft, ChevronRight, Download, Eye, FileText, Image, LayoutPanelTop, Loader2, Menu, Monitor, MousePointer2, PanelBottom, PanelTop, Redo2, Smartphone, Tablet, Undo2, Upload, X } from 'lucide-react'
import { Sparkles, Layers, Plus, Settings2 } from 'lucide-react'
import { WidgetFields } from './WidgetFields'
import { EditorAssistant } from './EditorAssistant'
import { requestEditorPlan, type EditorMessage } from './editor-assistant'
import { OriginalWidgetLibrary } from './OriginalWidgetLibrary'
import { writeWidget } from './original-widgets'
import { blockMetadata, type BlockMeta } from '@/lib/block-metadata'
import type { BlockConfig } from '@/blocks/types'
import { newId } from '@/lib/id'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { useAutoSave } from '@/builder/useAutoSave'
import { inlineLocalAssets } from '@/lib/inline-assets'
import { exportSitePages } from '@/lib/export-html'
import { NODE_ATTR, originalModel, parseOriginal, patchOriginal, recolorOriginal, moveOriginalNode, sharedOriginalEdits, sharedRegion, type VisualNode, type VisualPatch } from './original-model'
import bridge from './original-bridge.js?raw'
import { OriginalSectionColors, OriginalThemePanel, OriginalPageColors } from './OriginalColors'
import { QuickColours } from './QuickColours'
import { SectionColourPanel, type SectionColoursApi } from './SectionColourPanel'
import { backgroundEdits, readProbe, recolorEdits, safeEdits, withEdits, type ColourEdits, type SectionProbe } from '@/lib/section-colour-probe'
import { applyOriginalTheme, detectedPalette, originalThemeCss, readOriginalPalette, themedInlineStyles } from '@/lib/original-theme'

function EditField({ label, value, onCommit, multiline = false, placeholder = '' }: { label: string; value: string; onCommit: (value: string) => void; multiline?: boolean; placeholder?: string }) {
  const [draft, setDraft] = useState(value)
  const props = { value: draft, placeholder, 'aria-label': label, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(event.target.value), onBlur: () => { if (draft !== value) onCommit(draft) } }
  return <label className="visual-field"><span>{label}</span>{multiline ? <textarea {...props} rows={3} /> : <input {...props} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />}</label>
}

function ColorField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const hex = value.startsWith('#') ? value : (() => {
    const nums = value.match(/\d+/g)
    return nums && nums.length >= 3 ? '#' + nums.slice(0, 3).map(n => Number(n).toString(16).padStart(2, '0')).join('') : '#ffffff'
  })()
  return <div className="visual-color"><input type="color" aria-label={`${label} picker`} value={hex} onChange={e => onCommit(e.target.value)} /><EditField key={value} label={label} value={value} placeholder="Original colour" onCommit={onCommit} /></div>
}

export function OriginalVisualEditor() {
  const config = useConfigStore(s => s.config)
  const activePageId = useConfigStore(s => s.activePageId)
  const setActivePage = useConfigStore(s => s.setActivePage)
  const updateBlockProps = useConfigStore(s => s.updateBlockProps)
  const updateOriginalDocuments = useConfigStore(s => s.updateOriginalDocuments)
  const undo = useConfigStore(s => s.undo)
  const redo = useConfigStore(s => s.redo)
  const undoCount = useConfigStore(s => s.undoStack.length)
  const redoCount = useConfigStore(s => s.redoStack.length)
  const { viewport, setViewport, previewMode, togglePreview } = useEditorStore()
  useEffect(() => {
    // Start narrow screens with a canvas they can actually read. The device
    // buttons remain available when someone wants to inspect another size.
    if (useEditorStore.getState().viewport !== 'desktop') return
    if (window.innerWidth <= 760) setViewport('mobile')
    else if (window.innerWidth <= 1100) setViewport('tablet')
  }, [setViewport])
  const saveState = useAutoSave()
  const block = config.blocks.find(item => item.props.originalTemplate)!
  const html = String(block.props.html)
  const source = String(block.props.sourceUrl)
  const model = useMemo(() => originalModel(html), [html])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectionBox, setSelectionBox] = useState<{x:number;y:number;width:number;height:number} | null>(null)
  const [computed, setComputed] = useState<Record<string, string>>({})
  const [exporting, setExporting] = useState(false)
  const [leftOpen, setLeftOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [allPages, setAllPages] = useState(true)
  const [rightTab, setRightTab] = useState<'edit' | 'chat' | 'theme'>('chat')
  /**
   * The assistant/design panel is a fixed 340px on desktop, which is fine on
   * a wide monitor but leaves little room for the canvas at the ~1280px CSS
   * viewport most laptops actually report (Windows display scaling makes a
   * physically large, high-resolution screen report a much narrower CSS
   * width). Collapsing it to a slim rail gives that width back to the canvas
   * without losing the tabs — clicking one re-expands automatically.
   */
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [insertMode, setInsertMode] = useState<'before' | 'after' | 'inside' | 'start' | 'end'>('after')
  const [addMode, setAddMode] = useState<'menu' | 'elements' | 'sections' | 'pages'>('menu')
  const [pageDraft, setPageDraft] = useState('')
  const canvasWrap = useRef<HTMLDivElement>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 })
  const canvasWidth = viewport === 'desktop' ? 1440 : viewport === 'tablet' ? 768 : 390
  const scale = Math.min(1, canvasSize.width / canvasWidth)
  useEffect(() => {
    const el = canvasWrap.current
    if (!el) return
    // Measure the actual content box, including the browser border and bar.
    // Hard-coded padding overflows at small widths and clips the right edge.
    const observer = new ResizeObserver(() => {
      const style = getComputedStyle(el)
      const bar = el.querySelector('.visual-browser-bar') as HTMLElement | null
      setCanvasSize({
        width: Math.max(1, el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2),
        height: Math.max(1, el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - (bar?.offsetHeight ?? 37) - 2),
      })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [previewMode])
  const frame = useRef<HTMLIFrameElement>(null)
  const selectedRef = useRef<string | null>(null)
  const selected = selectedId ? model.nodes.get(selectedId) : undefined
  const shared = selectedId ? sharedRegion(model, selectedId) : undefined
  const pageName = config.pages?.find(page => page.id === activePageId)?.name || 'Home'
  const key = String(block.id)
  // The colours really used inside the selection, read from the open page, and the edits that change them.
  const [probe, setProbe] = useState<SectionProbe | null>(null)
  const [probeTick, setProbeTick] = useState(0)
  const [wholeFor, setWholeFor] = useState<string | null>(null)
  const enclosing = useMemo(() => {
    if (!selectedId) return null
    const node = model.doc.querySelector(`[${NODE_ATTR}="${selectedId}"]`)
    return node ? model.sections.find(section => model.doc.querySelector(`[${NODE_ATTR}="${section.id}"]`)?.contains(node)) ?? null : null
  }, [model, selectedId])
  const canWholeSection = Boolean(enclosing && enclosing.id !== selectedId)
  const wholeSection = canWholeSection && wholeFor === selectedId
  const colourId = wholeSection && enclosing ? enclosing.id : selectedId
  const colourIdRef = useRef<string | null>(null)
  useEffect(() => { colourIdRef.current = colourId }, [colourId])
  useEffect(() => {
    if (!colourId || previewMode) return
    frame.current?.contentWindow?.postMessage({ type: 'pt-colors', key, id: colourId }, '*')
  }, [colourId, probeTick, previewMode, key])
  // Colours read for a different selection are never shown for this one.
  const shownProbe = probe && probe.id === colourId ? probe : null
  function applyColourEdits(edits: ColourEdits) {
    const clean = safeEdits(edits)
    if (!Object.keys(clean).length) return
    frame.current?.contentWindow?.postMessage({ type: 'pt-recolor', key, edits: clean }, '*')
    setProbe(current => current ? withEdits(current, clean) : current)
    try { updateBlockProps(block.id, { html: recolorOriginal(html, clean) }) }
    catch { toast.error('Could not change that colour. Select the section again and try once more.') }
  }
  const colourApi: SectionColoursApi = {
    label: (wholeSection && enclosing ? enclosing.label : selected ? model.sections.find(item => item.id === selected.id)?.label || selected.label : '') || 'this section',
    probe: shownProbe,
    canWholeSection,
    wholeSection,
    setWholeSection: value => setWholeFor(value ? selectedId : null),
    onRecolor: (from, to) => { if (shownProbe) applyColourEdits(recolorEdits(shownProbe, from, to)) },
    onBackground: to => { if (shownProbe) applyColourEdits(backgroundEdits(shownProbe, to)) },
  }
  // The theme is read when the page is built, but is not a dependency of it:
  // a colour dragged in the picker must not reload the whole template. Changes
  // reach the open page as a message instead (see the effect below).
  const setDetected = useConfigStore(s => s.setDetectedOriginalPalette)
  const hasPalette = Boolean(detectedPalette(config.originalTheme))

  const srcDoc = useMemo(() => {
    const document = parseOriginal(html)
    document.querySelectorAll('base').forEach(base => base.remove())
    const base = document.createElement('base')
    base.href = new URL('.', source).href
    document.head.prepend(base)

    const preloaderSelectors = '#preloader,#preloader-wrapper,#preload,#loading,#loader,#ftco-loader,#world-load,.preloader,.preloader-wrapper,.preloader-body,.pre-loader,.preload,.preload-content,.page-loader,.page-loader-wrapper,.animationload,.cssload-container,.spinner-wrapper,.loading-overlay,.se-pre-con,.pageloader,.pace,.pace-running,.fullscreen-loader,.load-screen,.loader,.loader-bg,.loader-inner,.gtco-loader,.colorlib-loader,.fh5co-loader,section.preloader,.line-scale-pulse-out,.ball-pulse,.ball-clip-rotate-pulse'
    document.querySelectorAll(preloaderSelectors).forEach(el => el.remove())

    if (document.body) {
      document.body.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload')
      document.body.style.opacity = ''
      document.body.style.visibility = ''
      document.body.style.display = ''
    }
    if (document.documentElement) {
      document.documentElement.classList.remove('loading', 'is-loading', 'preloader-active', 'pace-running', 'ss-preload', 'no-js')
      document.documentElement.classList.add('js', 'ss-loaded')
    }

    const preloaderStyle = document.createElement('style')
    preloaderStyle.textContent = `${preloaderSelectors}{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;height:0!important;max-height:0!important;overflow:hidden!important}html,body{opacity:1!important;visibility:visible!important}html.ss-preload .home-content__main,.home-content__main{opacity:1!important;visibility:visible!important}`
    document.head.append(preloaderStyle)

    if (!previewMode) {
      const widgetStyle = document.createElement('style')
      widgetStyle.textContent = '[data-studio-widget] iframe{pointer-events:none}'
      document.head.append(widgetStyle)
    }
    const script = document.createElement('script')
    script.textContent = `${bridge}(${JSON.stringify({ key, editing: !previewMode }).replaceAll('<', '\\u003c')});`
    document.head.append(script)
    applyOriginalTheme(document, useConfigStore.getState().config.originalTheme)
    const state = useConfigStore.getState()
    applyOriginalColors(document, state.config.pages?.find(page => page.id === state.activePageId)?.colors, state.config.theme)
    return '<!DOCTYPE html>\n' + document.documentElement.outerHTML
  }, [html, source, key, previewMode])

  // Read the design's own colours once, so Theme Colors and Section colours have
  // a palette to work from.
  useEffect(() => {
    if (hasPalette) return
    let alive = true
    void readOriginalPalette(useConfigStore.getState().config).then(palette => { if (alive) setDetected(palette) }).catch(() => undefined)
    return () => { alive = false }
  }, [hasPalette, setDetected, activePageId])

  const pageColors = config.pages?.find(page => page.id === activePageId)?.colors
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'pt-page-colors', key, css: originalColorCss(pageColors, config.theme) }, '*')
  }, [pageColors, config.theme, key])

  // Repaint the open page as the theme changes, without reloading it.
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: 'pt-theme', key, css: originalThemeCss(config.originalTheme), inline: themedInlineStyles(model.doc, config.originalTheme, NODE_ATTR) }, '*')
  }, [config.originalTheme, key, model])

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.key !== key) return
      const data = event.data
      if (data.type === 'visual-bounds') {
        const box = data.box
        if (box && ['x','y','width','height'].every(key => typeof box[key] === 'number' && Number.isFinite(box[key]))) setSelectionBox(box)
        else setSelectionBox(null)
      }
      if (data.type === 'visual-text' && typeof data.id === 'string' && typeof data.text === 'string' && ['text','link'].includes(model.nodes.get(data.id)?.kind || '')) {
        try { updateBlockProps(block.id, { html: patchOriginal(html, data.id, { text: data.text }) }) }
        catch { toast.error('Could not save this text. Select it and try again.') }
      }
      if (data.type === 'pt-colors-result') { const next = readProbe(data); if (next && next.id === colourIdRef.current) setProbe(next) }
      if (data.type === 'visual-select' && typeof data.id === 'string' && model.nodes.has(data.id)) {
        setSelectedId(data.id); selectedRef.current = data.id; setProbeTick(tick => tick + 1)
        setComputed({ color: String(data.color || ''), background: String(data.background || ''), backgroundImage: String(data.backgroundImage || '').match(/url\(["']?(.*?)["']?\)/)?.[1] || '', fontSize: String(data.fontSize || '').replace('px', ''), align: String(data.align || '') })
        if (!data.focused) { setInspectorOpen(true); setRightCollapsed(false); setRightTab('edit') }
      }
      if (data.type === 'visual-ready' && selectedRef.current && !previewMode) frame.current?.contentWindow?.postMessage({ type: 'visual-focus', key, id: selectedRef.current }, '*')
      if (data.type === 'visual-undo') undo()
      if (data.type === 'visual-redo') redo()
      if (data.type === 'visual-link' && typeof data.url === 'string') {
        const page = config.pages?.find(page => `page:${page.id}` === data.url.split('#')[0] || page.blocks.some(item => item.props.sourceUrl === data.url.split('#')[0]))
        if (page) { selectedRef.current = null; setSelectedId(null); setActivePage(page.id) }
        else toast('External links open on your exported website. Choose a page on the left to preview it here.')
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [key, model, previewMode, config.pages, setActivePage, undo, redo, block.id, html, updateBlockProps])

  function focus(id: string) {
    setSelectedId(id); selectedRef.current = id; setComputed({}); setInspectorOpen(true); setRightCollapsed(false); setRightTab('edit'); setLeftOpen(false)
    frame.current?.contentWindow?.postMessage({ type: 'visual-focus', key, id }, '*')
  }
  function edit(patch: VisualPatch) {
    if (!selectedId) return
    try {
      if (allPages && shared) updateOriginalDocuments(sharedOriginalEdits(config, selectedId, patch))
      else updateBlockProps(block.id, { html: patchOriginal(html, selectedId, patch) })
    }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not apply this change.') }
  }
  async function upload(file?: File) {
    if (!file) return
    if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(file.type)) { toast.error('Choose a JPG, PNG, WebP, GIF or AVIF image.'); return }
    if (file.size > 3 * 1024 * 1024) { toast.error('Choose an image smaller than 3 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => edit(selected?.kind === 'image' ? { src: String(reader.result), imageFrame: selectionBox } : { backgroundImage: String(reader.result) })
    reader.onerror = () => toast.error('Could not read the image.')
    reader.readAsDataURL(file)
  }
  async function download() {
    setExporting(true)
    try {
      const standalone = await inlineLocalAssets(config)
      const pages = exportSitePages(standalone, { fileLinks: true })
      const { default: JSZip } = await import('jszip')
      const zip = new JSZip()
      pages.forEach(page => zip.file(page.file, page.html))
      const url = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }))
      const link = document.createElement('a'); link.href = url; link.download = `${config.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'website'}.zip`; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      toast.success('Website downloaded. Unzip the folder and open index.html.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not download the website.') }
    finally { setExporting(false) }
  }
  const widgetElement = selectedId ? model.doc.querySelector<HTMLElement>(`[data-builder-node="${selectedId}"]`)?.closest<HTMLElement>('[data-studio-widget]') : null
  const selectedWidget: BlockConfig | null = (() => { try { return widgetElement ? JSON.parse(widgetElement.dataset.studioWidget || 'null') : null } catch { return null } })()
  function saveDocument(doc: Document) {
    doc.querySelectorAll('[data-builder-node]').forEach(el => el.removeAttribute('data-builder-node'))
    updateBlockProps(block.id, { html: '<!DOCTYPE html>\n' + doc.documentElement.outerHTML })
  }
  function markSharedRegion(region: 'header' | 'footer') {
    if (!selectedId) return
    const doc = parseOriginal(html)
    const target = doc.querySelector(`[${NODE_ATTR}="${selectedId}"]`)
    if (!target) return
    doc.querySelectorAll(`[data-site-region="${region}"]`).forEach(element => element.removeAttribute('data-site-region'))
    target.setAttribute('data-site-region', region)
    saveDocument(doc)
    setSelectedId(null); selectedRef.current = null
    toast.success(`Marked as the shared ${region}.`)
  }
  function addWidget(meta: BlockMeta) {
    const doc = parseOriginal(html)
    const section = doc.createElement('section')
    const widget: BlockConfig = { id: newId('widget'), type: meta.type, variant: meta.variants[0], props: structuredClone(meta.defaultProps) }
    writeWidget(section, widget, config.theme)
    section.dataset.widgetLabel = meta.label
    const footer = doc.querySelector('footer,[role="contentinfo"],.footer-area,#footer')
    const target = selectedId ? doc.querySelector(`[${NODE_ATTR}="${selectedId}"]`) : null
    if (target && insertMode === 'inside') {
      if (!target.matches('div,section,main,article,header,footer,aside')) { toast.error('Select a section or container to insert inside.'); return }
      target.append(section)
    } else if (target && insertMode === 'before') target.before(section)
    else if (target && insertMode === 'after') target.after(section)
    else if (insertMode === 'start') {
      const header = model.sections.find(item => item.kind === 'header')
      const el = header ? doc.querySelector(`[${NODE_ATTR}="${header.id}"]`) : null
      if (el) el.after(section); else doc.body.prepend(section)
    } else if (footer) footer.before(section)
    else doc.body.append(section)
    const nextHtml = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
    const nextModel = originalModel(nextHtml)
    const added = [...nextModel.doc.querySelectorAll<HTMLElement>('[data-studio-widget]')].find(el => { try { return JSON.parse(el.dataset.studioWidget || '{}').id === widget.id } catch { return false } })
    const id = added?.getAttribute(NODE_ATTR) ?? null
    selectedRef.current = id; setSelectedId(id)
    saveDocument(doc)
    setRightTab('edit'); setInspectorOpen(true)
    toast.success(`${meta.label} added`)
  }
  function updateWidget(props: Record<string, unknown>, height?: number) {
    if (!widgetElement || !selectedWidget) return
    const doc = parseOriginal(html)
    const target = [...doc.querySelectorAll<HTMLElement>('[data-studio-widget]')].find(el => { try { return JSON.parse(el.dataset.studioWidget || '{}').id === selectedWidget.id } catch { return false } })
    if (!target) return
    const label = widgetElement.dataset.widgetLabel
    const currentHeight = parseInt(widgetElement.querySelector('iframe')?.style.height || '420', 10)
    writeWidget(target, { ...selectedWidget, props }, config.theme, height ?? currentHeight)
    target.dataset.widgetLabel = label
    saveDocument(doc)
  }
  /**
   * A new page's HTML: the site's own header and footer (copied from the
   * home page, the same "include" every other page already carries), around
   * fresh body content for just this page — a PHP-include-style layout
   * where only the middle changes per page.
   */
  function pageLayoutHtml(name: string): string {
    const homeBlock = config.pages?.[0]?.blocks.find(item => item.props.originalTemplate) ?? block
    const homeHtml = String(homeBlock.props.html)
    const homeModel = originalModel(homeHtml)
    const doc = parseOriginal(homeHtml)
    const headerId = homeModel.sections.find(section => section.kind === 'header')?.id
    const footerId = homeModel.sections.find(section => section.kind === 'footer')?.id
    const headerEl = headerId ? doc.querySelector(`[${NODE_ATTR}="${headerId}"]`) : null
    const footerEl = footerId ? doc.querySelector(`[${NODE_ATTR}="${footerId}"]`) : null

    const main = doc.createElement('main')
    main.style.cssText = 'max-width:1100px;margin:80px auto;padding:32px;font-family:system-ui'
    const heading = doc.createElement('h1')
    heading.textContent = name
    const paragraph = doc.createElement('p')
    paragraph.textContent = 'Your new page starts here. Add a section or ask the assistant for help.'
    main.append(heading, paragraph)

    if (headerEl && footerEl && headerEl.parentElement === footerEl.parentElement) {
      // Header and footer sit as siblings — drop everything between them and
      // put the new page's content there, keeping both intact.
      let node = headerEl.nextSibling
      while (node && node !== footerEl) {
        const next = node.nextSibling
        node.remove()
        node = next
      }
      footerEl.before(main)
    } else {
      // No shared parent to slot into — rebuild the body directly from
      // whichever of header/footer exist, still keeping both around the page.
      ;[...doc.body.children].forEach(child => child.remove())
      if (headerEl) doc.body.append(headerEl)
      doc.body.append(main)
      if (footerEl) doc.body.append(footerEl)
    }
    doc.querySelectorAll(`[${NODE_ATTR}]`).forEach(el => el.removeAttribute(NODE_ATTR))
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML
  }
  function createPage() {
    const name = pageDraft.trim()
    if (!name) return
    const createdId = useConfigStore.getState().addPage(name, true, [{id:newId('page-block'),type:block.type,variant:block.variant,props:{originalTemplate:true,sourceUrl:new URL(`page-${newId('document')}.html`, source).href,html:pageLayoutHtml(name)}}])
    setActivePage(createdId)
    setPageDraft('');setAddOpen(false);setSelectedId(null);selectedRef.current=null
  }
  async function submitPrompt(prompt: string, signal: AbortSignal, history: EditorMessage[]) {
    const originalHtml = html
    const pageId = activePageId
    const sectionIds = new Set(model.sections.map(section => section.id))
    const context = {
      selectedId, websiteName: config.name, pageName,
      nodes: [...model.nodes.values()]
        .filter(node => selectedId ? node.id === selectedId : node.kind !== 'section' || sectionIds.has(node.id))
        .slice(0, 150)
        .map(({id,label,text,kind,fontSize,color,background,fontFamily,width,height}) => ({id,label,text,kind,fontSize,color,background,fontFamily,width,height})),
    }
    const plan = await requestEditorPlan(prompt,context,signal,history)
    if (signal.aborted) throw new Error('Request stopped')
    const current = useConfigStore.getState()
    if (current.activePageId !== pageId || current.config.blocks.find(item=>item.id===block.id)?.props.html !== originalHtml) throw new Error('The page changed while I was working. Please send your request again.')
    let next = originalHtml
    // Apply edits before adding nodes so the original node identifiers remain stable.
    for (const action of plan.actions.filter(action=>action.kind==='edit')) {
      if (action.kind === 'edit') next = patchOriginal(next,action.id,action.patch)
    }
    const doc = parseOriginal(next)
    for (const action of plan.actions) {
      if (action.kind !== 'add') continue
      const meta = blockMetadata.find(meta=>meta.type===action.type)!
      const section = doc.createElement('section')
      writeWidget(section,{id:newId('widget'),type:meta.type,variant:meta.variants[0],props:{...structuredClone(meta.defaultProps),...action.props}},config.theme)
      section.dataset.widgetLabel=meta.label
      const footer=doc.querySelector('footer,[role="contentinfo"],.footer-area,#footer')
      if(footer) footer.before(section); else doc.body.append(section)
    }
    if (plan.actions.length) {
      saveDocument(doc)
      if (plan.actions.some(action => action.kind === 'add')) { setSelectedId(null); selectedRef.current = null }
    }
    return plan.message
  }
  const icons = { header: PanelTop, menu: Menu, section: LayoutPanelTop, footer: PanelBottom }
  const field = (label: string, property: keyof VisualPatch, value: string, multiline = false, placeholder = '') => <EditField key={`${selectedId}-${property}-${value}`} label={label} value={value} multiline={multiline} placeholder={placeholder} onCommit={value => edit({ [property]: value })} />
  const childButton = (node: VisualNode) => <button key={node.id} type="button" className="visual-item" onClick={() => focus(node.id)}>{node.kind === 'image' ? <Image size={15} /> : node.kind === 'link' ? <ChevronRight size={15} /> : <FileText size={15} />}<span>{node.label}</span><ChevronRight size={13} /></button>

  return <div className={`visual-editor assistant-editor ${previewMode ? 'is-preview' : ''}`}>
    <div className="visual-toolbar">
      <div className="visual-site-title"><Link to="/dashboard" aria-label="Back to sites"><ArrowLeft size={18} /></Link><div><small className="editor-product-label">SITEBUILDER / EDITOR</small><strong>{config.name}</strong><span><i />{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'All changes saved' : 'Saved in this browser'}</span></div></div>
      <div className="visual-device" aria-label="Preview size">{([{ id: 'desktop', Icon: Monitor, label: 'Desktop' }, { id: 'tablet', Icon: Tablet, label: 'Tablet' }, { id: 'mobile', Icon: Smartphone, label: 'Mobile' }] as const).map(({ id, Icon, label }) => <button key={id} aria-label={label} aria-pressed={viewport === id} onClick={() => setViewport(id)}><Icon size={17} /></button>)}</div>
      <div className="visual-toolbar-actions"><button aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!undoCount} onClick={undo}><Undo2 size={17} /></button><button aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!redoCount} onClick={redo}><Redo2 size={17} /></button><button className="visual-preview-button" onClick={togglePreview}><Eye size={16} />{previewMode ? 'Back to editing' : 'Preview'}</button><button className="visual-primary" disabled={exporting} onClick={download}>{exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}<span>{exporting ? 'Preparing…' : 'Download site'}</span></button></div>
    </div>
    <div className="visual-mobile-tabs"><button onClick={() => { setLeftOpen(!leftOpen); setInspectorOpen(false) }}><Menu size={16} /> Pages & sections</button><button onClick={() => { setInspectorOpen(!inspectorOpen); setLeftOpen(false) }}><MousePointer2 size={16} /> Edit selection</button></div>
    {!previewMode && <div className="studio-context-bar"><button className="studio-add-trigger" aria-expanded={addOpen} onClick={() => { setAddOpen(!addOpen); setAddMode('menu'); setLeftOpen(false) }}><Plus size={22}/> Add</button><button className="studio-add-page-trigger" aria-expanded={addOpen && addMode === 'pages'} onClick={() => { setAddOpen(true); setAddMode('pages'); setLeftOpen(false) }}><FileText size={16}/> <span>Add page</span></button><QuickColours selected={selected ?? null} computed={computed} edit={edit} className="studio-add-page-trigger" sectionColours={selected ? colourApi : undefined} /><div className="studio-context-actions"><button onClick={() => { setRightTab('chat'); setRightCollapsed(false); setInspectorOpen(true) }}><Sparkles size={17}/> Ask AI</button><span/>{selected ? <><strong>{selected.label}</strong><button onClick={() => { setRightTab('edit'); setRightCollapsed(false); setInspectorOpen(true) }}><Settings2 size={16}/> Edit selection</button></> : <span>Select an item on your website to edit it</span>}</div></div>}
    <div className="visual-workspace">
      {!previewMode && <nav className="studio-tool-rail" aria-label="Editor tools"><button title="Pages and layers" aria-label="Pages and layers" aria-expanded={leftOpen} onClick={() => { setLeftOpen(!leftOpen); setAddOpen(false) }}><Layers size={20}/></button><button title="Add elements" aria-label="Add elements" onClick={() => {setAddOpen(true);setAddMode('elements');setLeftOpen(false)}}><LayoutPanelTop size={20}/></button><button title="AI assistant" aria-label="AI assistant" onClick={() => {setRightTab('chat');setRightCollapsed(false);setInspectorOpen(true)}}><Sparkles size={20}/></button></nav>}
      {!previewMode && addOpen && <aside className={`studio-add-drawer ${addMode === 'menu' ? 'is-menu' : ''}`} aria-label="Add to website"><header>{addMode !== 'menu' && <button aria-label="Back to Add options" onClick={() => setAddMode('menu')}><ArrowLeft size={17}/></button>}<strong>{addMode === 'menu' ? 'Add to your website' : addMode}</strong><button aria-label="Close Add panel" onClick={() => setAddOpen(false)}><X size={17}/></button></header>{addMode === 'menu' ? <div className="studio-add-options">{([{id:'elements',label:'Elements',hint:'Text, images, buttons & more',Icon:LayoutPanelTop},{id:'sections',label:'Sections',hint:'Ready-made layouts',Icon:Layers},{id:'pages',label:'Pages',hint:'Grow your website',Icon:FileText}] as const).map(({id,label,hint,Icon})=><button key={id} onClick={() => setAddMode(id)}><span className={`add-art ${id}`}><Icon size={32}/></span><span><strong>{label}</strong><small>{hint}</small></span><ChevronRight size={17}/></button>)}</div> : addMode === 'pages' ? <div className="studio-add-pages"><p>Add a blank page or open an existing page.</p><form onSubmit={e=>{e.preventDefault();createPage()}}><label>Page name<input aria-label="New page name" value={pageDraft} onChange={e=>setPageDraft(e.target.value)} placeholder="About us"/></label><button disabled={!pageDraft.trim()}>Create page</button></form>{config.pages?.map(page=><button key={page.id} onClick={()=>{setActivePage(page.id);setAddOpen(false);setSelectedId(null);selectedRef.current=null}}><FileText size={16}/>{page.name}</button>)}</div> : <><label className="visual-field p-3"><span>Insert widget</span><select aria-label="Insert widget position" value={insertMode} onChange={e => setInsertMode(e.target.value as typeof insertMode)}><option value="before">Before selected item</option><option value="after">After selected item</option><option value="inside">Inside selected container</option><option value="start">Page start</option><option value="end">Page end</option></select></label><OriginalWidgetLibrary key={addMode} mode={addMode} onAdd={meta=>{addWidget(meta);setAddOpen(false)}}/></>}</aside>}

      {!previewMode && <aside className={`visual-sidebar visual-left ${leftOpen ? 'is-open' : ''}`} aria-label="Pages and sections">
        <div className="visual-sidebar-title"><span className="visual-icon-tile"><LayoutPanelTop size={18} /></span><div><h2>Your website</h2><p>Pages, header, sections and footer</p></div></div>
        <label className="visual-field visual-page-select"><span>Current page</span><select aria-label="Current page" value={activePageId} onChange={e => { selectedRef.current = null; setSelectedId(null); setActivePage(e.target.value); setLeftOpen(false) }}>{config.pages?.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}</select></label>
        <div className="editor-workflow-actions"><button onClick={()=>{setAddOpen(true);setAddMode('pages');setLeftOpen(false)}}>+ Add page</button><button onClick={()=>{setAddOpen(true);setAddMode('sections');setLeftOpen(false)}}>+ Add section</button><Link to="/leads">Contact enquiries</Link></div>
        <div className="visual-section-heading">PAGE CONTENT <span>{model.sections.length}</span></div>
        <div className="visual-section-list">{model.sections.map((section, index) => { const Icon = icons[section.kind]; return <button key={`${section.kind}-${section.id}`} className={`visual-section ${selectedId === section.id ? 'is-selected' : ''}`} onClick={() => focus(section.id)}><Icon size={17} /><span><strong>{section.label}</strong><small>{section.kind === 'header' ? 'Logo, colours & layout' : section.kind === 'menu' ? 'Menu labels & links' : section.kind === 'footer' ? 'Contact, links & copyright' : `Section ${index + 1}`}</small></span><ChevronRight size={14} /></button> })}</div>
        <div className="visual-coach"><MousePointer2 size={20} /><strong>Point. Click. Make it yours.</strong><p>Click any text, image or button on your website. Its editing options appear on the right.</p><span>No coding needed</span></div>
        <details className="visual-pages"><summary>All pages · {config.pages?.length || 1}</summary>{config.pages?.map(page => <button key={page.id} className={activePageId === page.id ? 'is-current' : ''} onClick={() => { selectedRef.current = null; setSelectedId(null); setActivePage(page.id); setLeftOpen(false) }}><FileText size={14} />{page.name}{activePageId === page.id && <Check size={13} />}</button>)}</details>
      </aside>}
      <section className="visual-stage" aria-label="Website canvas">
        <div className="visual-stage-heading"><span><span className="visual-live-dot" />{previewMode ? 'PREVIEW' : 'VISUAL EDITOR'}</span><span>{pageName} <ChevronRight size={12} /> {previewMode ? 'Try your website' : 'Click to select · Double-click text to type'}</span></div>
        <div className="visual-canvas-wrap" ref={canvasWrap}><div className="visual-browser" style={{ width: canvasWidth * scale + 2 }}><div className="visual-browser-bar"><div><i /><i /><i /></div><label className="visual-canvas-page"><span>Page:</span><select aria-label="Canvas page" value={activePageId} onChange={e => { setSelectedId(null); selectedRef.current = null; setSelectionBox(null); setActivePage(e.target.value) }}>{config.pages?.map(page => <option key={page.id} value={page.id}>{page.name}</option>)}</select></label><span>Fit ({Math.round(scale * 100)}%)</span></div><div className="visual-frame-clip" style={{ height: canvasSize.height }}>
          {!previewMode && selected && selectionBox && selectionBox.y + selectionBox.height > 0 && selectionBox.y * scale < canvasSize.height && <div className="canvas-selection-tools has-colours" style={{left:Math.max(6,Math.min(selectionBox.x * scale,canvasWidth * scale - 310)),top:Math.max(6,selectionBox.y * scale - 34)}}><span>{selected.kind === 'section' ? 'Section' : selected.kind === 'image' ? 'Image' : 'Text'}</span><button onClick={()=>{setRightTab('edit');setRightCollapsed(false);setInspectorOpen(true)}}><Settings2 size={13}/>Edit</button><button onClick={()=>{setRightTab('chat');setRightCollapsed(false);setInspectorOpen(true)}}><Sparkles size={13}/>Ask AI</button><QuickColours key={selected.id} selected={selected} computed={computed} edit={edit} sectionColours={colourApi} /></div>}
          <iframe key={activePageId} ref={frame} title={`${pageName} website canvas`} srcDoc={srcDoc} sandbox="allow-scripts" style={{ width: canvasWidth, height: canvasSize.height / scale, transform: `scale(${scale})`, transformOrigin: 'top left' }} /></div></div></div>
        <div className="visual-stage-footer"><span><Check size={13} /> Original design preserved</span><span>{previewMode ? 'Use Back to editing to make changes' : 'Changes save automatically · Ctrl+Z to undo'}</span></div>
      </section>
      {!previewMode && <aside className={`visual-sidebar visual-right ${inspectorOpen ? 'is-open' : ''} ${rightCollapsed ? 'is-collapsed' : ''}`} aria-label="Edit selected item">
        <div className="visual-panel-tabs"><button aria-pressed={rightTab === 'chat'} title="Assistant" onClick={() => { setRightTab('chat'); setRightCollapsed(false) }}><Sparkles size={15}/> {!rightCollapsed && 'Assistant'}</button><button aria-pressed={rightTab === 'edit'} title="Design" onClick={() => { setRightTab('edit'); setRightCollapsed(false) }}><Settings2 size={15}/> {!rightCollapsed && 'Design'}</button><button aria-pressed={rightTab === 'theme'} title="Theme colours" onClick={() => { setRightTab('theme'); setRightCollapsed(false) }}><Palette size={15}/> {!rightCollapsed && 'Colours'}</button><button className="studio-panel-collapse" aria-label={rightCollapsed ? 'Expand panel' : 'Collapse panel'} title={rightCollapsed ? 'Expand panel' : 'Collapse panel'} onClick={() => setRightCollapsed(value => !value)}>{rightCollapsed ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}</button><button className="studio-chat-close" aria-label="Close assistant" onClick={()=>setInspectorOpen(false)}><X size={16}/></button></div><div className="visual-chat-panel" hidden={rightCollapsed || rightTab !== 'chat'}><EditorAssistant key={activePageId} selection={selected?.label} onClear={()=>{setSelectedId(null);selectedRef.current=null}} onAdd={()=>{setAddOpen(true);setAddMode('menu');setLeftOpen(false)}} onDesign={()=>setRightTab('edit')} onSubmit={submitPrompt}/></div>{!rightCollapsed && rightTab === 'theme' && <div className="visual-colors-scroll">{selected && <SectionColourPanel api={colourApi} />}<OriginalPageColors /><OriginalThemePanel /></div>}{!rightCollapsed && rightTab === 'edit' && <><div className="visual-inspector-heading"><div><span className="visual-eyebrow">MAKE IT YOURS</span><h2>{selected ? selected.kind === 'section' ? model.sections.find(s => s.id === selected.id)?.label || 'Edit section' : selected.kind === 'image' ? 'Edit image' : selected.kind === 'link' ? 'Edit link or button' : 'Edit text' : 'Let’s edit your website'}</h2></div><button className="visual-close-inspector" aria-label="Close editing panel" onClick={() => setInspectorOpen(false)}><X size={18} /></button></div>
        {selectedWidget ? <div className="visual-controls"><h3>{widgetElement?.dataset.widgetLabel}</h3><p className="visual-muted">Changes apply to this widget. Use Preview to try its interactions.</p><WidgetFields values={selectedWidget.props} onChange={updateWidget} /><EditField key={`${selectedWidget.id}-height`} label="Widget height (px)" value={String(parseInt(widgetElement?.querySelector('iframe')?.style.height || '420', 10))} onCommit={value => { const height = Number(value); if (Number.isFinite(height)) updateWidget(selectedWidget.props, Math.max(80, Math.min(3000, height))) }} /><details><summary>All widget settings (JSON)</summary><EditField key={JSON.stringify(selectedWidget.props)} label="Widget settings" value={JSON.stringify(selectedWidget.props, null, 2)} multiline onCommit={value => { try { const props = JSON.parse(value); if (!props || typeof props !== 'object' || Array.isArray(props)) throw new Error(); updateWidget(props) } catch { toast.error('Enter a valid JSON object.') } }} /></details><button className="visual-done" onClick={() => { if (widgetElement) { const doc = parseOriginal(html); doc.querySelector(`[data-builder-node="${widgetElement.getAttribute('data-builder-node')}"]`)?.remove(); saveDocument(doc); setSelectedId(null); selectedRef.current = null } }}>Remove widget</button></div> : selected ? <div className="visual-controls">
          <div className="visual-selection-label"><MousePointer2 size={13} /><span>{selected.label}</span></div>
          <p className="visual-scope">{shared && allPages ? 'Editing matching items across your website' : <>Editing this page: <strong>{pageName}</strong></>}</p>
          {shared && (config.pages?.length || 0) > 1 && <label className="visual-checkbox visual-shared"><input type="checkbox" checked={allPages} onChange={e => setAllPages(e.target.checked)} />Update matching {shared.kind} items on all pages</label>}
          {(selected.kind === 'text' || selected.kind === 'link') && field('Text', 'text', selected.text, true)}
          {selected.kind === 'link' && <>{field('Link destination', 'href', selected.href, false, 'https://example.com or #contact')}<label className="visual-field"><span>Or link to a page</span><select aria-label="Link to a page" value="" onChange={e => { if (e.target.value) edit({ href: e.target.value }) }}><option value="">Choose a page…</option>{config.pages?.map(page => <option key={page.id} value={`page:${page.id}`}>{page.name}</option>)}</select></label></>}
          {selected.kind === 'image' && <><img className="visual-image-preview" src={new URL(selected.src || '.', source).href} alt="Selected image preview" /><label className="visual-upload"><Upload size={16} />Replace image<input type="file" aria-label="Replace image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label><small className="visual-muted">JPG, PNG or WebP · up to 3 MB</small>{field('Image address', 'src', selected.src, false)}{field('Image description', 'alt', selected.alt)}</>}
          {selected.kind === 'section' && <><div className="visual-section-items"><h3>Content in this section</h3><p>Choose an item to edit its text, image or link.</p>{selected.children.map(id => model.nodes.get(id)).filter((node): node is VisualNode => Boolean(node)).map(childButton)}{!selected.children.length && <p>Click an item inside this section on the canvas.</p>}</div><div className="visual-control-divider"><h3>Shared site region</h3><span>Use when this design's header or footer was not detected.</span></div><div className="visual-field-row"><button className="visual-done" onClick={() => markSharedRegion('header')}>Mark as header</button><button className="visual-done" onClick={() => markSharedRegion('footer')}>Mark as footer</button></div></>}
          <div className="visual-control-divider"><h3>Size and position</h3></div>
          <div className="visual-field-row">{field('Width (px or %)', 'width', selected.width, false, 'Auto')}{field('Height (px)', 'height', selected.height, false, 'Auto')}</div>
          <div className="visual-field-row">{field('Outer spacing', 'margin', selected.margin, false, '0')}{field('Corner radius', 'borderRadius', selected.borderRadius, false, '0')}</div>
          <div className="visual-field-row">{([-1,1] as const).map(direction=><button key={direction} className="visual-done" onClick={()=>{updateBlockProps(block.id,{html:moveOriginalNode(html,selected.id,direction)});setSelectedId(null);selectedRef.current=null}}>{direction === -1 ? 'Move before' : 'Move after'}</button>)}</div>
          <label className="visual-field"><span>Font family</span><select aria-label="Font family" value={selected.fontFamily} onChange={e=>edit({fontFamily:e.target.value})}><option value="">Template default</option>{['Arial','Georgia','Verdana','Trebuchet MS','system-ui','monospace'].map(font=><option key={font}>{font}</option>)}</select></label>
          <label className="visual-field"><span>Font weight</span><select aria-label="Font weight" value={selected.fontWeight} onChange={e=>edit({fontWeight:e.target.value})}><option value="">Template default</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">Semibold</option><option value="700">Bold</option></select></label>
          {selected.kind === 'section' && <OriginalSectionColors value={selected.ptColors} onChange={colors => edit({ ptColors: colors ?? null })} />}
          <div className="visual-control-divider"><h3>Appearance</h3><span>Use your own style</span></div>
          <ColorField label="Text colour" value={selected.color || computed.color || ''} onCommit={value => edit({ color: value })} />
          <ColorField label="Background colour" value={selected.background || computed.background || ''} onCommit={value => edit({ background: value })} />
          {selected.kind === 'section' && <>{field('Background image address', 'backgroundImage', selected.backgroundImage || computed.backgroundImage || '', false, 'Paste an image address')}<label className="visual-upload"><Upload size={16} />Replace background image<input type="file" aria-label="Replace background image" accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onChange={e => { void upload(e.target.files?.[0]); e.target.value = '' }} /></label></>}
          <div className="visual-field-row">{field('Text size (px)', 'fontSize', selected.fontSize || computed.fontSize || '', false, 'Original')}{field('Spacing (px)', 'padding', selected.padding, false, 'Original')}</div>
          <label className="visual-field"><span>Alignment</span><select aria-label="Alignment" value={selected.align || computed.align || ''} onChange={e => edit({ align: e.target.value })}><option value="">Original</option><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option><option value="start">Auto</option></select></label>
          <label className="visual-checkbox"><input type="checkbox" checked={selected.hidden} onChange={e => edit({ hidden: e.target.checked })} />Hide this item</label>
          <button className="visual-done" onClick={() => { (document.activeElement as HTMLElement)?.blur(); toast.success('Changes saved in this browser.'); setInspectorOpen(false) }}><Check size={15} />Done</button>
        </div> : <div className="visual-inspector-empty"><div className="visual-pointer-art"><MousePointer2 size={32} /><span> Aa </span></div><h3>Your ideas, your website.</h3><p>Select something on the canvas, or start with a section below.</p>{model.sections.filter(section => section.kind !== 'section').map(section => <button key={section.kind} onClick={() => focus(section.id)}>{section.label}<ChevronRight size={16} /></button>)}<ol><li>Select an item</li><li>Change text, photos or colours</li><li>Preview and download your site</li></ol></div>}
        <details className="visual-advanced" open={codeOpen} onToggle={e => setCodeOpen(e.currentTarget.open)}><summary>Advanced options</summary><button onClick={() => setCodeOpen(true)}>Edit HTML / CSS</button>{codeOpen && <EditField key={html} label="HTML and CSS" value={html} multiline onCommit={value => updateBlockProps(block.id, { html: value })} />}<p>Optional. All everyday changes work without code.</p></details></>}
      </aside>}
    </div>
  </div>
}
