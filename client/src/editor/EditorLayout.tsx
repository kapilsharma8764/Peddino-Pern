import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FolderOpen, Loader2 } from 'lucide-react'
import { CanvasToolbar } from './CanvasToolbar'
import { LeftSidebar } from './LeftSidebar'
import { Canvas } from './Canvas'
import { RightSidebar } from './RightSidebar'
import { BuilderDndContext } from '@/builder/BuilderDndContext'
import { JsonDrawer } from './JsonDrawer'
import { VersionHistory } from './VersionHistory'
import { GenerationOverlay } from './GenerationOverlay'
import { useConfigStore } from '@/store/configStore'
import { useEditorStore } from '@/store/editorStore'
import { useProjectsStore } from '@/store/projectsStore'
import { usePublishStore } from '@/store/publishStore'
import { useBusinessStore } from '@/store/businessStore'
import { generateSiteConfig } from '@/lib/generate-site'
import { OriginalVisualEditor } from './OriginalVisualEditor'
import { AddSectionDialog } from '@/layouts/LayoutPanel'
import { api } from '@/lib/api'
import type { BusinessProfile } from '@/onboarding/profile'
import type { SiteConfig } from '@/blocks/types'

/**
 * What the editor shows for whoever's site this browser was last attached to
 * is kept in `localStorage` (`useConfigStore`'s `persist`), so a page the
 * editor is opened on — typed into the address bar, refreshed, reached by
 * the browser's own Back button — has to work from whatever was saved there
 * last, not from a fetch that just happened. That is fine for continuing an
 * edit, but wrong the moment it is stale: after switching to a different
 * site or template elsewhere in the same browser, or simply days later, the
 * page drawn is not necessarily the one this site's own `siteId` points to
 * any more.
 *
 * This re-fetches that site's current, saved config every time the editor
 * mounts, and shows a short loading state rather than the old one while it
 * does — the same site a moment ago is not worth flashing on screen only to
 * be replaced. Failing to reach the server (offline, or a site that no
 * longer exists) is not treated as an error here: whatever was already
 * loaded remains what is shown, exactly as opening a site from the
 * dashboard already tolerates the API being unreachable.
 */
function useSyncCurrentSite() {
  const siteId = usePublishStore((s) => s.siteId)
  const setConfig = useConfigStore((s) => s.setConfig)
  const updateProfile = useBusinessStore((s) => s.update)
  const [syncing, setSyncing] = useState(() => Boolean(siteId))

  useEffect(() => {
    if (!siteId) {
      // There is no site to sync, so this has to settle the loading state
      // directly rather than through an async callback that would never
      // otherwise run.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSyncing(false)
      return
    }
    let cancelled = false
    // Set before the fetch starts (not inside its `.then`), or switching
    // from one already-open site to another without leaving `/editor` would
    // flash the first site's stale content instead of the loading state
    // while the second site's real config is fetched.
    setSyncing(true)
    api
      .getSite(siteId)
      .then((site) => {
        if (cancelled) return
        setConfig(site.config as SiteConfig)
        if (site.profile) updateProfile(site.profile as Partial<BusinessProfile>)
      })
      .catch(() => {
        // Offline, or the site was deleted elsewhere — keep whatever this
        // browser already had rather than blocking the editor on it.
      })
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => {
      cancelled = true
    }
    // Only the identity of the site being edited should trigger a re-fetch —
    // not every keystroke that changes `config` while editing it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId])

  return syncing
}

function useGenerationOrchestration() {
  const isGenerating = useEditorStore((s) => s.isGenerating)
  const generationPrompt = useEditorStore((s) => s.generationPrompt)
  const clearGeneration = useEditorStore((s) => s.clearGeneration)
  const setGenerationError = useEditorStore((s) => s.setGenerationError)
  const activeProjectId = useEditorStore((s) => s.activeProjectId)
  const setConfig = useConfigStore((s) => s.setConfig)
  const updateProjectConfig = useProjectsStore((s) => s.updateProjectConfig)
  const renameProject = useProjectsStore((s) => s.renameProject)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!isGenerating || !generationPrompt) return

    const controller = new AbortController()
    abortRef.current = controller

    // Timeout after 30s to prevent infinite loading
    const timeout = setTimeout(() => {
      controller.abort()
      setGenerationError('Generation timed out')
      toast.error('Generation timed out. Try again or add a Gemini API key in Settings.')
      clearGeneration()
    }, 30000)

    generateSiteConfig(generationPrompt, controller.signal)
      .then(({ config, source }) => {
        clearTimeout(timeout)
        if (controller.signal.aborted) return
        setConfig(config)
        if (activeProjectId) {
          updateProjectConfig(activeProjectId, config)
          if (config.name) renameProject(activeProjectId, config.name)
        }
        clearGeneration()
        if (source === 'template') {
          toast('Generated from template. Add a Gemini API key in Settings for AI generation.')
        }
      })
      .catch((err) => {
        clearTimeout(timeout)
        if (err instanceof Error && err.name === 'AbortError') return
        setGenerationError(err instanceof Error ? err.message : 'Generation failed')
        toast.error(err instanceof Error ? err.message : 'Generation failed')
        clearGeneration()
      })

    return () => {
      clearTimeout(timeout)
      controller.abort()
      abortRef.current = null
    }
  }, [isGenerating, generationPrompt]) // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Shown when there is no site to edit yet.
 *
 * The editor used to key off a "project" record that only the old dashboard
 * created, so arriving here straight from the template gallery showed this
 * screen instead of the site the person had just chosen. It now asks the one
 * question that matters: are there any sections to draw?
 */
