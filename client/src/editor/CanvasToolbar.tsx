import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Code,
  Clock,
  Eye,
  Plus,
  HelpCircle,
  Download,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useEditorStore, type Viewport } from '@/store/editorStore'
import { useConfigStore } from '@/store/configStore'
import { pathFromName } from '@/store/site-shape'
import { usePublish } from '@/builder/usePublish'
import { useAutoSave } from '@/builder/useAutoSave'
import { useProjectsStore } from '@/store/projectsStore'
import type { PageConfig } from '@/blocks/types'
import { downloadHTML } from '@/lib/export-html'
import { exportSite } from '@/builder/core'
import { buildSiteAssetsZip, downloadBlob } from '@/lib/export-assets-zip'

const viewports: { value: Viewport; icon: typeof Monitor; label: string }[] = [
  { value: 'desktop', icon: Monitor, label: 'Desktop' },
  { value: 'tablet', icon: Tablet, label: 'Tablet' },
  { value: 'mobile', icon: Smartphone, label: 'Mobile' },
]

function AddPagePopover({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, showInMenu: boolean) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [showInMenu, setShowInMenu] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, showInMenu)
    onClose()
  }

  return (
    <div className="absolute top-full left-0 mt-1 bg-bg-2 border border-border-default rounded-lg p-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 w-56">
      <div className="space-y-2">
        <div>
          <label className="block text-[10px] text-text-3 mb-0.5" htmlFor="new-page-name">
            Page name
          </label>
          <input
            id="new-page-name"
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') onClose()
            }}
            placeholder="About"
            className="w-full px-2 py-1.5 rounded border border-border-default bg-bg-3 text-text-0 text-[11.5px] outline-none focus:border-brand"
          />
          {/* The address is derived rather than asked for — one less thing to
              get wrong, and it always matches the name shown in the menu. */}
          <p className="mt-1 text-[10px] text-text-3 font-mono">
            {name.trim() ? pathFromName(name) : '/page'}
          </p>
        </div>

        <label className="flex items-center gap-1.5 text-[10.5px] text-text-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInMenu}
            onChange={(e) => setShowInMenu(e.target.checked)}
            className="accent-brand"
          />
          Show in the menu
        </label>

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full py-1.5 rounded bg-brand text-white text-[11px] font-semibold hover:bg-brand-dim transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Add page
        </button>
      </div>
    </div>
  )
}

