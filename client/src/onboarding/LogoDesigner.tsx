import { useMemo, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import {
  LOGO_FONTS,
  LOGO_PALETTES,
  defaultDesign,
  initialsFrom,
  logoDataUrl,
  type LogoDesign,
  type LogoLayout,
  type LogoShape,
} from './logo-maker'

/**
 * Making a logo out of the business name.
 *
 * Most small businesses have no logo file, and being asked to upload one is
 * where the flow used to stop. This makes a plain, decent one from the name
 * they have already typed — six choices, each shown live, and nothing that
 * needs a designer's vocabulary to answer.
 */

const LAYOUTS: { value: LogoLayout; label: string }[] = [
  { value: 'markLeft', label: 'Mark beside the name' },
  { value: 'markAbove', label: 'Mark above the name' },
  { value: 'nameOnly', label: 'Name only' },
  { value: 'markOnly', label: 'Mark only' },
]

const SHAPES: { value: LogoShape; label: string }[] = [
  { value: 'circle', label: 'Circle' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'none', label: 'No shape' },
]

function Choice({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`px-2.5 py-1.5 rounded-lg border text-[11.5px] transition-colors ${
        selected
          ? 'border-brand bg-brand/10 text-text-0'
          : 'border-border-default bg-bg-2 text-text-2 hover:text-text-0 hover:border-border-hover'
      }`}
    >
      {label}
    </button>
  )
}

export function LogoDesigner({
  businessName,
  onUse,
  onCancel,
}: {
  businessName: string
  /** Hands back the wide logo and the square mark for the favicon. */
  onUse: (logo: string, square: string) => void
  onCancel: () => void
}) {
  const [design, setDesign] = useState<LogoDesign>(() => defaultDesign(businessName))

  const set = (patch: Partial<LogoDesign>) => setDesign((current) => ({ ...current, ...patch }))

  const preview = useMemo(() => logoDataUrl(design), [design])
  const squarePreview = useMemo(() => logoDataUrl(design, true), [design])

  return (
    <div className="rounded-xl border border-border-default bg-bg-2 p-4">
      {/* Shown on both a light and a dark ground, because a logo that only
          works on one is a logo that will look wrong somewhere. */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg bg-white grid place-items-center py-6 px-4">
          <img src={preview} alt="Logo preview on white" className="max-h-14 max-w-full" />
        </div>
        <div className="rounded-lg bg-[#111] grid place-items-center py-6 px-4">
          <img src={preview} alt="Logo preview on black" className="max-h-14 max-w-full" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[11px] text-text-2 mb-1.5 font-medium">Letters in the mark</p>
          <div className="flex items-center gap-2">
            <input
              value={design.initials}
              maxLength={3}
              onChange={(event) => set({ initials: event.target.value.toUpperCase() })}
              aria-label="Letters in the mark"
              className="w-16 px-2 py-1.5 rounded-lg border border-border-default bg-bg-3 text-text-0 text-[13px] text-center font-semibold outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={() => set({ initials: initialsFrom(businessName) })}
              className="flex items-center gap-1 text-[11px] text-text-3 hover:text-text-0 transition-colors"
            >
              <RefreshCw size={10} />
              From the name
            </button>
          </div>
        </div>

        <div>
          <p className="text-[11px] text-text-2 mb-1.5 font-medium">Arrangement</p>
          <div className="flex flex-wrap gap-1.5">
            {LAYOUTS.map((option) => (
              <Choice
                key={option.value}
                label={option.label}
                selected={design.layout === option.value}
                onClick={() => set({ layout: option.value })}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-text-2 mb-1.5 font-medium">Shape behind the letters</p>
          <div className="flex flex-wrap gap-1.5">
            {SHAPES.map((option) => (
              <Choice
                key={option.value}
                label={option.label}
                selected={design.shape === option.value}
                onClick={() => set({ shape: option.value })}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-text-2 mb-1.5 font-medium">Colour</p>
          <div className="flex flex-wrap gap-1.5">
            {LOGO_PALETTES.map((palette) => {
              const selected = design.background === palette.background
              return (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() =>
                    set({ background: palette.background, foreground: palette.foreground })
                  }
                  title={palette.name}
                  aria-label={palette.name}
                  aria-pressed={selected}
                  className={`w-7 h-7 rounded-full grid place-items-center border-2 transition-all ${
                    selected ? 'border-brand scale-110' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: palette.background }}
                >
                  {selected && <Check size={12} style={{ color: palette.foreground }} />}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-text-2 mb-1.5 font-medium">Font</p>
          <div className="flex flex-wrap gap-1.5">
            {LOGO_FONTS.map((font) => (
              <Choice
                key={font.name}
                label={font.name}
                selected={design.font === font.stack}
                onClick={() => set({ font: font.stack })}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-1.5 text-[11.5px] text-text-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={design.bold}
              onChange={(event) => set({ bold: event.target.checked })}
              className="accent-brand"
            />
            Bold name
          </label>

          <label className="flex items-center gap-2 text-[11.5px] text-text-2">
            Letter spacing
            <input
              type="range"
              min={0}
              max={0.3}
              step={0.05}
              value={design.tracking}
              onChange={(event) => set({ tracking: Number(event.target.value) })}
              aria-label="Letter spacing"
              className="accent-brand w-24"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-text-3">Square mark</span>
          <div className="w-8 h-8 rounded-md bg-white grid place-items-center">
            <img src={squarePreview} alt="Square mark preview" className="w-7 h-7" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-[12px] text-text-3 hover:text-text-0 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onUse(logoDataUrl(design), logoDataUrl(design, true))}
            className="px-4 py-1.5 rounded-lg bg-brand text-white text-[12px] font-semibold hover:bg-brand-dim transition-colors"
          >
            Use this logo
          </button>
        </div>
      </div>
    </div>
  )
}
