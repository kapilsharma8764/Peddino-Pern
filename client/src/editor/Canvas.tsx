import { regionColorVars } from '@/lib/region-colors'
import { useMemo } from 'react'
import { useDndMonitor } from '@dnd-kit/core'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import type { SiteRegion } from '@/blocks/types'
import { DropEnd, DropZone } from '@/builder/DropZone'
import { useEditorStore } from '@/store/editorStore'
import { CanvasEmpty } from './CanvasEmpty'
import { BlockWrapper } from '@/blocks/BlockWrapper'
import { RenderBlock } from '@/blocks/registry'
import { CanvasContext } from '@/blocks/canvas-context'
import { resolveTheme, themeToCSS } from '@/lib/theme-presets'
import { themeRulesCss } from '@/lib/section-colors'
import { useGoogleFonts } from '@/lib/useGoogleFonts'
import { renderSkeleton } from '@/builder/core'
import { pageColorVars } from '@/lib/page-colors'
import { EmptyPage } from '@/layouts/EmptyPage'

/**
 * A labelled strip around the header and footer, so it is obvious those parts
 * are shared and that editing them changes every page.
 */
function SharedRegion({
  label,
  active,
  onActivate,
  children,
}: {
  label: string
  active: boolean
  onActivate: () => void
  children: React.ReactNode
}) {
  return (
    <div className="relative group/region">
      {/* Shown on hover, or while this part is being edited, so it never sits on top of
          the words of a header such as the one with a contact bar. */}
      <button
        type="button"
        onClick={onActivate}
        className={`absolute -top-px left-0 z-[3] px-1.5 py-0.5 rounded-br text-[9px] font-medium tracking-wide uppercase transition-all focus-visible:opacity-100 ${
          active ? 'bg-brand text-white opacity-100' : 'bg-bg-4 text-text-2 hover:bg-bg-5 opacity-0 group-hover/region:opacity-100'
        }`}
        title={`${label} appears on every page`}
      >
        {label} · every page
      </button>
      {children}
    </div>
  )
}

/**
 * A "+ Add here" control on the seam between two sections.
 *
 * Appearing on hover keeps the page looking like the site rather than a
 * wireframe, while making it possible to say exactly where the next widget
 * should go — the seam is the natural place to point at. It remembers the
 * spot and opens the widget list; the spot stays marked until it is used.
 */
function AddHere({ region, index }: { region: SiteRegion; index: number }) {
  const insertTarget = useEditorStore((s) => s.insertTarget)
  const setInsertTarget = useEditorStore((s) => s.setInsertTarget)
  const setLeftTab = useEditorStore((s) => s.setLeftTab)
  const setSectionPicker = useEditorStore((s) => s.setSectionPicker)
  const chosen = insertTarget?.region === region && insertTarget.parentId === null && insertTarget.index === index
  return (
    <div className="relative h-0 z-[4] pointer-events-none" data-add-here={`${region}-${index}`}>
      {/* Only the small centre pill takes the pointer, so the rest of the seam
          never blocks a click on the section's own top edge or its toolbar. */}
      <div className={`absolute left-1/2 -translate-x-1/2 -top-3 h-6 flex items-center justify-center gap-1.5 px-2 pointer-events-auto ${chosen ? '' : 'opacity-0 hover:opacity-100 focus-within:opacity-100'} transition-opacity`}>
        <div className={`absolute inset-x-0 top-1/2 ${chosen ? 'bg-brand h-0.5' : 'bg-brand/40 h-px'}`} />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            useEditorStore.getState().selectBlock(null)
            setInsertTarget({ region, parentId: null, index })
            setLeftTab('components')
          }}
          className="relative inline-flex items-center gap-1 rounded-full bg-brand text-white text-[10px] font-medium px-2.5 py-0.5 shadow whitespace-nowrap"
          aria-label={`Add a widget here (${region} position ${index + 1})`}
        >
          <Plus size={11} /> {chosen ? 'Adding here' : 'Add here'}
        </button>
        {region === 'page' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setSectionPicker({ region: 'page', index }) }}
            className="relative inline-flex items-center gap-1 rounded-full border border-brand bg-bg-1 text-brand text-[10px] font-medium px-2.5 py-0.5 shadow whitespace-nowrap"
            aria-label={`Add a section here (position ${index + 1})`}
          >
            <Plus size={11} /> Add section
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * What a header or footer shows before one has been chosen: a labelled place to build it.
 * Nothing is inserted for the client; clicking opens the matching layout list.
 */
