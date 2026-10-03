import { useMemo, useState } from 'react'
import { Check, LayoutTemplate, Undo2 } from 'lucide-react'
import { useConfigStore } from '@/store/configStore'
import { ensurePages } from '@/store/site-shape'
import { templates, toBlocks } from '@/templates/library'
import type { BlockConfig } from '@/blocks/types'

interface LayoutOption {
  key: string
  sourceName: string
  blocks: BlockConfig[]
}

/**
 * Lets someone swap just the open page's body for a different pre-made
 * layout, without touching the header, footer, theme or any other page —
 * the "change this page's design" panel the rest of the editor doesn't have.
 *
 * Alternate layouts are sourced from the template library's own pages: for
 * "Home" that's every template's home section set, for a named page (About,
 * Contact, …) it's every template's page of a matching name. There is no
 * separate "Layout 1/2/3" content to author — the 170+ real templates already
 * in the library are the layout catalogue.
 */
export function PageTemplatePanel() {
  const activePageId = useConfigStore((s) => s.activePageId)
  const config = useConfigStore((s) => s.config)
  const setPageBlocks = useConfigStore((s) => s.setPageBlocks)
  const undo = useConfigStore((s) => s.undo)
  const canUndo = useConfigStore((s) => s.canUndo())
  const [query, setQuery] = useState('')

  const pages = ensurePages(config)
  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0]
  const isHome = pages[0]?.id === activePage?.id

  const options = useMemo<LayoutOption[]>(() => {
    if (!activePage) return []
    const wanted = activePage.name.trim().toLowerCase()
    const siteName = config.name.trim().toLowerCase()
    const out: LayoutOption[] = []
    for (const template of templates) {
      // Offering the site's own originating template back as an "alternate"
      // is a same-as-current no-op that only confuses the list.
      if (siteName && template.name.trim().toLowerCase() === siteName) continue
      if (isHome) {
        if (template.home.length === 0) continue
        out.push({ key: `${template.id}:home`, sourceName: template.name, blocks: toBlocks(template.home) })
        continue
      }
      const match = template.pages.find((page) => {
        const name = page.name.trim().toLowerCase()
        return name === wanted || name.includes(wanted) || wanted.includes(name)
      })
      if (match) out.push({ key: `${template.id}:${match.path}`, sourceName: `${template.name} — ${match.name}`, blocks: toBlocks(match.sections) })
    }
    return out
  }, [activePage, isHome, config.name])

  const filtered = query.trim()
    ? options.filter((o) => o.sourceName.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  if (!activePage) return null

  return (
    <div className="px-3.5 py-3.5">
      <div className="flex items-center gap-2 mb-1">
        <LayoutTemplate size={14} className="text-text-3" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">Page layout — {activePage.name}</span>
      </div>
      <p className="text-[11px] text-text-3 mb-3 leading-relaxed">
        Replace this page's sections with a different ready-made layout. Header, footer, theme colours and every other page stay exactly as they are.
      </p>

      {options.length > 5 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search layouts…"
          className="w-full h-8 px-2.5 mb-2.5 rounded-md border border-border-default bg-bg-2 text-xs outline-none focus:border-brand"
        />
      )}

      {filtered.length === 0 ? (
        <p className="text-xs text-text-3 py-4 text-center">
          No alternate "{activePage.name}" layouts found in the template library yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[420px] overflow-y-auto">
          {filtered.slice(0, 40).map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setPageBlocks(activePage.id, option.blocks)}
              className="flex items-center justify-between gap-2 text-left px-2.5 py-2 rounded-md border border-border-default bg-bg-2 hover:border-brand hover:bg-bg-3 transition-colors"
            >
              <span className="text-xs text-text-1 truncate">{option.sourceName}</span>
              <Check size={13} className="text-text-3 shrink-0" />
            </button>
          ))}
        </div>
      )}

      {canUndo && (
        <button
          type="button"
          onClick={() => undo()}
          className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-text-3 hover:text-text-1"
        >
          <Undo2 size={12} /> Undo last change
        </button>
      )}
    </div>
  )
}
