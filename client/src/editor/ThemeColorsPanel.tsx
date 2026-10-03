import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown, Palette, RotateCcw } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import type { ThemeConfig } from '@/blocks/types'
import { resolveTheme } from '@/lib/theme-presets'
import { REGION_TOKENS } from '@/lib/region-colors'
import { contrast } from '@/lib/color'
import {
  THEME_TOKENS,
  themeTokenChange,
  themeTokenIsCustom,
  themeTokenReset,
} from '@/lib/theme-tokens'
import { HexColorField } from '@/builder/fields/HexColorField'
import { UndoRedoButtons } from '@/builder/UndoRedoButtons'

const ADVANCED: { title: string; colors: { key: keyof ThemeConfig; label: string }[] }[] = [
  {
    title: 'Backgrounds',
    colors: [
      { key: 'bg0', label: 'Outer ground' },
      { key: 'bg1', label: 'Page' },
      { key: 'bg2', label: 'Card' },
      { key: 'bg3', label: 'Card hover' },
      { key: 'bg4', label: 'Pressed' },
      { key: 'bg5', label: 'Strongest' },
    ],
  },
  {
    title: 'Text',
    colors: [
      { key: 'text0', label: 'Headings' },
      { key: 'text1', label: 'Body' },
      { key: 'text2', label: 'Muted' },
      { key: 'text3', label: 'Dimmed' },
    ],
  },
  {
    title: 'Brand and borders',
    colors: [
      { key: 'accent', label: 'Primary' },
      { key: 'accentDim', label: 'Secondary' },
      { key: 'borderDefault', label: 'Border' },
      { key: 'borderSubtle', label: 'Border, subtle' },
      { key: 'borderHover', label: 'Border, hover' },
    ],
  },
]

/**
 * Theme Colors: the site's palette, in the words a person would use for it.
 *
 * Every change writes to the site's theme, which is what the header, footer
 * and every page draw from — so one edit here restyles all of them at once.
 * Sections restyled with Section colours read the same theme, so they move
 * with it; colours set by hand on a section are stored on that section and are
 * not touched. Each edit is one undo step however long the picker is dragged.
 */
export function ThemeColorsPanel() {
  const theme = useConfigStore((s) => s.config.theme)
  const defaults = useConfigStore((s) => s.config.themeDefaults)
  const updateTheme = useConfigStore((s) => s.updateTheme)
  const resetTheme = useConfigStore((s) => s.resetTheme)
  const hasOriginal = useConfigStore((s) => s.config.blocks.some((block) => block.props.originalTemplate))
  const [advanced, setAdvanced] = useState(false)

  const resolved = useMemo(() => resolveTheme(theme), [theme])
  const anyCustom = THEME_TOKENS.some((token) => themeTokenIsCustom(theme, defaults, token.id)) || REGION_TOKENS.some(([key]) => theme?.[key] !== defaults?.[key])
  const textContrast = contrast(resolved.text0, resolved.bg1)

  return (
    <section aria-labelledby="theme-colors-title" className="mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 id="theme-colors-title" className="flex items-center gap-1.5 text-[11px] font-semibold text-text-0">
          <Palette size={12} className="text-brand" />
          Theme Colors
        </h3>
        <UndoRedoButtons />
      </div>
      <p className="text-[10.5px] text-text-3 leading-snug mb-2.5">
        Changes here restyle every page, including the shared header and footer.
      </p>

      {hasOriginal && (
        <p className="mb-2.5 rounded-lg border border-border-default bg-bg-2 px-2.5 py-2 text-[10.5px] leading-snug text-text-2">
          This is an imported HTML design with its own stylesheet, so theme colours do not repaint it.
        </p>
      )}

      <ul className="space-y-1.5">
        {THEME_TOKENS.map((token) => {
          const custom = themeTokenIsCustom(theme, defaults, token.id)
          return (
            <li key={token.id} className="flex items-center justify-between gap-2" title={token.hint}>
              <span className="text-[10.5px] text-text-2 min-w-0 truncate">{token.label}</span>
              <HexColorField
                compact
                label={token.label}
                value={token.read(resolved)}
                onChange={(hex) => updateTheme(themeTokenChange(theme, defaults, token.id, hex))}
                onReset={custom ? () => resetTheme(themeTokenReset(token.id)) : undefined}
                resetLabel="Reset to the template colour"
              />
            </li>
          )
        })}
        {REGION_TOKENS.map(([key, label]) => <li key={key} className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-text-2">{label}</span>
          <HexColorField compact label={label} value={theme?.[key]} fallback={key.endsWith('Text') ? resolved.text1 : resolved.bg1}
            onChange={hex => updateTheme({ [key]: hex })} onReset={() => resetTheme([key])} />
        </li>)}
      </ul>

      {textContrast < 4.5 && (
        <p role="status" className="mt-2 flex items-start gap-1.5 rounded-lg border border-status-yellow/30 bg-status-yellow/10 px-2.5 py-2 text-[10.5px] leading-snug text-text-1">
          <AlertTriangle size={12} className="mt-px shrink-0 text-status-yellow" />
          Text on the background is hard to read ({textContrast.toFixed(1)}:1). Aim for 4.5:1 or more.
        </p>
      )}

      <button
        type="button"
        onClick={() => resetTheme()}
        disabled={!anyCustom}
        className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-text-3 hover:text-text-0 disabled:opacity-40 disabled:hover:text-text-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand rounded"
      >
        <RotateCcw size={10} />
        Reset to the template palette
      </button>

      <div className="mt-3 border border-border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvanced(!advanced)}
          aria-expanded={advanced}
          className="w-full flex items-center justify-between px-3 py-2 bg-bg-2 hover:bg-bg-3 transition-colors text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          <span className="text-[11px] font-semibold">All shades</span>
          <ChevronDown size={12} className={`text-text-3 transition-transform ${advanced ? 'rotate-180' : ''}`} />
        </button>
        {advanced && (
          <div className="px-3 py-2.5 space-y-3 bg-bg-1">
            {ADVANCED.map((group) => (
              <div key={group.title}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-3 mb-1.5">{group.title}</div>
                <ul className="space-y-1.5">
                  {group.colors.map(({ key, label }) => (
                    <li key={key} className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] text-text-2">{label}</span>
                      <HexColorField
                        compact
                        label={label}
                        value={resolved[key] as string}
                        onChange={(hex) => updateTheme({ [key]: hex })}
                        onReset={defaults && defaults[key] !== undefined && defaults[key] !== resolved[key] ? () => resetTheme([key]) : undefined}
                        resetLabel="Reset to the template colour"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