function BuildRegion({ kind }: { kind: 'header' | 'footer' }) {
  const setLeftTab = useEditorStore((s) => s.setLeftTab)
  const setLayoutView = useEditorStore((s) => s.setLayoutView)
  const setActiveRegion = useConfigStore((s) => s.setActiveRegion)
  const word = kind === 'header' ? 'Header' : 'Footer'
  return (
    <button
      type="button"
      data-build-region={kind}
      onClick={(event) => { event.stopPropagation(); setActiveRegion(kind); setLeftTab('layouts'); setLayoutView(kind) }}
      className="flex w-full items-center justify-center gap-2 border-dashed border-border-default px-4 py-5 text-[12.5px] font-medium text-text-2 transition-colors hover:bg-bg-2 hover:text-brand"
      style={{ borderBottomWidth: kind === 'header' ? 1 : 0, borderTopWidth: kind === 'footer' ? 1 : 0 }}
    >
      <Plus size={14} />Build {word}<span className="font-normal text-text-3">· shown on every page</span>
    </button>
  )
}

export function Canvas() {
  const config = useConfigStore((s) => s.config)
  const activePageId = useConfigStore((s) => s.activePageId)
  const { header, main: blocks, footer, page } = renderSkeleton(config, activePageId)
  const activeRegion = useConfigStore((s) => s.activeRegion)
  const setActiveRegion = useConfigStore((s) => s.setActiveRegion)
  const theme = config.theme
  const { selectedBlockId, selectBlock, viewport } = useEditorStore()
  const previewMode = useEditorStore((s) => s.previewMode)

  // Drop gaps only take up space while something is actually being dragged.
  const [dragging, setDragging] = useState(false)
  useDndMonitor({
    onDragStart: () => setDragging(true),
    onDragEnd: () => setDragging(false),
    onDragCancel: () => setDragging(false),
  })

  const resolved = useMemo(() => resolveTheme(theme), [theme])
  const cssVars = useMemo(() => themeToCSS(resolved), [resolved])
  useGoogleFonts([resolved.fontSans, resolved.fontDisplay, resolved.fontMono])

  // 1440 rather than 880: the canvas is meant to show what a visitor sees, and
  // a visitor is on a laptop or a monitor. Capped at 880 it flattered every
  // design — sections looked neatly proportioned in the editor and then spread
  // across the whole screen once published.
  const maxWidth = viewport === 'desktop' ? '1440px' : viewport === 'tablet' ? '768px' : '375px'
  // Inside the tablet and phone frames the wrapper has no width of its own, so
  // `width: 100%` collapses to whatever the content happens to need and the
  // page spills out of the frame. Those two get the device width outright.
  const canvasWidth = viewport === 'desktop' ? '100%' : maxWidth

  // A site built from layouts never opens on the old starter screen: it shows its own blank page
  // with a place to build each part.
  const custom = config.buildMode === 'custom'
  const isEmpty = !custom && blocks.length === 0 && header.length === 0 && footer.length === 0
  if (isEmpty) {
    return <CanvasEmpty />
  }

  // Selecting a block also switches the active region, so the next widget you
  // add lands beside the one you just clicked rather than on the page below.
  const renderRegion = (list: typeof blocks, region: SiteRegion) => (
    // Announcing the region here is what lets a widget nested inside a
    // container know it is being edited rather than previewed, and which part
    // of the site it belongs to — neither of which is in its props.
    <CanvasContext.Provider value={{ region, dragging }}>
      {list.length === 0 && region !== 'page' && !previewMode && <BuildRegion kind={region} />}
      {list.map((block, index) => (
        <div key={block.id} className="relative">
          {!previewMode && !dragging && <AddHere region={region} index={index} />}
          <BlockWrapper
            block={block}
            index={index}
            region={region}
            isSelected={selectedBlockId === block.id}
            onSelect={() => {
              selectBlock(block.id)
              setActiveRegion(region)
            }}
          >
            <RenderBlock block={block} />
          </BlockWrapper>

          {/* While something is being dragged, each section's two halves become
              landing places — above it and below it. */}
          {dragging && (
            <>
              <DropZone region={region} index={index} edge="top" />
              <DropZone region={region} index={index + 1} edge="bottom" />
            </>
          )}
        </div>
      ))}

      {!previewMode && !dragging && (region === 'page' || list.length > 0) && <AddHere region={region} index={list.length} />}
      {region === 'page' && list.length === 0 && !previewMode && <EmptyPage />}
      {region === 'page' && list.length > 0 && !previewMode && !dragging && (
        <div className="flex justify-center py-5">
          <button type="button" onClick={() => useEditorStore.getState().setSectionPicker({ region: 'page', index: list.length })} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-brand/60 px-4 py-1.5 text-[12px] font-medium text-brand hover:bg-brand/10" data-testid="add-section-end">
            <Plus size={13} /> Add section
          </button>
        </div>
      )}
      {dragging && <DropEnd region={region} index={list.length} />}
    </CanvasContext.Provider>
  )

  const canvasContent = (
    <div
      className="@container site-root border rounded-xl min-h-[400px] relative z-[1] overflow-hidden transition-all duration-300"
      style={{ width: canvasWidth, maxWidth, ...cssVars, color: 'var(--color-text-0)', backgroundColor: 'var(--color-bg-1)', borderColor: 'var(--color-border-default)' } as React.CSSProperties}
      onClick={(e) => {
        if (e.target === e.currentTarget) selectBlock(null)
      }}
      role="region"
      data-viewport={viewport}
      aria-label={`Site preview, ${blocks.length} blocks, ${viewport} viewport`}
    >
      <style>{themeRulesCss('.site-root')}</style>
      {(header.length > 0 || !previewMode) && (
        <SharedRegion
          label="Header"
          active={activeRegion === 'header'}
          onActivate={() => setActiveRegion('header')}
        >
          <div className="" data-theme-region="header" style={regionColorVars(theme, 'header')}>{renderRegion(header, 'header')}</div>
        </SharedRegion>
      )}

      <div data-page-colors={page.id} style={pageColorVars(page.colors) as React.CSSProperties} onClick={() => setActiveRegion('page')}>{renderRegion(blocks, 'page')}</div>

      {(footer.length > 0 || !previewMode) && (
        <SharedRegion
          label="Footer"
          active={activeRegion === 'footer'}
          onActivate={() => setActiveRegion('footer')}
        >
          <div className="" data-theme-region="footer" style={regionColorVars(theme, 'footer')}>{renderRegion(footer, 'footer')}</div>
        </SharedRegion>
      )}
    </div>
  )

  return (
    <div className="flex-1 flex items-start justify-center p-6 overflow-auto relative">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-bg-3) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {viewport === 'tablet' ? (
        <div className="relative z-[1]">
          {/* Tablet frame */}
          <div className="border-[12px] border-bg-4 rounded-2xl bg-bg-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            <div className="rounded-lg overflow-hidden">
              {canvasContent}
            </div>
          </div>
        </div>
      ) : viewport === 'mobile' ? (
        <div className="relative z-[1]">
          {/* Phone frame */}
          <div className="border-[10px] border-bg-4 rounded-[2rem] bg-bg-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {/* Notch */}
            <div className="flex justify-center -mt-[4px] mb-1">
              <div className="w-24 h-5 bg-bg-4 rounded-b-xl" />
            </div>
            <div className="rounded-xl overflow-hidden">
              {canvasContent}
            </div>
            {/* Home indicator */}
            <div className="flex justify-center mt-2 pb-1">
              <div className="w-28 h-1 bg-bg-5 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        canvasContent
      )}
    </div>
  )
}
