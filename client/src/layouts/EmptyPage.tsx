import { toast } from 'sonner'
import { LayoutTemplate, LayoutGrid, Square } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { Wireframe } from './Wireframe'
import { layoutMap, quickLayoutIds } from './layouts'
import { insertLayout } from './insert'

/**
 * What an empty page shows: how to start, in two plain choices.
 *
 *  - Start Blank: one empty section, nothing in it.
 *  - Choose Layout: the layout library, every layout an empty skeleton.
 *
 * A site made from ready-made templates (not a custom build) also keeps its "Use template" way in.
 * Nothing here puts words, pictures or a design on the page.
 */
export function EmptyPage() {
  const setLeftTab = useEditorStore((s) => s.setLeftTab)
  const setSectionPicker = useEditorStore((s) => s.setSectionPicker)
  const custom = useConfigStore((s) => s.config.buildMode === 'custom')

  const choice = 'flex flex-1 min-w-[200px] flex-col items-start gap-1 rounded-xl border border-border-default bg-bg-1 p-4 text-left transition-colors hover:border-brand'
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-14 text-center" data-testid="empty-page">
      <h3 className="text-lg font-semibold text-text-0">Start Building Your Page</h3>
      <p className="mt-1 max-w-md text-[13px] leading-relaxed text-text-3">Choose how you want to begin.</p>

      <div className="mt-6 flex w-full flex-wrap gap-3">
        <button
          type="button"
          className={choice}
          onClick={() => { insertLayout('one-column', { kind: 'gap', region: 'page', index: 0, parentId: null }); toast('Blank section added') }}
        >
          <Square size={18} className="text-brand" />
          <span className="text-[13px] font-semibold text-text-0">Start Blank</span>
          <span className="text-[11.5px] leading-snug text-text-3">Create your website manually using sections, columns and widgets.</span>
        </button>
        <button type="button" className={choice} onClick={() => setSectionPicker({ region: 'page', index: 0 })}>
          <LayoutGrid size={18} className="text-brand" />
          <span className="text-[13px] font-semibold text-text-0">Choose Layout</span>
          <span className="text-[11.5px] leading-snug text-text-3">Choose an empty structural layout and fill it with your own widgets.</span>
        </button>
        {!custom && (
          <button type="button" className={choice} onClick={() => setLeftTab('templates')}>
            <LayoutTemplate size={18} className="text-brand" />
            <span className="text-[13px] font-semibold text-text-0">Use template</span>
            <span className="text-[11.5px] leading-snug text-text-3">Start with a complete, professionally designed page.</span>
          </button>
        )}
      </div>

      <p className="mt-7 text-[11px] font-semibold uppercase tracking-wider text-text-3">Popular layouts</p>
      <div className="mt-2 grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
        {quickLayoutIds.map((id) => {
          const layout = layoutMap.get(id)!
          return (
            <button key={id} type="button" data-quick-layout={id} onClick={() => insertLayout(id, { kind: 'gap', region: 'page', index: 0, parentId: null })} className="rounded-lg border border-border-default bg-bg-1 p-1.5 text-left transition-colors hover:border-brand">
              <Wireframe rows={layout.wire} />
              <span className="mt-1 block text-[10.5px] font-medium text-text-1">{layout.label}</span>
            </button>
          )
        })}
      </div>
      <button type="button" onClick={() => setSectionPicker({ region: 'page', index: 0 })} className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline">
        View All Layouts
      </button>
    </div>
  )
}