function PageTab({ page, isActive, onClick, onRename, onDelete, canDelete }: {
  page: PageConfig
  isActive: boolean
  onClick: () => void
  onRename: (name: string) => void
  onDelete: () => void
  canDelete: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(page.name)
  const [showContext, setShowContext] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commitRename() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== page.name) onRename(trimmed)
    else setName(page.name)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={commitRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commitRename()
          if (e.key === 'Escape') { setName(page.name); setEditing(false) }
        }}
        className="px-2 py-1 rounded text-xs bg-bg-3 border border-brand outline-none w-20"
        onClick={(e) => e.stopPropagation()}
      />
    )
  }

  return (
    <div className="relative">
      <button
        onClick={onClick}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
        onContextMenu={(e) => { e.preventDefault(); setShowContext(true) }}
        className={`px-2 py-1 rounded text-xs transition-all ${
          isActive ? 'bg-bg-3 text-text-0' : 'text-text-3 hover:text-text-1 hover:bg-bg-2'
        }`}
        title={`${page.name} (${page.path})`}
      >
        {page.name}
      </button>
      {showContext && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowContext(false)} />
          <div className="absolute top-full left-0 mt-1 bg-bg-2 border border-border-default rounded-lg p-1 shadow-[0_8px_24px_rgba(0,0,0,0.4)] z-20 min-w-[100px]">
            <button
              onClick={() => { setShowContext(false); setEditing(true) }}
              className="w-full text-left px-2.5 py-1.5 rounded text-[11px] text-text-1 hover:bg-bg-3 hover:text-text-0 transition-colors"
            >
              Rename
            </button>
            {canDelete && (
              <button
                onClick={() => { setShowContext(false); onDelete() }}
                className="w-full text-left px-2.5 py-1.5 rounded text-[11px] text-text-1 hover:bg-status-red/10 hover:text-status-red transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function CanvasToolbar() {
  const navigate = useNavigate()
  const { viewport, setViewport, toggleJsonDrawer, jsonDrawerOpen, toggleHistory, togglePreview, toggleShortcutsModal, previewMode, activeProjectId } = useEditorStore()
  const { undo, redo, canUndo, canRedo } = useConfigStore()
  const undoStack = useConfigStore((s) => s.undoStack)
  const redoStack = useConfigStore((s) => s.redoStack)
  const pages = useConfigStore((s) => s.config.pages) ?? []
  const activePageId = useConfigStore((s) => s.activePageId)
  const setActivePage = useConfigStore((s) => s.setActivePage)
  const addPage = useConfigStore((s) => s.addPage)
  const removePage = useConfigStore((s) => s.removePage)
  const renamePage = useConfigStore((s) => s.renamePage)
  const projects = useProjectsStore((s) => s.projects)
  const configName = useConfigStore((s) => s.config.name)
  const config = useConfigStore((s) => s.config)
  const [showAddPage, setShowAddPage] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportingZip, setExportingZip] = useState(false)
  // Publishing is not offered from the toolbar; the live link is still shown
  // when a site has been published elsewhere.
  const { url: liveUrl } = usePublish()
  const saveState = useAutoSave()

  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null
  const projectName = activeProject?.name || configName

  async function handleExport() {
    setExporting(true)
    try {
      // Every page, not just the one on screen. Exporting the open page alone
      // handed the owner a home page whose menu pointed at About and Services
      // files that were never written.
      // The design's own photographs are carried into the page first: an
      // exported folder is served from somewhere that has no /templates path,
      // and without this they arrive as broken boxes.
      const pages = await exportSite(config, {
        settings: activeProject?.settings,
        fileLinks: true,
      })

      for (const page of pages) {
        downloadHTML(page.html, page.file)
        // Browsers drop a second download that arrives in the same instant.
        await new Promise((resolve) => setTimeout(resolve, 400))
      }

      toast(
        pages.length === 1
          ? 'HTML exported'
          : `${pages.length} pages exported — keep them in one folder`,
      )
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  async function handleExportZip() {
    setExportingZip(true)
    try {
      const blob = await buildSiteAssetsZip(config, { settings: activeProject?.settings, fileLinks: true })
      downloadBlob(blob, `${(configName || 'website').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`)
      toast('Site exported as a ZIP — index.html, other pages, and an assets folder for CSS/JS/images')
    } catch {
      toast.error('ZIP export failed')
    } finally {
      setExportingZip(false)
    }
  }

  return (
    <div className="h-10 min-w-0 overflow-hidden bg-bg-1 border-b border-border-default flex items-center px-3 gap-1">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-text-3 shrink-0">
        <span
          className="cursor-pointer hover:text-text-1 transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          Projects
        </span>
        <span>/</span>
        <span className="text-text-0 font-medium max-w-[120px] truncate">{projectName}</span>
      </div>

      <div className="w-px h-5 bg-border-default mx-1.5 shrink-0" />

      {/* Page tabs */}
      <div className="flex items-center gap-0.5 relative overflow-x-auto min-w-0 flex-1">
        {pages.map((page) => (
          <PageTab
            key={page.id}
            page={page}
            isActive={activePageId === page.id}
            onClick={() => setActivePage(page.id)}
            onRename={(name) => renamePage(page.id, name)}
            onDelete={() => removePage(page.id)}
            canDelete={pages.length > 1}
          />
        ))}
        <div className="relative">
          <button
            onClick={() => setShowAddPage(!showAddPage)}
            className="w-6 h-6 rounded flex items-center justify-center text-text-3 hover:text-brand hover:bg-bg-2 transition-all"
            title="Add page"
            aria-label="Add page"
          >
            <Plus size={12} />
          </button>
          {showAddPage && (
            <AddPagePopover
              onAdd={(name, showInMenu) => addPage(name, showInMenu)}
              onClose={() => setShowAddPage(false)}
            />
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        {/* Viewport toggle */}
        {viewports.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            title={label}
            aria-label={label}
            aria-pressed={viewport === value}
            onClick={() => setViewport(value)}
            className={`w-7 h-7 rounded flex items-center justify-center text-xs transition-all ${
              viewport === value
                ? 'bg-bg-3 text-text-0'
                : 'text-text-3 hover:text-text-1 hover:bg-bg-3'
            }`}
          >
            <Icon size={14} />
          </button>
        ))}

        <div className="w-px h-5 bg-border-default mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => {
            const label = undoStack[undoStack.length - 1]?.label
            undo()
            if (label) toast(`Undo: ${label}`, { duration: 1500 })
          }}
          disabled={!canUndo()}
          className="w-7 h-7 rounded flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          onClick={() => {
            const label = redoStack[redoStack.length - 1]?.label
            redo()
            if (label) toast(`Redo: ${label}`, { duration: 1500 })
          }}
          disabled={!canRedo()}
          className="w-7 h-7 rounded flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg-3 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </button>

        <div className="w-px h-5 bg-border-default mx-1" />

        {/* Preview toggle */}
        <button
          onClick={togglePreview}
          className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] transition-all ${
            previewMode ? 'bg-brand-glow text-brand' : 'text-text-3 hover:text-text-1 hover:bg-bg-3'
          }`}
          title="Preview (P)"
          aria-label="Toggle preview mode"
          aria-pressed={previewMode}
        >
          <Eye size={13} />
          <span className="sr-only 2xl:not-sr-only">{previewMode ? 'Back to editing' : 'Preview'}</span>
        </button>

        {/* JSON drawer toggle */}
        <button
          onClick={toggleJsonDrawer}
          className={`h-7 px-2 rounded flex items-center gap-1 text-[11px] transition-all ${
            jsonDrawerOpen ? 'bg-brand-glow text-brand' : 'text-text-3 hover:text-text-1 hover:bg-bg-3'
          }`}
          title="JSON (J)"
          aria-label="Toggle JSON drawer"
          aria-pressed={jsonDrawerOpen}
        >
          <Code size={13} />
          <span className="sr-only 2xl:not-sr-only">JSON</span>
        </button>

        {/* History */}
        <button
          onClick={toggleHistory}
          className="h-7 px-2 rounded flex items-center gap-1 text-[11px] text-text-3 hover:text-text-1 hover:bg-bg-3 transition-all"
          title="History (H)"
          aria-label="Toggle version history"
        >
          <Clock size={13} />
          <span className="sr-only 2xl:not-sr-only">History</span>
        </button>

        {/* Shortcuts help */}
        <button
          onClick={toggleShortcutsModal}
          className="w-7 h-7 rounded flex items-center justify-center text-text-3 hover:text-text-1 hover:bg-bg-3 transition-all"
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
        >
          <HelpCircle size={14} />
        </button>

        {/* Quiet, non-blocking: it says where the work stands without
            interrupting anyone mid-edit. */}
        <span
          className="hidden xl:inline text-[10.5px] text-text-3 mr-1 min-w-[54px] text-right"
          aria-live="polite"
        >
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved'
              : saveState === 'offline'
                ? 'Offline'
                : ''}
        </span>

        <div className="w-px h-5 bg-border-default mx-1" />

        <button
          onClick={handleExport}
          disabled={exporting}
          title="Download the site as a single HTML file"
          className="h-7 px-2.5 rounded-lg border border-border-default text-text-2 text-[11.5px] font-medium hover:text-text-0 hover:bg-bg-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {exporting ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
          <span className="sr-only 2xl:not-sr-only">Export</span>
        </button>

        <button
          onClick={handleExportZip}
          disabled={exportingZip}
          title="Download as a ZIP with a shared assets/css, assets/js and assets/images folder"
          className="h-7 px-2.5 rounded-lg border border-border-default text-text-2 text-[11.5px] font-medium hover:text-text-0 hover:bg-bg-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {exportingZip ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Download size={12} />
          )}
          <span className="sr-only 2xl:not-sr-only">Export ZIP</span>
        </button>

        {liveUrl && (
          <a
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={liveUrl}
            className="h-7 px-2.5 rounded-lg border border-border-default text-text-2 text-[11.5px] font-medium hover:text-text-0 hover:bg-bg-2 transition-all flex items-center gap-1.5"
          >
            <ExternalLink size={12} />
            <span className="sr-only 2xl:not-sr-only">View live</span>
          </a>
        )}

      </div>
    </div>
  )
}
