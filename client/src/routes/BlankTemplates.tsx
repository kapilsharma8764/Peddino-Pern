import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, LayoutTemplate } from 'lucide-react'
import { toast } from 'sonner'
import { templates, buildTemplate, type RealTemplate } from '@/templates/library'
import { categoryOptions } from '@/onboarding/profile'
import { categoryMatches } from '@/lib/category'
import { useBusinessStore } from '@/store/businessStore'
import { usePublishStore } from '@/store/publishStore'
import { useConfigStore } from '@/store/configStore'
import { SitePreview } from '@/builder/SitePreview'

/**
 * The widget-based layouts: this builder's own designs, built entirely from
 * its editable blocks rather than someone else's markup.
 *
 * `defaultTemplateFor(category)` (used by "Build this layout" in the wizard)
 * silently picks the first design in a category, which is fine when a
 * category has one — most do — but leaves every other design in a crowded
 * category unreachable. This page is where those extra designs live: filtered
 * by category the same way the original-design gallery is, so a category with
 * several designs actually shows all of them rather than hiding all but one.
 */

function TemplateCard({ template, onUse }: { template: RealTemplate; onUse: () => void }) {
  const pageCount = 1 + template.pages.length
  // `header`/`home` on a RealTemplate are section specs with no ids yet —
  // the same shape `buildTemplate` itself turns into real blocks — so the
  // thumbnail is built through it once, the exact way the editor will.
  const previewBlocks = useMemo(() => {
    const built = buildTemplate(template)
    return [...(built.header ?? []), ...built.blocks]
  }, [template])
  return (
    <article className="group rounded-xl overflow-hidden border border-border-default bg-bg-1 hover:border-brand/50 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300">
      <div className="relative w-full aspect-[1280/900] overflow-hidden bg-bg-2">
        {/* A live render of the design itself, not a screenshot — it can never
            go stale or point at a picture that no longer matches. */}
        <SitePreview theme={template.theme} blocks={previewBlocks} fitWidth width={1280} />
      </div>
      <div className="p-4">
        <div className="flex justify-between gap-3 items-center">
          <h2 className="font-semibold text-sm truncate">{template.name}</h2>
          <span className="text-[9px] rounded border border-border-default text-text-2 px-2 py-1 shrink-0 uppercase tracking-wider font-medium">
            {categoryOptions.find((c) => c.value === template.category)?.label ?? template.category}
          </span>
        </div>
        <p className="text-xs text-text-3 mt-2">{template.description}</p>
        <p className="text-[11px] text-text-2 mt-2">
          {pageCount} {pageCount === 1 ? 'page' : 'pages'} · Widget-based · Fully editable
        </p>
        <button
          type="button"
          onClick={onUse}
          className="w-full mt-4 flex justify-center gap-2 items-center rounded-lg bg-brand text-bg-0 py-2 text-xs font-semibold hover:bg-brand-dim transition-colors cursor-pointer"
        >
          <Check size={14} /> Use this design
        </button>
      </div>
    </article>
  )
}

export function BlankTemplates() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const profile = useBusinessStore((s) => s.profile)
  const category = params.get('category') ?? profile.category ?? 'all'

  const visible = useMemo(
    () => (category === 'all' ? templates : templates.filter((t) => categoryMatches(t.category, category))),
    [category],
  )

  function filter(value: string) {
    const next = new URLSearchParams(params)
    if (value === 'all') next.delete('category')
    else next.set('category', value)
    setParams(next, { replace: true })
  }

  function use(template: RealTemplate) {
    const config = buildTemplate(template, profile)
    usePublishStore.getState().clear()
    useConfigStore.getState().setConfig(config)
    toast(`${template.name} is ready to edit`)
    navigate('/editor')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 px-5 pt-6 pb-4 border-b border-border-default">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate('/create')} className="inline-flex items-center gap-2 text-xs text-text-2">
            <ArrowLeft size={14} /> Back to details
          </button>
          <div className="flex flex-wrap justify-between items-end gap-4 mt-4">
            <div>
              <span className="studio-eyebrow">WIDGET-BASED LAYOUTS</span>
              <h1 className="text-3xl font-semibold mt-2">Pick a design to build on.</h1>
              <p className="text-xs text-text-2 mt-2">
                {templates.length} layouts, built from this builder's own drag-and-drop widgets. Everything — text, photos,
                colours and sections — stays editable.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6" role="group" aria-label="Template category">
            <button
              aria-pressed={category === 'all'}
              onClick={() => filter('all')}
              className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-medium ${category === 'all' ? 'bg-brand text-bg-0 border-brand' : 'border-border-default text-text-2 hover:bg-bg-2'}`}
            >
              All categories <span className="opacity-60 ml-1">{templates.length}</span>
            </button>
            {categoryOptions.map((option) => {
              const count = templates.filter((t) => categoryMatches(t.category, option.value)).length
              return (
                <button
                  key={option.value}
                  aria-pressed={category === option.value}
                  onClick={() => filter(option.value)}
                  className={`shrink-0 px-3 py-2 rounded-lg border text-xs font-medium ${category === option.value ? 'bg-brand text-bg-0 border-brand' : 'border-border-default text-text-2 hover:bg-bg-2'}`}
                >
                  {option.label} <span className="opacity-60 ml-1">{count}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-text-3 mb-4" aria-live="polite">
            {visible.length ? `${visible.length} ${visible.length === 1 ? 'layout' : 'layouts'}` : 'No layouts found in this category.'}
          </p>
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border-default py-16 px-6 text-center">
              <LayoutTemplate size={28} className="mx-auto mb-3 text-text-3" />
              <p className="text-sm font-medium mb-1">No layouts found in this category</p>
              <p className="text-xs text-text-2 mb-5">Try another category, or browse the original-design gallery instead.</p>
              <div className="flex flex-wrap justify-center gap-3">
                {category !== 'all' && (
                  <button onClick={() => filter('all')} className="studio-button secondary !py-2 !px-4">
                    Browse all categories
                  </button>
                )}
                <button onClick={() => navigate('/templates')} className="studio-button !py-2 !px-4">
                  Browse original designs
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {visible.map((template) => (
                <TemplateCard key={template.id} template={template} onUse={() => use(template)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
