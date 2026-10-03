import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, Layout, Type, Grid3X3, DollarSign, Megaphone, PanelBottom, MessageSquare, BarChart3, HelpCircle, Users, Mail, Newspaper, Image, Plus, Minus, Flag, FileText, ImageIcon, Play, GalleryHorizontalEnd, MapPin, MessageCircle, PieChart, Clock, Package } from 'lucide-react'
import { useDraggable } from '@dnd-kit/core'
import { LayersPanel } from './LayersPanel'
import { PagesPanel } from '@/builder/PagesPanel'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { blockMetadata, categories } from '@/lib/block-metadata'
import { categoryIcon } from '@/widgets/library-icons'
import { matchesWidgetSearch } from '@/lib/widget-search'
import type { BlockType } from '@/blocks/types'
import { addWidgetSmart } from '@/builder/core'
import { LayoutPanel } from '@/layouts/LayoutPanel'
import { PageTemplatePanel } from './PageTemplatePanel'
import { readRecent, useWidgetPrefs } from '@/layouts/widget-prefs'
import { findBlock, isContainer } from '@/lib/block-tree'
import { regionBlocks, regionOfBlock } from '@/store/site-shape'
import type { InsertMode } from '@/store/editorStore'

const blockIcons: Partial<Record<BlockType, typeof Layout>> = {
  navbar: Layout, hero: Type, features: Grid3X3, pricing: DollarSign,
  cta: Megaphone, footer: PanelBottom, testimonials: MessageSquare,
  stats: BarChart3, faq: HelpCircle, team: Users, contact: Mail,
  newsletter: Newspaper, logocloud: Image, divider: Minus, banner: Flag,
  content: FileText, image: ImageIcon, video: Play, gallery: GalleryHorizontalEnd,
  map: MapPin, whatsapp: MessageCircle, chart: PieChart, hours: Clock, slider: GalleryHorizontalEnd, products: Package,
}

/**
 * One widget in the library.
 *
 * Draggable onto the page, and clickable for anyone who would rather not drag
 * — on a laptop trackpad, dragging across the screen is real work.
 */
function WidgetItem({
  meta,
  icon: Icon,
  onAdd,
  favorite = false,
  onToggleFavorite,
}: {
  meta: (typeof blockMetadata)[number]
  icon: typeof Layout
  onAdd: () => void
  favorite?: boolean
  onToggleFavorite?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `widget-${meta.type}`,
    data: { kind: 'new', type: meta.type },
  })

  return (
    <div className="group/row relative">
    {onToggleFavorite && (
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggleFavorite() }}
        aria-label={favorite ? `Remove ${meta.label} from favorites` : `Add ${meta.label} to favorites`}
        aria-pressed={favorite}
        className={`absolute right-6 top-1/2 z-[1] -translate-y-1/2 rounded p-0.5 text-[12px] leading-none transition-opacity ${favorite ? 'text-amber-500 opacity-100' : 'text-text-3 opacity-0 group-hover/row:opacity-100 focus:opacity-100'}`}
      >{favorite ? '★' : '☆'}</button>
    )}
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onAdd}
      title={meta.description}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] text-text-1 hover:bg-bg-3 hover:text-text-0 transition-colors text-left group cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <div className="w-[22px] h-[22px] rounded border border-border-default bg-bg-3 flex items-center justify-center text-[10px] shrink-0">
        <Icon size={12} />
      </div>
      <span className="flex-1">{meta.label}</span>
      <Plus size={11} className="text-text-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
    </div>
  )
}

function isContainerBlock(block: { type: string }): boolean {
  return isContainer(block as never)
}

