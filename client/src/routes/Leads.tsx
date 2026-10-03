import { useEffect, useMemo, useState } from 'react'
import { Download, Inbox, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Lead } from '@/lib/api'
import { useLeadsStore } from '@/store/leadsStore'
import { WorkspaceMetrics } from '@/components/WorkspaceMetrics'

/**
 * The enquiry inbox.
 *
 * Everything a published contact form collects lands here, newest first, with
 * a status the owner can move along as they work through it. Deliberately a
 * table rather than a pipeline: at this size the useful question is "who has
 * written in and have I called them back", not "what stage is this deal at".
 */

const STATUSES: { value: Lead['status']; label: string; className: string }[] = [
  { value: 'new', label: 'New', className: 'bg-brand/15 text-brand border-brand/30' },
  { value: 'contacted', label: 'Contacted', className: 'bg-status-yellow/15 text-status-yellow border-status-yellow/30' },
  { value: 'won', label: 'Won', className: 'bg-status-green/15 text-status-green border-status-green/30' },
  { value: 'lost', label: 'Lost', className: 'bg-bg-4 text-text-3 border-border-default' },
]

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Builds a CSV the owner can open in Excel. */
function toCsv(leads: Lead[]): string {
  const escape = (value: string) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const header = ['Received', 'Name', 'Phone', 'Email', 'Message', 'Status']
  const rows = leads.map((lead) =>
    [
      new Date(lead.createdAt).toLocaleString(),
      lead.name,
      lead.phone,
      lead.email,
      lead.message,
      lead.status,
    ]
      .map(escape)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

export function Leads() {
  const [search, setSearch] = useState('')
  const leads = useLeadsStore((s) => s.leads)
  const error = useLeadsStore((s) => s.error)
  const refreshing = useLeadsStore((s) => s.refreshing)
  const load = useLeadsStore((s) => s.load)
  const refresh = useLeadsStore((s) => s.refresh)
  const setStatusInStore = useLeadsStore((s) => s.setStatus)
  const removeInStore = useLeadsStore((s) => s.remove)

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    if (!leads) return []
    const query = search.trim().toLowerCase()
    if (!query) return leads
    return leads.filter((lead) =>
      [lead.name, lead.phone, lead.email, lead.message]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [leads, search])

  async function setStatus(lead: Lead, status: Lead['status']) {
    try {
      await setStatusInStore(lead.id, status)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not save that change')
    }
  }

  async function removeLead(lead: Lead) {
    try {
      await removeInStore(lead.id)
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not delete that enquiry')
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(visible)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const newCount = leads?.filter((lead) => lead.status === 'new').length ?? 0

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="workspace-page-header shrink-0 px-6 pt-7 pb-4 border-b border-border-default">
        <div className="max-w-5xl mx-auto flex flex-wrap items-end justify-between gap-4">
          <div className="hero-in" style={{ '--hero-delay': '0ms' } as React.CSSProperties}>
            <span className="workspace-eyebrow">KEEP THE CONVERSATION GOING</span>
            <h1 className="text-xl font-bold tracking-tight text-text-0 font-display">Enquiries</h1>
            <p className="mt-1 text-[12.5px] text-text-2">
              {leads === null
                ? 'Loading…'
                : leads.length === 0
                  ? 'Nothing yet — enquiries from your published site arrive here.'
                  : `${leads.length} total${newCount ? `, ${newCount} new` : ''}`}
            </p>
          </div>

          <div className="workspace-actions flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search enquiries"
                aria-label="Search enquiries"
                className="w-52 pl-8 pr-3 py-1.5 rounded-lg border border-border-default bg-bg-2 text-text-0 text-[12.5px] outline-none focus:border-brand placeholder:text-text-3"
              />
            </div>

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={refreshing}
              className="h-8 px-2.5 rounded-lg border border-border-default text-text-2 text-[12px] hover:text-text-0 hover:bg-bg-2 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={visible.length === 0}
              className="h-8 px-2.5 rounded-lg border border-border-default text-text-2 text-[12px] hover:text-text-0 hover:bg-bg-2 transition-colors flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download size={12} />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto">
          {leads !== null && !error && <WorkspaceMetrics items={[{ label: 'Total enquiries', value: leads.length }, { label: 'New messages', value: newCount }, { label: 'Contacted', value: leads.filter((lead) => lead.status === 'contacted').length }]} />}
          {leads === null ? (
            <div className="py-24 text-center text-text-3">
              <Loader2 size={18} className="mx-auto animate-spin" />
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-[13px] text-status-red">{error}</p>
              <p className="mt-2 text-[12px] text-text-3">
                We could not load your enquiries. Please try Refresh in a moment.
              </p>
            </div>
          ) : visible.length === 0 ? (
            <div className="workspace-empty py-20 text-center">
              <Inbox size={20} className="mx-auto text-text-3" />
              <h2>
                {search ? 'No enquiry matches that search.' : 'No enquiries yet'}
              </h2>
              {search && <button className="studio-button secondary mt-4" onClick={() => setSearch('')}>Clear search</button>}
              {!search && (
                <p className="mt-1 text-[12px] text-text-3">
                  Publish your site, and messages from its contact form appear here.
                </p>
              )}
            </div>
          ) : (
            <div className="enquiries-table rounded-xl border border-border-default overflow-hidden" role="region" aria-label="Customer enquiries" tabIndex={0}>
              <table className="w-full text-left">
                <thead className="bg-bg-2 border-b border-border-default">
                  <tr className="text-[11px] uppercase tracking-wide text-text-3">
                    <th className="px-3 py-2 font-semibold">Who</th>
                    <th className="px-3 py-2 font-semibold">Message</th>
                    <th className="px-3 py-2 font-semibold w-24">When</th>
                    <th className="px-3 py-2 font-semibold w-32">Status</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((lead) => (
                    <tr key={lead.id} className="border-b border-border-subtle last:border-b-0 align-top">
                      <td className="px-3 py-2.5">
                        <p className="text-[12.5px] font-medium text-text-0">
                          {lead.name || 'No name given'}
                        </p>
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone.replace(/\s/g, '')}`}
                            className="block text-[11.5px] text-text-2 hover:text-brand transition-colors"
                          >
                            {lead.phone}
                          </a>
                        )}
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="block text-[11.5px] text-text-2 hover:text-brand transition-colors truncate max-w-[180px]"
                          >
                            {lead.email}
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[12.5px] text-text-1 leading-relaxed">
                        {lead.message || <span className="text-text-3">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-text-3 whitespace-nowrap">
                        {formatWhen(lead.createdAt)}
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={lead.status}
                          onChange={(event) => void setStatus(lead, event.target.value as Lead['status'])}
                          aria-label={`Status for ${lead.name || 'this enquiry'}`}
                          className={`px-2 py-1 rounded-md border text-[11px] font-medium outline-none cursor-pointer ${
                            STATUSES.find((s) => s.value === lead.status)?.className ?? ''
                          }`}
                        >
                          {STATUSES.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => void removeLead(lead)}
                          aria-label={`Delete enquiry from ${lead.name || 'unknown'}`}
                          className="p-1 rounded text-text-3 hover:text-status-red transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
