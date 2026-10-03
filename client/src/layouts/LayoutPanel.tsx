import { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { toast } from 'sonner'
import { Check, Plus, Search, X } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore, type LayoutView } from '@/store/editorStore'
import { ensurePages } from '@/store/site-shape'
import type { BlockConfig } from '@/blocks/types'
import { layouts, layoutCategories, matchesLayoutSearch, type LayoutCategory, type LayoutDef } from './layouts'
import { buildStructure, structures, structureWire, type StructureDef } from './structures'
import { activePreset, footerPresets, headerPresets, presetPatch, type PresetDef } from './header-footer'
import { FooterMock, HeaderMock, StructureWireframe, Wireframe } from './Wireframe'
import { insertLayout } from './insert'
import { newId } from '@/lib/id'

const chip = 'rounded-full border px-2 py-0.5 text-[10.5px] transition-colors'
const chipOn = 'border-brand bg-brand text-white'
const chipOff = 'border-border-default text-text-2 hover:text-text-0'

/** One layout, draggable onto the page and clickable for anyone who would rather not drag. */
export function LayoutCard({ layout, onAdd, idPrefix = 'layout' }: { layout: LayoutDef; onAdd: () => void; idPrefix?: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `${idPrefix}-${layout.id}`,
    data: { kind: 'layout', layoutId: layout.id, label: layout.label },
  })
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      type="button"
      onClick={onAdd}
      title={layout.hint ?? layout.label}
      data-layout-card={layout.id}
      className={`group flex cursor-grab flex-col gap-1 rounded-lg border border-border-default bg-bg-2 p-1.5 text-left transition-colors hover:border-brand active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
    >
      <Wireframe rows={layout.wire} />
      <span className="px-0.5 text-[10.5px] font-medium leading-tight text-text-1">{layout.label}</span>
    </button>
  )
}

/** The searchable, categorised library of section layouts. Used in the side panel and the "Add section" picker. */
export function LayoutLibrary({ onPick, compact = false }: { onPick: (layout: LayoutDef) => void; compact?: boolean }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<LayoutCategory | 'All'>('All')
  const shown = useMemo(
    () => layouts.filter((layout) => (category === 'All' || layout.category === category) && matchesLayoutSearch(layout, query)),
    [category, query],
  )
  const grouped = useMemo(() => layoutCategories.map((name) => ({ name, items: shown.filter((layout) => layout.category === name) })).filter((group) => group.items.length), [shown])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search layouts..."
            aria-label="Search layouts"
            className="w-full rounded-md border border-border-default bg-bg-2 py-1.5 pr-2 text-[11px] text-text-0 outline-none placeholder:text-text-3 focus:border-brand"
            style={{ paddingLeft: '1.625rem' }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label="Layout category">
          {(['All', ...layoutCategories] as const).map((name) => (
            <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)} className={`${chip} ${category === name ? chipOn : chipOff}`}>{name}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {grouped.map((group) => (
          <div key={group.name}>
            <div className="pt-2.5 pb-1 text-[9px] font-semibold uppercase tracking-wider text-text-3">{group.name}</div>
            <div className={`grid gap-1.5 ${compact ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {group.items.map((layout) => <LayoutCard key={layout.id} layout={layout} idPrefix={compact ? 'picker' : 'layout'} onAdd={() => onPick(layout)} />)}
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="py-6 text-center text-[11px] text-text-3">No layout matches “{query}”</p>}
      </div>
    </div>
  )
}

/** Says where the next layout will land, and lets the client clear a spot they picked. */
function WhereBanner() {
  const insertTarget = useEditorStore((s) => s.insertTarget)
  const setInsertTarget = useEditorStore((s) => s.setInsertTarget)
  return (
    <div className="mx-3 mb-1 rounded-md border border-border-default bg-bg-2 px-2 py-1.5 text-[10.5px] leading-snug text-text-2" aria-live="polite">
      {insertTarget
        ? <>Adding at the spot you picked on the page. <button type="button" className="text-brand hover:underline" onClick={() => setInsertTarget(null)}>Use the end of the page instead</button></>
        : 'Adding at the end of the page. Use “+ Add section” on the page, or drag a layout, to choose the spot.'}
    </div>
  )
}

function SectionsView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WhereBanner />
      <LayoutLibrary onPick={(layout) => { insertLayout(layout.id); toast(`${layout.label} added`) }} />
    </div>
  )
}

