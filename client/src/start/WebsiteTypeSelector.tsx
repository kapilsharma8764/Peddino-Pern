import { useMemo, useState } from 'react'
import * as Icons from 'lucide-react'
import { Search } from 'lucide-react'
import { useCatalog } from '@/store/catalogStore'
import { matchesTypeSearch } from './website-types'

type IconComponent = React.ComponentType<{ size?: number }>

/** Searchable cards for the kind of website. Used by both setup paths. */
export function WebsiteTypeSelector({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const websiteTypes = useCatalog((s) => s.websiteTypes)
  const shown = useMemo(() => websiteTypes.filter((type) => matchesTypeSearch(type, query)), [websiteTypes, query])

  return (
    <div>
      <div className="relative mx-auto mb-5 max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search website type..."
          aria-label="Search website type"
          className="create-input w-full"
          style={{ paddingLeft: '2.4rem' }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Website type">
        {shown.map((type) => {
          const Icon = (Icons as unknown as Record<string, IconComponent>)[type.icon] ?? Icons.LayoutGrid
          const active = value === type.id
          return (
            <button
              key={type.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-website-type={type.id}
              onClick={() => onChange(type.id)}
              className={`flex flex-col items-start gap-1.5 rounded-xl border bg-white p-4 text-left transition-colors ${active ? 'border-[#7C3AED] ring-2 ring-[#7C3AED]/15' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? 'bg-[#7C3AED] text-white' : 'bg-purple-50 text-[#7C3AED]'}`}><Icon size={18} /></span>
              <span className="text-[13.5px] font-semibold text-slate-900">{type.name}</span>
              <span className="text-[11.5px] leading-snug text-slate-500">{type.hint}</span>
            </button>
          )
        })}
      </div>
      {shown.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No type matches “{query}”. Pick “Other”.</p>}
    </div>
  )
}
