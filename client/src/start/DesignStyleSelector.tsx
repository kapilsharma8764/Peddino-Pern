import { Check } from 'lucide-react'
import { themePresets } from '@/lib/theme-presets'
import { starterDesigns, type StarterDesign } from './starter-designs'

/** A miniature of the design in its own colours: header, hero, then its sections. */
function DesignThumb({ design }: { design: StarterDesign }) {
  const theme = themePresets.find((preset) => preset.id === design.preset)?.theme
  const bg = theme?.bg0 ?? '#ffffff'
  const surface = theme?.bg2 ?? '#f1f5f9'
  const accent = theme?.accent ?? '#7c3aed'
  const text = theme?.text0 ?? '#111827'
  const line = (w: string, o = 0.5) => <span className="block h-[3px] rounded" style={{ width: w, background: text, opacity: o }} />

  if (design.blank) {
    return (
      <div className="grid h-28 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-[11px] font-medium text-slate-400" aria-hidden="true">Empty page</div>
    )
  }
  return (
    <div className="flex h-28 flex-col gap-1 overflow-hidden rounded-lg border border-slate-200 p-1.5" style={{ background: bg }} aria-hidden="true">
      <div className="flex items-center justify-between rounded-sm px-1 py-[3px]" style={{ background: surface }}>
        <span className="h-1.5 w-5 rounded-sm" style={{ background: accent }} />
        <span className="flex gap-0.5">{[0, 1, 2].map((n) => <span key={n} className="h-[3px] w-3 rounded" style={{ background: text, opacity: 0.4 }} />)}</span>
      </div>
      <div className={`flex gap-1 rounded-sm p-1 ${design.hero === 'centered' || design.hero === 'minimal' ? 'flex-col items-center' : 'items-center'}`} style={{ background: design.hero === 'gradient' ? accent : surface }}>
        <span className="flex flex-1 flex-col gap-0.5">{line('70%', 0.8)}{line('45%', 0.4)}<span className="mt-0.5 block h-1.5 w-5 rounded-sm" style={{ background: design.hero === 'gradient' ? bg : accent }} /></span>
        {(design.hero === 'split' || design.hero === 'photo') && <span className="h-8 w-9 rounded-sm" style={{ background: accent, opacity: 0.35 }} />}
      </div>
      <div className="grid flex-1 grid-cols-3 gap-1">
        {[0, 1, 2].map((n) => <span key={n} className="rounded-sm" style={{ background: surface }} />)}
      </div>
    </div>
  )
}

/** The 12 starting designs for "Create a site". Recommended ones for the chosen type come first. */
export function DesignStyleSelector({ value, onChange, recommended }: { value: string | null; onChange: (id: string) => void; recommended: string[] }) {
  const ordered = [...starterDesigns].sort((a, b) => {
    if (a.blank !== b.blank) return a.blank ? 1 : -1
    const ra = recommended.indexOf(a.id), rb = recommended.indexOf(b.id)
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb)
  })
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Starting design">
      {ordered.map((design) => {
        const active = value === design.id
        const suggested = recommended.includes(design.id)
        return (
          <button
            key={design.id}
            type="button"
            role="radio"
            aria-checked={active}
            data-design={design.id}
            onClick={() => onChange(design.id)}
            className={`relative flex flex-col gap-3 rounded-xl border bg-white p-3 text-left transition-colors ${active ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/15' : 'border-slate-200 hover:border-slate-300'}`}
          >
            {active && <span className="absolute right-4 top-4 z-10 grid h-5 w-5 place-items-center rounded-full bg-[#7C3AED] text-white"><Check size={12} strokeWidth={3} /></span>}
            <DesignThumb design={design} />
            <div>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-900">
                {design.name}
                {suggested && !design.blank && <span className="rounded-full bg-purple-50 px-2 py-px text-[10px] font-semibold text-[#7C3AED]">Suggested</span>}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500">{design.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