function EditorEmptyState() {
  const navigate = useNavigate()

  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center text-center px-6 max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-bg-3 border border-border-default flex items-center justify-center mb-4">
          <FolderOpen size={20} className="text-text-3" />
        </div>
        <h2 className="text-[16px] font-display font-semibold text-text-1 mb-1">
          Nothing to edit yet
        </h2>
        <p className="text-text-2 text-[13px] mb-6 leading-relaxed">
          Answer a few questions about your business and a site is built for you —
          it opens here ready to change.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/create')}
            className="px-5 py-2 rounded-xl bg-text-0 text-bg-0 text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            Create a website
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl border border-border-default text-text-2 text-[13px] hover:text-text-0 hover:bg-bg-2 transition-colors"
          >
            Your sites
          </button>
        </div>
      </div>
    </div>
  )
}


export function EditorLayout() {
  useGenerationOrchestration()
  const syncing = useSyncCurrentSite()
  // Whether the whole *site* is an original/imported template, not just the page
  // currently active. Checking only `config.blocks` (the active page's mirror)
  // meant switching to a page whose blocks didn't happen to match that exact
  // shape — e.g. one added through the block editor's "Add Page" — silently
  // swapped the whole editor to the block-based Canvas, which has no header or
  // footer for an original site (those live inside each page's own HTML here),
  // so the page appeared to fall back to blank/Home instead of rendering.
  const original = useConfigStore(s =>
    s.config.pages?.some(page => page.blocks.some(item => item.props.originalTemplate))
    ?? (s.config.blocks.length === 1 && Boolean(s.config.blocks[0]?.props.originalTemplate)),
  )
  const previewMode = useEditorStore((s) => s.previewMode)
  const hasSomething = useConfigStore(
    (s) =>
      // A site built from layouts is empty on purpose, and still has a page to build on.
      s.config.buildMode === 'custom' ||
      s.config.blocks.length > 0 ||
      (s.config.header?.length ?? 0) > 0 ||
      (s.config.pages?.some((page) => page.blocks.length > 0) ?? false),
  )

  if (syncing) {
    return (
      <div className="h-full flex items-center justify-center text-text-2 gap-2 text-sm">
        <Loader2 size={16} className="animate-spin" /> Opening your website…
      </div>
    )
  }

  if (!hasSomething) {
    return <EditorEmptyState />
  }

  if (original) return <OriginalVisualEditor />

  return (
    <BuilderDndContext>
    <div className="h-full flex flex-col relative">
      <div className="flex-1 flex overflow-hidden">
        {!previewMode && <LeftSidebar />}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <CanvasToolbar />
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <Canvas />
            <JsonDrawer />
            <GenerationOverlay />
          </div>
        </div>
        {!previewMode && <RightSidebar />}
      </div>
      <VersionHistory />
      <AddSectionDialog />
    </div>
    </BuilderDndContext>
  )
}
