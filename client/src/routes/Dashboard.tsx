import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ExternalLink,
  Globe,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { api, API_URL, ApiError, type SiteSummary } from '@/lib/api'
import { useSitesStore } from '@/store/sitesStore'
import { SitePreview } from '@/builder/SitePreview'
import { useConfigStore } from '@/store/configStore'
import { useBusinessStore } from '@/store/businessStore'
import { usePublishStore } from '@/store/publishStore'
import type { SiteConfig } from '@/blocks/types'
import type { BusinessProfile } from '@/onboarding/profile'
import { useScrollReveal } from '@/lib/useScrollReveal'
import { WorkspaceMetrics } from '@/components/WorkspaceMetrics'

/**
 * Every site this installation has saved.
 *
 * Reads from the server rather than from the browser, so the list is the same
 * one that publishing writes to — a site shown here can always be opened,
 * republished, or visited.
 */

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * One saved site. A separate component, like the design gallery's card, so
 * each one can hold the scroll-reveal hook and fade in on its own as it
 * scrolls into view rather than all at once.
 */
function SiteCard({
  site,
  busy,
  index,
  onOpen,
  onRemove,
}: {
  site: SiteSummary
  busy: boolean
  index: number
  onOpen: (site: SiteSummary) => void
  onRemove: (site: SiteSummary) => void
}) {
  const { ref, isRevealed } = useScrollReveal()
  const stagger = `reveal-d${(index % 6) + 1}`

  return (
    <div ref={ref} className={isRevealed ? 'scroll-revealed' : ''}>
      <div
        className={`workspace-site-card reveal-fade-up ${stagger} rounded-xl border border-border-default bg-bg-1 flex flex-col transition-all overflow-hidden`}
      >
        <div className="relative h-36 border-b border-border-default">
          <SitePreview
            theme={site.preview?.theme}
            blocks={[...(site.preview?.header ?? []), ...(site.preview?.blocks ?? [])]}
          />
        </div>

        <div className="p-4 flex flex-col gap-3 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-[13.5px] font-semibold text-text-0 truncate">{site.name}</h2>
              <p className="mt-0.5 text-[11.5px] text-text-3">
                {site.sectionCount} section{site.sectionCount === 1 ? '' : 's'} · updated{' '}
                {formatDate(site.updatedAt)}
                {site.published && ` · ${(site.views ?? 0).toLocaleString()} visit${site.views === 1 ? '' : 's'}`}
              </p>
            </div>
            <span
              className={`shrink-0 px-1.5 py-0.5 rounded-full border text-[9.5px] font-medium ${
                site.published
                  ? 'bg-status-green/15 text-status-green border-status-green/30'
                  : 'bg-bg-3 text-text-3 border-border-default'
              }`}
            >
              {site.published ? 'Live' : 'Draft'}
            </span>
          </div>

          {site.published && site.slug && (
            <a
              href={`${API_URL}/site/${site.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11.5px] text-brand hover:text-brand-dim transition-colors truncate"
            >
              <ExternalLink size={11} className="shrink-0" />
              /site/{site.slug}
            </a>
          )}

          <div className="mt-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpen(site)}
              disabled={busy}
              className="flex-1 h-8 rounded-lg bg-bg-3 text-text-0 text-[12px] font-medium hover:bg-bg-4 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Pencil size={11} />
              Edit
            </button>
            <button
              type="button"
              onClick={() => onRemove(site)}
              aria-label={`Delete ${site.name}`}
              className="h-8 w-8 rounded-lg border border-border-default text-text-3 hover:text-status-red hover:border-status-red/40 transition-colors grid place-items-center"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const sites = useSitesStore((s) => s.sites)
  const error = useSitesStore((s) => s.error)
  const busy = useSitesStore((s) => s.busy)
  const load = useSitesStore((s) => s.load)
  const refresh = useSitesStore((s) => s.refresh)
  const removeSite = useSitesStore((s) => s.remove)
  const unowned = useSitesStore((s) => s.unowned)
  const claim = useSitesStore((s) => s.claim)
  const setBusy = useSitesStore((s) => s.setBusy)

  const setConfig = useConfigStore((s) => s.setConfig)
  const updateProfile = useBusinessStore((s) => s.update)
  const setSite = usePublishStore((s) => s.setSite)
  const setPublished = usePublishStore((s) => s.setPublished)
  const clearPublish = usePublishStore((s) => s.clear)

  useEffect(() => {
    void load()
  }, [load])

  async function open(site: SiteSummary) {
    setBusy(true)
    try {
      const full = await api.getSite(site.id)
      setConfig(full.config as SiteConfig)
      if (full.profile) updateProfile(full.profile as Partial<BusinessProfile>)

      clearPublish()
      setSite(full.id)
      if (full.slug && full.published) {
        setPublished({
          slug: full.slug,
          url: `${API_URL}/site/${full.slug}`,
          publishedAt: full.publishedAt ?? '',
        })
      }
      navigate('/editor')
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not open that site')
    } finally {
      setBusy(false)
    }
  }

  async function remove(site: SiteSummary) {
    try {
      await removeSite(site.id)
      toast(`${site.name} deleted`)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not delete that site')
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="workspace-page-header shrink-0 px-6 pt-7 pb-4 border-b border-border-default">
        <div className="max-w-5xl mx-auto flex flex-wrap items-end justify-between gap-4">
          <div className="hero-in" style={{ '--hero-delay': '0ms' } as React.CSSProperties}>
            <span className="workspace-eyebrow">YOUR CREATIVE WORKSPACE</span>
            <h1 className="text-xl font-bold tracking-tight text-text-0 font-display">Your sites</h1>
            <p className="mt-1 text-[12.5px] text-text-2">
              {sites === null
                ? 'Loading…'
                : sites.length === 0
                  ? 'A new home for your ideas. Create your first website to get started.'
                  : `${sites.length} site${sites.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <div className="workspace-actions flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy}
              className="h-8 px-2.5 rounded-lg border border-border-default text-text-2 text-[12px] hover:text-text-0 hover:bg-bg-2 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw size={12} className={busy ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate('/create')}
              className="workspace-primary h-8 px-3 rounded-lg bg-text-0 text-bg-0 text-[12.5px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <Plus size={13} />
              New website
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {sites !== null && !error && <WorkspaceMetrics items={[{ label: 'Total websites', value: sites.length }, { label: 'Published', value: sites.filter((site) => site.published).length }, { label: 'Drafts', value: sites.filter((site) => !site.published).length }]} />}
          {/* Sites saved before accounts existed. Offered rather than taken:
              attaching someone's work to the first account to sign up is the
              kind of guess that is wrong exactly when it matters. */}
          {unowned > 0 && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3">
              <p className="text-[12.5px] text-text-1">
                {unowned} site{unowned === 1 ? '' : 's'} on this computer {unowned === 1 ? 'is' : 'are'}{' '}
                not attached to any account yet.
              </p>
              <button
                type="button"
                onClick={() => {
                  void claim().then((claimed) =>
                    toast(`${claimed} site${claimed === 1 ? '' : 's'} added to your account`),
                  )
                }}
                className="h-8 px-3 rounded-lg bg-brand text-white text-[12px] font-semibold hover:bg-brand-dim transition-colors"
              >
                Add {unowned === 1 ? 'it' : 'them'} to my account
              </button>
            </div>
          )}

          {sites === null ? (
            <div className="py-24 text-center text-text-3">
              <Loader2 size={18} className="mx-auto animate-spin" />
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-[13px] text-status-red">{error}</p>
              <p className="mt-2 text-[12px] text-text-3">
                We could not load your websites. Please try Refresh in a moment.
              </p>
            </div>
          ) : sites.length === 0 ? (
            <div className="workspace-empty py-20 text-center">
              <Globe size={20} className="mx-auto text-text-3" />
              <h2>No sites yet</h2><p>Start with a template or a blank canvas. Your saved websites will appear here, ready to edit and publish.</p>
              <button
                type="button"
                onClick={() => navigate('/create')}
                className="workspace-primary mt-4 h-9 px-4 rounded-xl bg-text-0 text-bg-0 text-[12.5px] font-semibold hover:opacity-90 transition-opacity"
              >
                Create your first website
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sites.map((site, index) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  busy={busy}
                  index={index}
                  onOpen={(target) => void open(target)}
                  onRemove={(target) => void remove(target)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
