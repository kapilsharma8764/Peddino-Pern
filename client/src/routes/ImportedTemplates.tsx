import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { importedTemplates, type ImportedTemplate } from '@/lib/imported-library'
import { initBuilder } from '@/builder/core'
import { usePublishStore } from '@/store/publishStore'
import { api } from '@/lib/api'

export function ImportedTemplates({ query }: { query: string }) {
  const [templates, setTemplates] = useState<ImportedTemplate[]>([])
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  useEffect(() => { void importedTemplates().then(setTemplates).catch(() => undefined) }, [])
  const visible = templates.filter(template => template.name.toLowerCase().includes(query.toLowerCase()))
  if (!visible.length) return null
  async function open(template: ImportedTemplate) {
    setBusy(true)
    const config = initBuilder(structuredClone(template.config))
    usePublishStore.getState().clear()
    try { const site = await api.createSite({ name: config.name, config }); usePublishStore.getState().setSite(site.id) }
    catch { toast('Opened locally. Sign in to save this copy online.') }
    finally { setBusy(false) }
    navigate('/editor')
  }
  return <section className="max-w-6xl mx-auto p-5" aria-label="Imported templates">
    <h2 className="font-semibold mb-3">Your imported templates ({visible.length})</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{visible.map(template => <article key={template.id} className="border border-border-default rounded-xl overflow-hidden">
      <div className="relative h-48 overflow-hidden bg-white"><iframe title={`${template.name} import preview`} sandbox="" srcDoc={String(template.config.pages?.[0]?.blocks[0]?.props.html ?? '')} className="pointer-events-none origin-top-left border-0" style={{ width: 1200, height: 800, transform: 'scale(.3)' }} /></div>
      <div className="p-3"><h3>{template.name}</h3><p className="text-xs my-2">{template.config.pages?.length ?? 1} pages · Imported HTML · Saved in this browser</p>
      <button className="studio-button" disabled={busy} onClick={() => void open(template)}>Use this import</button></div>
    </article>)}</div>
  </section>
}
