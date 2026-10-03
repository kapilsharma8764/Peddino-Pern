import { useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Image as ImageIcon, RotateCcw } from 'lucide-react'
import type { BlockConfig, SectionColorKey, SectionColorPreset, SectionColors } from '@/blocks/types'
import { useConfigStore } from '@/store/configStore'
import { contrast } from '@/lib/color'
import {
  DEFAULT_OVERLAY,
  OVERRIDE_KEYS,
  SECTION_PRESETS,
  normalizeSectionColors,
  resolvedSectionPalette,
  safeImageUrl,
} from '@/lib/section-colors'
import { FieldRenderer } from './fields/FieldRenderer'
import { HexColorField } from './fields/HexColorField'
import { UndoRedoButtons } from './UndoRedoButtons'

/**
 * Section colours: pick how one section is coloured.
 *
 * The three styles are recipes over the site's theme, so a Style 3 band is the
 * template's own primary colour, not a fixed blue. The editor is the same for
 * the block editor and for imported HTML designs; only where the choice is
 * stored, and how a swatch is worked out, differ.
 */
export function SectionColorsEditor({
  value,
  onChange,
  palette: paletteFor,
}: {
  value: SectionColors | undefined
  onChange: (next: SectionColors | undefined) => void
  /** The colours a section wearing `colors` would show. */
  palette: (colors: SectionColors | undefined) => Record<SectionColorKey, string>
}) {
  const [customOpen, setCustomOpen] = useState(false)

  const colors = normalizeSectionColors(value)
  // A section with no preset is showing the theme as designed — Style 1.
  const selected: SectionColorPreset = colors?.preset ?? 'style1'
  const overrides = colors?.overrides ?? {}
  const overrideCount = Object.keys(overrides).length
  const image = colors?.image
  const opacity = image?.overlayOpacity ?? DEFAULT_OVERLAY.opacity
  const overlayColor = image?.overlayColor ?? DEFAULT_OVERLAY.color

  function commit(next: SectionColors | undefined) {
    onChange(next && (next.preset || next.image || next.overrides) ? next : undefined)
  }

  function pick(preset: SectionColorPreset) {
    commit({ ...colors, preset })
  }

  function setImage(patch: Partial<NonNullable<SectionColors['image']>>) {
    commit({ ...colors, preset: 'image', image: { ...image, ...patch } })
  }

  function setOverride(key: SectionColorKey, hex: string | undefined) {
    const next = { ...overrides }
    if (hex) next[key] = hex
    else delete next[key]
    commit({ ...colors, overrides: Object.keys(next).length ? next : undefined })
  }

  const palette = paletteFor(colors)
  const bodyContrast = Math.min(contrast(palette.heading, palette.background), contrast(palette.text, palette.background))
  const hasPhoto = Boolean(safeImageUrl(image?.src))

  return (
    <div className="px-3 py-3 border-b border-border-subtle" data-testid="section-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p id="section-colours-title" className="text-[11px] font-semibold tracking-wide uppercase text-text-2">
          Section colours
        </p>
        <UndoRedoButtons />
      </div>

      <div
        role="radiogroup"
        aria-labelledby="section-colours-title"
        className="rounded-lg border border-border-default overflow-hidden"
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(event.key)) return
          event.preventDefault()
          const index = SECTION_PRESETS.findIndex((preset) => preset.value === selected)
          const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
          const next = SECTION_PRESETS[(index + step + SECTION_PRESETS.length) % SECTION_PRESETS.length]
          pick(next.value)
          // Focus follows the selection, as in any radio group.
          requestAnimationFrame(() =>
            document.querySelector<HTMLButtonElement>(`[data-section-preset="${next.value}"]`)?.focus(),
          )
        }}
      >
        {SECTION_PRESETS.map((preset) => {
          const active = selected === preset.value
          const swatch = paletteFor({ preset: preset.value, image })
          const isImage = preset.value === 'image'
          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              data-section-preset={preset.value}
              onClick={() => pick(preset.value)}
              title={preset.hint}
              className={`w-full flex items-center gap-3 px-2.5 py-2 text-left border-b border-border-subtle last:border-b-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                active ? 'bg-bg-3' : 'hover:bg-bg-2'
              }`}
            >
              <span
                aria-hidden="true"
                className="relative w-7 h-7 shrink-0 rounded-md border grid place-items-center text-[13px] font-medium overflow-hidden"
                style={{
                  backgroundColor: swatch.background,
                  borderColor: swatch.border,
                  color: swatch.heading,
                  backgroundImage:
                    isImage && hasPhoto
                      ? `linear-gradient(rgba(0,0,0,${opacity / 100}),rgba(0,0,0,${opacity / 100})),url("${safeImageUrl(image?.src)}")`
                      : undefined,
                  backgroundSize: 'cover',
                }}
              >
                {isImage ? <ImageIcon size={13} /> : 'A'}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[11.5px] text-text-0">{preset.label}</span>
                <span className="block text-[10px] text-text-3 truncate">{preset.hint}</span>
              </span>
              {active && <Check size={13} className="text-brand shrink-0" aria-label="Selected" />}
            </button>
          )
        })}
      </div>

      {selected === 'image' && (
        <div className="mt-2.5 space-y-2.5 rounded-lg border border-border-default bg-bg-2 p-2.5">
          <FieldRenderer
            field={{ kind: 'image', label: 'Background image' }}
            value={image?.src ?? ''}
            onChange={(value) => setImage({ src: typeof value === 'string' && value ? value : undefined })}
          />
          {!hasPhoto && (
            <p className="text-[10.5px] leading-snug text-text-3">
              Upload a photo or paste its address. Until then the section shows the overlay colour on its own.
            </p>
          )}
          <div>
            <p className="text-[10.5px] text-text-2 mb-1">Overlay colour</p>
            <HexColorField
              label="Overlay"
              value={image?.overlayColor}
              fallback={DEFAULT_OVERLAY.color}
              onChange={(hex) => setImage({ overlayColor: hex })}
              onReset={() => setImage({ overlayColor: undefined })}
              resetLabel="Reset overlay colour"
            />
          </div>
          <div>
            <label htmlFor="overlay-opacity" className="flex items-center justify-between text-[10.5px] text-text-2 mb-1">
              <span>Overlay strength</span>
              <span className="font-mono text-text-1">{opacity}%</span>
            </label>
            <input
              id="overlay-opacity"
              type="range"
              min={0}
              max={100}
              step={5}
              value={opacity}
              onChange={(event) => setImage({ overlayOpacity: Number(event.target.value) })}
              className="w-full accent-[var(--color-brand)] cursor-pointer"
              style={{ accentColor: 'var(--color-brand)' }}
            />
            <div
              aria-hidden="true"
              className="mt-1 h-2 rounded-full border border-border-default"
              style={{ background: `linear-gradient(90deg, transparent, ${overlayColor})` }}
            />
          </div>
        </div>
      )}

      <p
        role="status"
        className={`mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-snug ${bodyContrast < 4.5 ? 'text-status-yellow' : 'text-text-3'}`}
      >
        {bodyContrast < 4.5 && <AlertTriangle size={12} className="mt-px shrink-0" />}
        <span>
          {selected === 'image' ? 'Estimated text contrast' : 'Text contrast'} {bodyContrast.toFixed(1)}:1
          {bodyContrast < 4.5 ? (selected === 'image' ? ' — strengthen the overlay to make text easier to read.' : ' — hard to read; change the colours.') : ' — readable.'}
        </span>
      </p>

      <div className="mt-2.5 border border-border-default rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setCustomOpen(!customOpen)}
          aria-expanded={customOpen}
          className="w-full flex items-center justify-between px-3 py-2 bg-bg-2 hover:bg-bg-3 transition-colors text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <span className="text-[11px] font-semibold flex items-center gap-1.5">
            Custom colours
            {overrideCount > 0 && (
              <span className="rounded-full bg-brand/15 text-brand px-1.5 text-[9.5px] leading-4">{overrideCount} set</span>
            )}
          </span>
          <ChevronDown size={12} className={`text-text-3 transition-transform ${customOpen ? 'rotate-180' : ''}`} />
        </button>
        {customOpen && (
          <div className="px-3 py-2.5 space-y-2 bg-bg-1">
            <p className="text-[10.5px] leading-snug text-text-3">
              These apply to this section only. Clear one to go back to the style above.
            </p>
            {OVERRIDE_KEYS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] text-text-2 min-w-0 truncate">{label}</span>
                <HexColorField
                  compact
                  label={label}
                  value={overrides[key]}
                  fallback={palette[key]}
                  placeholder="Style colour"
                  onChange={(hex) => setOverride(key, hex)}
                  onReset={() => setOverride(key, undefined)}
                  resetLabel="Clear this custom colour"
                />
              </div>
            ))}
            {overrideCount > 0 && (
              <button
                type="button"
                onClick={() => commit({ ...colors, overrides: undefined })}
                className="text-[10.5px] text-text-3 hover:text-text-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand rounded"
              >
                Clear all custom colours
              </button>
            )}
          </div>
        )}
      </div>

      {colors && (
        <button
          type="button"
          onClick={() => commit(undefined)}
          className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-text-3 hover:text-text-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand rounded"
        >
          <RotateCcw size={10} />
          Reset to theme default
        </button>
      )}
    </div>
  )
}

/** Section colours for a block in the block editor: stored on the block, drawn from the site theme. */
export function SectionColorsPanel({ block }: { block: BlockConfig }) {
  const updateBlock = useConfigStore((s) => s.updateBlock)
  const theme = useConfigStore((s) => s.config.theme)
  return (
    <SectionColorsEditor
      value={block.colors}
      onChange={(colors) => updateBlock(block.id, { colors })}
      palette={(colors) => resolvedSectionPalette(theme, colors)}
    />
  )
}
