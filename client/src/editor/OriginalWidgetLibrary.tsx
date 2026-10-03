import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { blockMetadata, type BlockMeta } from '@/lib/block-metadata'
import { matchesWidgetSearch } from '@/lib/widget-search'
import { categoryIcon } from '@/widgets/library-icons'

export function OriginalWidgetLibrary({ onAdd, mode = 'elements' }: { onAdd: (meta: BlockMeta) => void; mode?: 'elements' | 'sections' }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const sectionTypes = new Set(['hero','features','pricing','cta','footer','testimonials','stats','faq','team','contact','newsletter','logocloud','banner','gallery','products','slider','content','chart','map','hours'])
  const available = blockMetadata.filter(meta => mode === 'sections' ? sectionTypes.has(meta.type) : !sectionTypes.has(meta.type))
  const choices = mode === 'sections' ? available.flatMap(meta=>meta.variants.map(variant=>({...meta, label:meta.variants.length>1 ? `${meta.label} / ${variant}` : meta.label,variants:[variant]}))) : available
  const filtered = choices.filter(meta => (!category || meta.category === category) && matchesWidgetSearch(meta, search))
  return <div className="original-widget-library">
    <h2>{mode === 'sections' ? 'Sections' : 'Elements'} <span>{choices.length}</span></h2>
    <p>Add a section to your live website preview.</p>
    <label className="widget-search"><Search size={16} /><input aria-label="Search widgets" placeholder="Search widgets�" value={search} onChange={e => setSearch(e.target.value)} /></label>
    <select aria-label="Widget category" value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{[...new Set(available.map(meta => meta.category))].map(name => <option key={name}>{name}</option>)}</select>
    <div className="widget-results" aria-live="polite">{filtered.length} widgets</div>
    <div className="original-widget-grid">{filtered.map(meta => { const Icon = categoryIcon(meta.category); return <button key={`${meta.type}-${meta.variants[0]}`} title={meta.description} onClick={() => onAdd(meta)}><Icon size={20} /><strong>{meta.label}</strong><small>{meta.category}</small><Plus size={13} /></button> })}</div>
    {!filtered.length && <p>No widgets found. Try a different search.</p>}
  </div>
}