function ComponentsPanel() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const { favorites, toggleFavorite } = useWidgetPrefs()
  const config = useConfigStore((s) => s.config)
  const selectedId = useEditorStore((s) => s.selectedBlockId)
  const insertTarget = useEditorStore((s) => s.insertTarget)
  const setInsertTarget = useEditorStore((s) => s.setInsertTarget)
  const insertMode = useEditorStore((s) => s.insertMode)
  const setInsertMode = useEditorStore((s) => s.setInsertMode)
  const selected = useConfigStore((s) => {
    if (!selectedId) return null
    const region = regionOfBlock(s.config, selectedId, s.activePageId)
    return findBlock(regionBlocks(s.config, region, s.activePageId), selectedId)
  })

  const filtered = blockMetadata.filter((b) => (!category || b.category === category) && matchesWidgetSearch(b, search))

  const grouped = filtered.reduce<Record<string, typeof blockMetadata>>((acc, b) => {
    if (!acc[b.category]) acc[b.category] = []
    acc[b.category].push(b)
    return acc
  }, {})

  const showShortcuts = !search.trim() && !category
  // Re-read on every site change, so a widget added a moment ago is already at the top.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentTypes = useMemo(() => readRecent(), [config])
  const favoriteMetas = favorites.map((type) => blockMetadata.find((entry) => entry.type === type)).filter((entry): entry is (typeof blockMetadata)[number] => Boolean(entry))
  const recentMetas = recentTypes.map((type) => blockMetadata.find((entry) => entry.type === type)).filter((entry): entry is (typeof blockMetadata)[number] => Boolean(entry))

  function handleAdd(type: BlockType) {
    const meta = blockMetadata.find((b) => b.type === type)
    if (!meta) return
    addWidgetSmart(type, insertMode)
    toast(`${meta.label} added`)
  }

  const modes: { value: InsertMode; label: string; needsSelection: boolean }[] = [
    { value: 'before', label: 'Before', needsSelection: true },
    { value: 'after', label: 'After', needsSelection: true },
    { value: 'inside', label: 'Inside', needsSelection: true },
    { value: 'end', label: 'Page end', needsSelection: false },
  ]
  const canGoInside = Boolean(selected && isContainerBlock(selected))
  const where = insertTarget
    ? `At the spot you picked on the page`
    : selected
      ? `${insertMode === 'end' ? 'At the end of the page' : `${insertMode === 'inside' && !canGoInside ? 'After' : insertMode[0].toUpperCase() + insertMode.slice(1)} the selected ${selected.type}`}`
      : 'At the end of the page — select a section, or use “Add here” on the page, to choose the spot'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 pt-2.5 pb-1.5">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-3" />
          <input
            type="text"
            placeholder="Search 200+ widgets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-2 py-1.5 rounded-md border border-border-default bg-bg-2 text-text-0 text-[11px] outline-none focus:border-brand placeholder:text-text-3"
            style={{ paddingLeft: '1.625rem' }}
          />
        </div>
      </div>

      <div className="px-3 pb-2" data-testid="insert-position">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-text-3 mb-1">Add new widgets</div>
        <div className="flex gap-1" role="group" aria-label="Where to add the widget">
          {modes.map((mode) => {
            const disabled = (mode.needsSelection && !selected) || (mode.value === 'inside' && !canGoInside)
            return (
              <button
                key={mode.value}
                type="button"
                disabled={disabled}
                aria-pressed={insertMode === mode.value}
                onClick={() => { setInsertTarget(null); setInsertMode(mode.value) }}
                className={`flex-1 rounded-md border px-1 py-1 text-[10px] font-medium transition-colors disabled:opacity-40 ${insertMode === mode.value && !insertTarget ? 'bg-brand text-white border-brand' : 'border-border-default text-text-2 hover:bg-bg-3'}`}
              >
                {mode.label}
              </button>
            )
          })}
        </div>
        <p className="mt-1 text-[10px] text-text-3 leading-snug" aria-live="polite">{where}</p>
        {insertTarget && (
          <button type="button" onClick={() => setInsertTarget(null)} className="mt-1 text-[10px] text-brand hover:underline">Clear chosen spot</button>
        )}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1" role="group" aria-label="Widget category">
        {['', ...categories].map((name) => (
          <button key={name || 'all'} type="button" aria-pressed={category === name} onClick={() => setCategory(name)} className={`rounded-full border px-2 py-0.5 text-[10.5px] transition-colors ${category === name ? 'border-brand bg-brand text-white' : 'border-border-default text-text-2 hover:text-text-0'}`}>{name || 'All'}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {showShortcuts && favoriteMetas.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-text-3 px-1.5 pt-2.5 pb-1">Favorites</div>
            {favoriteMetas.map((meta) => (
              <WidgetItem key={`fav-${meta.type}`} meta={meta} icon={blockIcons[meta.type] || categoryIcon(meta.category)} onAdd={() => handleAdd(meta.type)} favorite onToggleFavorite={() => toggleFavorite(meta.type)} />
            ))}
          </div>
        )}
        {showShortcuts && recentMetas.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-text-3 px-1.5 pt-2.5 pb-1">Recently used</div>
            {recentMetas.map((meta) => (
              <WidgetItem key={`recent-${meta.type}`} meta={meta} icon={blockIcons[meta.type] || categoryIcon(meta.category)} onAdd={() => handleAdd(meta.type)} favorite={favorites.includes(meta.type)} onToggleFavorite={() => toggleFavorite(meta.type)} />
            ))}
          </div>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-text-3 px-1.5 pt-2.5 pb-1">
              {category}
            </div>
            {items.map((meta) => (
              <WidgetItem
                key={meta.type}
                meta={meta}
                icon={blockIcons[meta.type] || categoryIcon(meta.category)}
                onAdd={() => handleAdd(meta.type)}
                favorite={favorites.includes(meta.type)}
                onToggleFavorite={() => toggleFavorite(meta.type)}
              />
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-2 py-6 text-center text-[11px] text-text-3">
            No widget matches “{search}”
          </div>
        )}
      </div>
    </div>
  )
}

export function LeftSidebar() {
  const stored = useEditorStore((s) => s.leftTab)
  const setTab = useEditorStore((s) => s.setLeftTab)
  // A site built from layouts and widgets never shows ready-made templates.
  const custom = useConfigStore((s) => s.config.buildMode === 'custom')
  const tab = custom && stored === 'templates' ? 'pages' : stored
  const tabs: readonly (readonly [typeof stored, string])[] = [
    ['pages', 'Pages'],
    ['layouts', 'Layouts'],
    ['components', 'Widgets'],
    ['layers', 'Layers'],
    ...(custom ? [] : [['templates', 'Templates'] as const]),
  ]

  return (
    <div className="hidden md:flex w-[280px] bg-bg-1 border-r border-border-default flex-col shrink-0">
      <div className="flex border-b border-border-default shrink-0">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`flex-1 py-2 text-[10.5px] font-medium transition-colors ${
              tab === value
                ? 'text-text-0 border-b border-brand'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'pages' ? (
        <PagesPanel />
      ) : tab === 'layouts' ? (
        <LayoutPanel />
      ) : tab === 'templates' ? (
        <div className="flex-1 overflow-y-auto"><PageTemplatePanel /></div>
      ) : tab === 'layers' ? (
        <LayersPanel />
      ) : (
        <ComponentsPanel />
      )}
    </div>
  )
}