/** Whole-page structures: pick one for the page chosen above. Replacing a page's sections asks first. */
function PagesView() {
  const config = useConfigStore((s) => s.config)
  const activePageId = useConfigStore((s) => s.activePageId)
  const setPageBlocks = useConfigStore((s) => s.setPageBlocks)
  const [pageId, setPageId] = useState(activePageId)
  const [pending, setPending] = useState<StructureDef | null>(null)
  const pages = ensurePages(config)
  const page = pages.find((entry) => entry.id === pageId) ?? pages.find((entry) => entry.id === activePageId) ?? pages[0]

  function apply(structure: StructureDef) {
    if (!page) return
    const blocks: BlockConfig[] = buildStructure(structure.id)
    setPageBlocks(page.id, blocks)
    useEditorStore.getState().selectBlock(null)
    useConfigStore.getState().setActivePage(page.id)
    setPending(null)
    toast(`${page.name} now uses the ${structure.label} structure. Undo brings back the old sections.`)
  }

  function choose(structure: StructureDef) {
    if (page && page.blocks.length > 0) setPending(structure)
    else apply(structure)
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2.5">
      <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-3">Change the layout of
        <select value={page?.id} onChange={(event) => { setPageId(event.target.value); setPending(null) }} className="mt-1 w-full rounded-md border border-border-default bg-bg-2 px-2 py-1.5 text-[11.5px] normal-case tracking-normal text-text-0">
          {pages.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
      </label>
      <p className="mt-1.5 text-[10.5px] leading-snug text-text-3">A structure is the skeleton of a page: empty, labelled sections with drop zones. Fill them with widgets. Other pages are not changed.</p>

      {pending && page && (
        <div role="alertdialog" aria-label="Replace this page's sections?" className="mt-2 rounded-lg border border-brand/60 bg-brand/10 p-2.5 text-[11px] leading-snug text-text-1">
          <p><strong>{page.name}</strong> already has {page.blocks.length} section{page.blocks.length === 1 ? '' : 's'}. Using “{pending.label}” replaces them. You can undo it right after.</p>
          <div className="mt-2 flex gap-1.5">
            <button type="button" onClick={() => apply(pending)} className="flex-1 rounded bg-brand py-1 text-[11px] font-semibold text-white">Replace</button>
            <button type="button" onClick={() => setPending(null)} className="rounded border border-border-default px-2 py-1 text-[11px] text-text-2">Keep my sections</button>
          </div>
        </div>
      )}

      <div className="mt-2.5 grid gap-2">
        {structures.map((structure) => (
          <button key={structure.id} type="button" data-structure-card={structure.id} onClick={() => choose(structure)} className="rounded-lg border border-border-default bg-bg-2 p-2 text-left transition-colors hover:border-brand">
            <StructureWireframe bands={structureWire(structure)} />
            <p className="mt-1.5 text-[11.5px] font-semibold text-text-0">{structure.label}</p>
            <p className="text-[10.5px] leading-snug text-text-3">{structure.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function PresetView({ kind, onDone }: { kind: 'header' | 'footer'; onDone?: () => void }) {
  const config = useConfigStore((s) => s.config)
  const updateBlock = useConfigStore((s) => s.updateBlock)
  const addBlock = useConfigStore((s) => s.addBlock)
  const setActiveRegion = useConfigStore((s) => s.setActiveRegion)
  const presets = kind === 'header' ? headerPresets : footerPresets
  const blockType = kind === 'header' ? 'navbar' : 'footer'
  const region = kind === 'header' ? config.header : config.footer
  const block = region?.find((item) => item.type === blockType)
  const current = activePreset(presets, block)

  function apply(preset: PresetDef) {
    setActiveRegion(kind)
    if (block) {
      const patch = presetPatch(preset, block)
      updateBlock(block.id, { variant: patch.variant, props: patch.props })
    } else {
      const created = {
        id: newId(`block-${blockType}`),
        type: blockType,
        variant: preset.variant,
        props: kind === 'header'
          ? { logo: config.name || 'Logo', links: ['Home'], ctaText: 'Button', autoPageLinks: true, ...(preset.props ?? {}) }
          : { logo: config.name || 'Logo', copyright: `© ${new Date().getFullYear()} ${config.name || ''}`.trim(), links: [], autoPageLinks: true, ...(preset.props ?? {}), ...(preset.force ?? {}) },
      } as BlockConfig
      addBlock(created, 0, null)
    }
    useEditorStore.getState().selectBlock(null)
    toast(`${kind === 'header' ? 'Header' : 'Footer'} changed on every page`)
    onDone?.()
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2.5">
      <p className="text-[10.5px] leading-snug text-text-3">
        The {kind} is shared. Pick a layout once and every page changes. Your {kind === 'header' ? 'logo, menu and button' : 'logo, links and text'} stay as you wrote them.
        {kind === 'header' && ' The menu is built from your pages automatically.'}
      </p>
      <div className="mt-2.5 grid gap-2">
        {presets.map((preset) => (
          <button key={preset.id} type="button" data-preset-card={preset.id} aria-pressed={current === preset.id} onClick={() => apply(preset)} className={`rounded-lg border bg-bg-2 p-2 text-left transition-colors hover:border-brand ${current === preset.id ? 'border-brand ring-1 ring-brand' : 'border-border-default'}`}>
            {kind === 'header' ? <HeaderMock variant={preset.variant} /> : <FooterMock variant={preset.variant} columns={Number(preset.force?.columnCount) || 3} />}
            <div className="mt-1.5 flex items-center gap-1.5">
              <p className="flex-1 text-[11.5px] font-semibold text-text-0">{preset.label}</p>
              {current === preset.id && <Check size={12} className="text-brand" />}
            </div>
            <p className="text-[10.5px] leading-snug text-text-3">{preset.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

const views: { value: LayoutView; label: string }[] = [
  { value: 'sections', label: 'Sections' },
  { value: 'pages', label: 'Page' },
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
]

/** The Layouts tab: structure first, widgets second. */
export function LayoutPanel() {
  const view = useEditorStore((s) => s.layoutView)
  const setView = useEditorStore((s) => s.setLayoutView)
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-1 px-3 pt-2.5" role="group" aria-label="What to lay out">
        {views.map((entry) => (
          <button key={entry.value} type="button" aria-pressed={view === entry.value} onClick={() => setView(entry.value)} className={`flex-1 ${chip} ${view === entry.value ? chipOn : chipOff}`}>{entry.label}</button>
        ))}
      </div>
      {view === 'sections' && <SectionsView />}
      {view === 'pages' && <PagesView />}
      {view === 'header' && <PresetView kind="header" />}
      {view === 'footer' && <PresetView kind="footer" />}
    </div>
  )
}

/**
 * The "+ Add section" picker, opened from the seam between two sections.
 * Closing it with the X, Escape or a click outside changes nothing.
 */
export function AddSectionDialog() {
  const picker = useEditorStore((s) => s.sectionPicker)
  const setPicker = useEditorStore((s) => s.setSectionPicker)
  // Section layouts go on the page; header and footer layouts go to their own shared parts.
  const [tab, setTab] = useState<'sections' | 'header' | 'footer'>('sections')
  if (!picker) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setPicker(null)} onKeyDown={(event) => { if (event.key === 'Escape') setPicker(null) }} role="presentation">
      <div role="dialog" aria-label="Choose a layout for the new section" className="flex max-h-[80vh] w-[720px] max-w-full flex-col overflow-hidden rounded-xl border border-border-default bg-bg-1 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
          <Plus size={14} className="text-brand" />
          <h2 className="flex-1 text-[13px] font-semibold text-text-0">Add a section — choose a layout</h2>
          <button type="button" aria-label="Close" onClick={() => setPicker(null)} className="rounded p-1 text-text-3 hover:text-text-0"><X size={14} /></button>
        </div>
        <div className="flex gap-1 px-3 pt-2.5" role="group" aria-label="What to add">
          {([['sections', 'Section layouts'], ['header', 'Header'], ['footer', 'Footer']] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`${chip} ${tab === value ? chipOn : chipOff}`}>{label}</button>
          ))}
        </div>
        {tab === 'sections' ? (
          <LayoutLibrary
            compact
            onPick={(layout) => {
              insertLayout(layout.id, { kind: 'gap', region: picker.region, index: picker.index, parentId: null })
              setPicker(null)
              toast(`${layout.label} added`)
            }}
          />
        ) : (
          <PresetView kind={tab} onDone={() => { setPicker(null); setTab('sections') }} />
        )}
      </div>
    </div>
  )
}
