import { useId, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { normalizeHex } from '@/lib/color'

/**
 * One colour: a swatch that opens the picker, a HEX box, and a way back.
 *
 * The HEX box keeps its own draft while it is being typed in, and only commits
 * once the text is a real colour (`#abc`, `#aabbcc` or either without the `#`).
 * A box bound straight to the stored value cannot be typed into — every
 * half-finished entry is invalid and gets snapped back — which is how the old
 * colour boxes behaved.
 */
export function HexColorField({
  label,
  value,
  fallback = '#000000',
  onChange,
  onReset,
  resetLabel = 'Reset',
  placeholder,
  compact = false,
}: {
  label: string
  /** The colour set here; empty or undefined means "not set". */
  value: string | undefined
  /** What to show when nothing is set — the colour actually in force. */
  fallback?: string
  onChange: (hex: string) => void
  /** When given, a reset button appears while `value` is set. */
  onReset?: () => void
  resetLabel?: string
  placeholder?: string
  compact?: boolean
}) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const shown = normalizeHex(value) ?? normalizeHex(fallback) ?? '#000000'
  const text = draft ?? (value ? shown : '')
  const invalid = draft !== null && draft !== '' && !normalizeHex(draft)

  return (
    <div className="flex items-center gap-1.5">
      <input
        id={id}
        type="color"
        value={shown}
        onChange={(event) => {
          setDraft(null)
          onChange(event.target.value)
        }}
        aria-label={`${label} colour`}
        title={`${label} — click to pick a colour`}
        className={`${compact ? 'w-6 h-6' : 'w-7 h-7'} shrink-0 rounded-md border cursor-pointer p-0.5 bg-bg-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${
          value ? 'border-border-default' : 'border-dashed border-border-hover'
        }`}
      />
      <input
        type="text"
        inputMode="text"
        spellCheck={false}
        maxLength={7}
        value={text}
        placeholder={placeholder ?? shown}
        aria-label={`${label} HEX value`}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          const hex = normalizeHex(next)
          if (hex && hex !== normalizeHex(value)) onChange(hex)
        }}
        onBlur={() => setDraft(null)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
          if (event.key === 'Escape') setDraft(null)
        }}
        className={`w-[74px] px-1.5 py-1 rounded-md border bg-bg-2 text-text-1 text-[10.5px] font-mono outline-none focus:border-brand ${
          invalid ? 'border-status-red' : 'border-border-default'
        }`}
      />
      {onReset && value && (
        <button
          type="button"
          onClick={() => {
            setDraft(null)
            onReset()
          }}
          title={resetLabel}
          aria-label={`${resetLabel}: ${label}`}
          className="p-1 rounded text-text-3 hover:text-text-0 hover:bg-bg-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  )
}
