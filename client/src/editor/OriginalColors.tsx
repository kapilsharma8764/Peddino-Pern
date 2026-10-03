import { REGION_TOKENS } from '@/lib/region-colors'
import { useRef, useState } from 'react'
import { AlertTriangle, Loader2, Palette, RotateCcw } from 'lucide-react'
import type { SectionColors } from '@/blocks/types'
import { useConfigStore, beginHistoryGroup, endHistoryGroup } from '@/store/configStore'
import { contrast } from '@/lib/color'
import { currentPalette, detectedPalette, withTokenChange } from '@/lib/original-theme'
import type { Palette as ThemePalette } from '@/lib/original-palette'
import { resolvedOriginalSectionPalette } from '@/lib/original-sections'
import { THEME_TOKENS } from '@/lib/theme-tokens'
import { HexColorField } from '@/builder/fields/HexColorField'
import { SectionColorsEditor } from '@/builder/SectionColorsPanel'
import { UndoRedoButtons } from '@/builder/UndoRedoButtons'

/** The colours an imported design was drawn with, as the owner's Theme Colors. */
export function OriginalThemePanel() {
  const theme = useConfigStore((s) => s.config.originalTheme)
  const setOriginalTheme = useConfigStore((s) => s.setOriginalTheme)
  const detected = detectedPalette(theme)
  const current = currentPalette(theme)
  const [failed, setFailed] = useState(false)
  // Changes are applied one after another: each waits for the previous to be
  // stored, so two quick edits to different colours cannot overwrite each other.
  const queue = useRef<Promise<void>>(Promise.resolve())

  function change(next: Partial<ThemePalette> | null) {
    queue.current = queue.current.then(async () => {
      try {
        const result = await withTokenChange(useConfigStore.getState().config, next)
        if (result) setOriginalTheme(result, next === null ? 'Reset theme colours' : 'Update theme colours')
      } catch {
        setFailed(true)
      }
    })
  }

  if (!detected || !current) {
    return (
      <div className="visual-controls" role="status">
        <p className="flex items-center gap-2 text-[12px] text-text-2">
          <Loader2 size={14} className="animate-spin" /> Reading this design’s colours…
        </p>
      </div>
    )
  }

  const anyCustom = Object.keys(theme?.tokens ?? {}).length > 0
  const textContrast = contrast(current.text, current.background)

  return (
    <div className="visual-controls" onFocusCapture={beginHistoryGroup} onBlurCapture={endHistoryGroup} data-testid="original-theme-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="flex items-center gap-1.5 text-[12px] font-semibold text-text-0">
          <Palette size={13} className="text-brand" />
          Theme Colors
        </h3>
        <UndoRedoButtons />
      </div>
      <p className="text-[11px] leading-snug text-text-3 mb-3">
        These are the colours this design is built on. Changing one repaints it on every page, including the shared header and footer.
      </p>

      <ul className="space-y-2">
        {THEME_TOKENS.map((token) => {
          const custom = Boolean(theme?.tokens?.[token.id])
          return (
            <li key={token.id} className="flex items-center justify-between gap-2" title={token.hint}>
              <span className="text-[11px] text-text-2 min-w-0 truncate">{token.label}</span>
              <HexColorField
                compact
                label={token.label}
                value={current[token.id]}
                onChange={(hex) => change({ [token.id]: hex })}
                onReset={custom ? () => change({ [token.id]: detected[token.id] }) : undefined}
                resetLabel="Reset to the design’s own colour"
              />
            </li>
          )
        })}
      </ul>

      {textContrast < 4.5 && (
        <p role="status" className="mt-3 flex items-start gap-1.5 rounded-lg border border-status-yellow/30 bg-status-yellow/10 px-2.5 py-2 text-[11px] leading-snug text-text-1">
          <AlertTriangle size={12} className="mt-px shrink-0 text-status-yellow" />
          Text on the background is hard to read ({textContrast.toFixed(1)}:1). Aim for 4.5:1 or more.
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-3 text-[11px] text-status-red">
          Could not apply that colour. Check your connection and try again.
        </p>
      )}

      <button
        type="button"
        disabled={!anyCustom}
        onClick={() => change(null)}
        className="mt-3 flex items-center gap-1.5 text-[11px] text-text-3 hover:text-text-0 disabled:opacity-40 disabled:hover:text-text-3 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
      >
        <RotateCcw size={10} />
        Reset to the design’s own palette
      </button>
      <p className="mt-3 text-[10.5px] leading-snug text-text-3">
        Colours you set on a single item or section by hand are kept when the theme changes.
      </p>
    </div>
  )
}

/** Section colours for one section of an imported design. */
export function OriginalSectionColors({
  value,
  onChange,
}: {
  value: SectionColors | undefined
  onChange: (colors: SectionColors | undefined) => void
}) {
  const palette = currentPalette(useConfigStore((s) => s.config.originalTheme))
  if (!palette) return null
  return (
    <div onFocusCapture={beginHistoryGroup} onBlurCapture={endHistoryGroup} className="-mx-3 mt-4">
      <SectionColorsEditor value={value} onChange={onChange} palette={(colors) => resolvedOriginalSectionPalette(palette, colors)} />
    </div>
  )
}

export function OriginalPageColors() {
  const config = useConfigStore(s => s.config)
  const id = useConfigStore(s => s.activePageId)
  const update = useConfigStore(s => s.setPageColors)
  const updateTheme = useConfigStore(s => s.updateTheme)
  const resetTheme = useConfigStore(s => s.resetTheme)
  const page = config.pages?.find(page => page.id === id)
  return <div className="visual-controls" onFocusCapture={beginHistoryGroup} onBlurCapture={endHistoryGroup}>
    <h3>Page colours: {page?.name}</h3>
    <p className="visual-muted">Only this page’s content changes. Reset a colour to restore the original design.</p>
    {(['background', 'text', 'heading'] as const).map(key => <div key={key} className="flex items-center justify-between gap-2 my-2">
      <span className="capitalize">{key}</span><HexColorField compact label={`Page ${key}`} value={page?.colors?.[key]} onChange={hex => update(id, { ...page?.colors, [key]: hex })} onReset={() => update(id, { ...page?.colors, [key]: undefined })} />
    </div>)}
    <h3>Shared header and footer</h3>
    {REGION_TOKENS.filter(([key]) => !/Link|Button/.test(key)).map(([key, label]) => <div key={key} className="flex items-center justify-between gap-2 my-2">
      <span>{label}</span><HexColorField compact label={label} value={config.theme?.[key]} onChange={hex => updateTheme({ [key]: hex })} onReset={() => resetTheme([key])} />
    </div>)}
  </div>
}
