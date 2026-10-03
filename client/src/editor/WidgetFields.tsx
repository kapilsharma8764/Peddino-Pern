import { useState } from 'react'

function ValueField({ label, value, onChange }: { label: string; value: unknown; onChange: (value: unknown) => void }) {
  const [draft, setDraft] = useState(String(value ?? ''))
  if (typeof value === 'boolean') return <label className="visual-checkbox"><input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} />{label}</label>
  if (Array.isArray(value)) return <details open><summary>{label} ({value.length})</summary>{value.map((item, index) => <ValueField key={index} label={`Item ${index + 1}`} value={item} onChange={next => onChange(value.map((existing, i) => i === index ? next : existing))} />)}</details>
  if (value && typeof value === 'object') return <details open><summary>{label}</summary><WidgetFields values={value as Record<string, unknown>} onChange={onChange} /></details>
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const commit = () => { if (draft !== String(value)) { if (typeof value === 'number') { const number = Number(draft); if (Number.isFinite(number)) onChange(number) } else onChange(draft) } }
  return <label className="visual-field"><span>{label}</span><input value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} /></label>
}

export function WidgetFields({ values, onChange }: { values: Record<string, unknown>; onChange: (values: Record<string, unknown>) => void }) {
  return <div className="widget-property-fields">{Object.entries(values).map(([key, value]) => <ValueField key={`${key}-${JSON.stringify(value)}`} label={key.replace(/([A-Z])/g, ' $1')} value={value} onChange={next => onChange({ ...values, [key]: next })} />)}</div>
}
