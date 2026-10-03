import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Palette as PaletteIcon, X } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { mix, readableOn } from '@/lib/color'
import { withTokenChange } from '@/lib/original-theme'
import type { Palette } from '@/lib/original-palette'
import { HexColorField } from '@/builder/fields/HexColorField'
import { OriginalPageColors, OriginalSectionColors, OriginalThemePanel } from './OriginalColors'
import { SectionColourPanel, type SectionColoursApi } from './SectionColourPanel'
import type { VisualNode, VisualPatch } from './original-model'
import './quick-colours.css'

/**
 * A "Colours" button for the bar that floats over a selected item, and the panel it opens:
 * colours for this item or section, for this page, and for the whole template.
 *
 * It reuses the editor's own colour tools (section colours, page colours, theme colours), so what
 * is changed here is the same thing the right-hand panel changes. Ready-made colour sets repaint the
 * whole template through the same theme code as the "Theme Colors" fields.
 */

/** A whole palette from three choices: the brand colour, the page colour and the text colour. */
function colourSet(primary: string, background: string, text: string): Partial<Palette> {
  return {
    primary,
    accent: primary,
    secondary: mix(primary, '#000000', 0.2),
    background,
    surface: mix(background, text, 0.06),
    text,
    muted: mix(text, background, 0.45),
    border: mix(background, text, 0.15),
    buttonBg: primary,
    buttonText: readableOn(primary),
  }
}

const COLOUR_SETS: { name: string; primary: string; background: string; text: string }[] = [
  { name: 'Ocean blue', primary: '#2563eb', background: '#ffffff', text: '#0f172a' },
  { name: 'Forest green', primary: '#15803d', background: '#f7fbf7', text: '#14281a' },
  { name: 'Sunset orange', primary: '#ea580c', background: '#fffaf5', text: '#2b1a10' },
  { name: 'Rose', primary: '#e11d48', background: '#fff7f9', text: '#2a1018' },
  { name: 'Royal purple', primary: '#7c3aed', background: '#ffffff', text: '#1e1033' },
  { name: 'Teal', primary: '#0d9488', background: '#f4fbfa', text: '#0f2926' },
  { name: 'Gold and ink', primary: '#b8860b', background: '#fffdf6', text: '#1c1917' },
  { name: 'Slate', primary: '#475569', background: '#f8fafc', text: '#0f172a' },
  { name: 'Midnight', primary: '#38bdf8', background: '#0b1220', text: '#e6edf7' },
  { name: 'Charcoal', primary: '#f59e0b', background: '#17181c', text: '#f2f2f2' },
]

type Tab = 'item' | 'page' | 'template'

export function QuickColours({ selected, computed, edit, className, sectionColours }: { selected: VisualNode | null; computed: Record<string, string>; edit: (patch: VisualPatch) => void; className?: string; sectionColours?: SectionColoursApi }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>(selected ? 'item' : 'page')
  const [place, setPlace] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const setOriginalTheme = useConfigStore((s) => s.setOriginalTheme)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const [failed, setFailed] = useState(false)
  const isSection = selected?.kind === 'section'

  // Put the panel under the button, or above it when there is no room below, inside the window.
  useLayoutEffect(() => {
    if (!open || !button.current) return
    const rect = button.current.getBoundingClientRect()
    const width = 340
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    setPlace(window.innerHeight - rect.bottom > 380 ? { left, top: rect.bottom + 8 } : { left, bottom: window.innerHeight - rect.top + 8 })
  }, [open, tab])

  useEffect(() => {
    if (!open) return
    const outside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); button.current?.focus() } }
    document.addEventListener('mousedown', outside)
    window.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', outside); window.removeEventListener('keydown', escape) }
  }, [open])

  /** Applies a colour set one after another, so two quick clicks cannot overwrite each other. */
  function paint(next: Partial<Palette>) {
    setFailed(false)
    queue.current = queue.current.then(async () => {
      try {
        const result = await withTokenChange(useConfigStore.getState().config, next)
        if (result) setOriginalTheme(result, 'Apply colour set')
        else setFailed(true)
      } catch {
        setFailed(true)
      }
    })
  }

  // With nothing selected there is no "this item": the panel opens on the page and the whole template.
  const tabs: [Tab, string][] = [...(selected ? [['item', isSection ? 'This section' : 'This item'] as [Tab, string]] : []), ['page', 'This page'], ['template', 'Whole template']]
  const shown: Tab = tab === 'item' && !selected ? 'page' : tab

  return (
    <>
      <button ref={button} type="button" className={className} aria-label="Quick colours" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(!open)}>
        {className ? <><PaletteIcon size={16} /> <span>Colours</span></> : <><PaletteIcon size={13} />Colours</>}
      </button>
      {open && createPortal(
        <div ref={panel} role="dialog" aria-label="Colours" className="quick-colours" style={{ left: place?.left ?? 8, top: place?.top, bottom: place?.bottom, visibility: place ? 'visible' : 'hidden' }}>
          <header>
            <strong>Colours</strong>
            <button type="button" aria-label="Close colours" onClick={() => setOpen(false)}><X size={15} /></button>
          </header>
          <div className="quick-colours-tabs" role="tablist">
            {tabs.map(([id, label]) => <button key={id} role="tab" type="button" aria-selected={shown === id} onClick={() => setTab(id)}>{label}</button>)}
          </div>
          <div className="quick-colours-body">
            {shown === 'item' && selected && <>
              {sectionColours && <SectionColourPanel api={sectionColours} />}
              <details className="quick-colours-styles">
                <summary>More ways to style this {isSection ? 'section' : 'item'}</summary>
                {isSection && <OriginalSectionColors value={selected.ptColors} onChange={(colors) => edit({ ptColors: colors ?? null })} />}
                <div className="quick-colours-fields">
                  <label><span>Text colour</span><HexColorField compact label="Text colour" value={selected.color || undefined} fallback={computed.color?.startsWith('#') ? computed.color : '#000000'} onChange={(hex) => edit({ color: hex })} onReset={selected.color ? () => edit({ color: '' }) : undefined} resetLabel="Back to the design's colour" /></label>
                  <label><span>Background colour</span><HexColorField compact label="Background colour" value={selected.background || undefined} fallback={computed.background?.startsWith('#') ? computed.background : '#ffffff'} onChange={(hex) => edit({ background: hex })} onReset={selected.background ? () => edit({ background: '' }) : undefined} resetLabel="Back to the design's colour" /></label>
                </div>
              </details>
            </>}
            {shown === 'page' && <OriginalPageColors />}
            {shown === 'template' && <>
              <p className="quick-colours-note">Pick a ready-made set to repaint the whole template on every page. You can fine-tune each colour below.</p>
              <div className="quick-colours-sets" role="group" aria-label="Ready-made colour sets">
                {COLOUR_SETS.map((set) => (
                  <button key={set.name} type="button" title={set.name} aria-label={`Use ${set.name}`} onClick={() => paint(colourSet(set.primary, set.background, set.text))}>
                    <span className="swatch" style={{ background: set.background, color: set.text }}><i style={{ background: set.primary }} /><b>Aa</b></span>
                    <small>{set.name}</small>
                  </button>
                ))}
              </div>
              {failed && <p role="alert" className="quick-colours-error">Could not apply that colour set. Please try again.</p>}
              <OriginalThemePanel />
            </>}
          </div>
        </div>,
        document.querySelector('.app-shell') ?? document.body,
      )}
    </>
  )
}
