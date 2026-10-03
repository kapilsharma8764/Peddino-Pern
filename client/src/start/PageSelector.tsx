import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { pageChoices } from './starter-designs'

/** Home is always there. Everything else is ticked or not, and a page of your own can be added. */
export function PageSelector({ value, onChange }: { value: string[]; onChange: (pages: string[]) => void }) {
  const [draft, setDraft] = useState('')
  // Any page already chosen but not in the standard list is a custom one, so it can still be unticked.
  const options = [...pageChoices, ...value.filter((page) => !(pageChoices as readonly string[]).includes(page))]

  function toggle(page: string) {
    onChange(value.includes(page) ? value.filter((entry) => entry !== page) : [...value, page])
  }
  function addCustom() {
    const name = draft.trim().slice(0, 40)
    if (!name) return
    if (!options.some((page) => page.toLowerCase() === name.toLowerCase())) onChange([...value, name])
    setDraft('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Pages">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#7C3AED] bg-purple-50 px-4 text-[13px] font-medium text-[#7C3AED]" aria-label="Home (always included)"><Check size={13} />Home</span>
        {options.map((page) => {
          const active = value.includes(page)
          return (
            <button
              key={page}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(page)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition-colors ${active ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {active && <Check size={13} />}{page}
            </button>
          )
        })}
      </div>
      <div className="mt-5 flex max-w-md gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }}
          placeholder="Add your own page, e.g. Events"
          aria-label="Custom page name"
          className="create-input flex-1"
        />
        <button type="button" onClick={addCustom} disabled={!draft.trim()} className="create-btn create-btn-ghost-accent inline-flex items-center gap-1 disabled:opacity-40"><Plus size={14} />Add page</button>
      </div>
    </div>
  )
}
