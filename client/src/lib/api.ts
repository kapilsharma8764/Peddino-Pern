/**
 * Talking to the SiteBuilder API.
 *
 * Every call funnels through `request` so failures surface as a readable
 * sentence rather than "TypeError: fetch failed". The most likely failure by
 * far is that the server simply is not running, and the message says so.
 */

import { authToken, useAuthStore, type Account } from '@/store/authStore'

import type { BlockConfig, ThemeConfig } from '@/blocks/types'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8001'

export class ApiError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authToken()

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiError(`Cannot reach the server at ${API_URL}. Is it running?`)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const body = text ? (JSON.parse(text) as unknown) : undefined

  if (!response.ok) {
    // An expired or revoked session should not leave the app showing a
    // half-signed-in state; clear it so the next screen is the sign-in one.
    if (response.status === 401) useAuthStore.getState().signOut()

    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }

  return body as T
}

export interface SiteSummary {
  id: string
  name: string
  slug: string | null
  published: boolean
  publishedAt?: string
  updatedAt: string
  sectionCount: number
  /** How many times the published home page was opened. Counted by the server, saved every half minute. */
  views?: number
  /** Enough of the site to draw a thumbnail, without sending the whole tree. */
  preview?: {
    theme: Partial<ThemeConfig> | null
    header: BlockConfig[]
    blocks: BlockConfig[]
  }
}

export interface SiteRecord extends SiteSummary {
  config: unknown
  profile: unknown
}

export interface Lead {
  id: string
  createdAt: string
  siteId: string | null
  slug: string | null
  name: string
  email: string
  phone: string
  message: string
  status: 'new' | 'contacted' | 'won' | 'lost'
  note?: string
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),

  register: (body: { email: string; password: string; name?: string }) =>
    request<{ token: string; user: Account }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: Account }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  forgotPassword: (body: { email: string }) =>
    request<{ ok: boolean; message: string; devCode?: string }>('/api/auth/forgot', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  resetPassword: (body: { email: string; code: string; password: string }) =>
    request<{ token: string; user: Account }>('/api/auth/reset', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  loginWithGoogle: (body: { credential: string }) =>
    request<{ token: string; user: Account }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => request<{ user: Account }>('/api/auth/me'),
  authStatus: () => request<{ hasAccounts: boolean }>('/api/auth/status'),

  listSites: () => request<SiteSummary[]>('/api/sites'),
  unownedSites: () => request<{ count: number; names: string[] }>('/api/sites/unowned'),
  claimSites: () => request<{ claimed: number }>('/api/sites/claim', { method: 'POST' }),
  getSite: (id: string) => request<SiteRecord>(`/api/sites/${id}`),
  createSite: (body: { name: string; config: unknown; profile?: unknown }) =>
    request<SiteRecord>('/api/sites', { method: 'POST', body: JSON.stringify(body) }),
  /** `keepalive` lets the request finish after the page is gone (a reload or closed tab). */
  saveSite: (id: string, body: { name?: string; config?: unknown; profile?: unknown }, options?: { keepalive?: boolean }) =>
    request<SiteRecord>(`/api/sites/${id}`, { method: 'PUT', body: JSON.stringify(body), ...(options?.keepalive ? { keepalive: true } : {}) }),
  deleteSite: (id: string) => request<void>(`/api/sites/${id}`, { method: 'DELETE' }),

  publish: (id: string, pages: { slug: string; name: string; html: string }[]) =>
    request<{ slug: string; url: string; publishedAt: string; pages: number }>(
      `/api/sites/${id}/publish`,
      { method: 'POST', body: JSON.stringify({ pages }) },
    ),
  unpublish: (id: string) =>
    request<{ published: boolean }>(`/api/sites/${id}/unpublish`, { method: 'POST' }),

  listLeads: (siteId?: string) =>
    request<Lead[]>(`/api/leads${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ''}`),
  updateLead: (id: string, changes: { status?: Lead['status']; note?: string }) =>
    request<Lead>(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  deleteLead: (id: string) => request<void>(`/api/leads/${id}`, { method: 'DELETE' }),

  /** Whether this server has an AI key, so the builder can offer AI without asking for one. */
  aiStatus: () => request<{ available: boolean }>('/api/ai/status'),
  aiComplete: (body: { system: string; messages: { role: 'user' | 'assistant'; text: string }[]; temperature?: number }, signal?: AbortSignal) =>
    request<{ text: string }>('/api/ai/complete', { method: 'POST', body: JSON.stringify(body), signal }),

  // The signed-in user's own data. The server takes the user from the session, never from the request.
  getBusinessBrief: () => request<{ brief: ServerBrief | null }>('/api/me/business-brief'),
  saveBusinessBrief: (body: ServerBriefInput, options?: { keepalive?: boolean }) =>
    request<{ brief: ServerBrief }>('/api/me/business-brief', { method: 'PUT', body: JSON.stringify(body), ...(options?.keepalive ? { keepalive: true } : {}) }),
  getOnboarding: () => request<{ onboarding: ServerOnboarding | null }>('/api/me/onboarding'),
  saveOnboarding: (body: ServerOnboardingInput, options?: { keepalive?: boolean }) =>
    request<{ onboarding: ServerOnboarding }>('/api/me/onboarding', { method: 'PUT', body: JSON.stringify(body), ...(options?.keepalive ? { keepalive: true } : {}) }),
  getPreferences: () => request<{ preferences: Record<string, unknown> }>('/api/me/preferences'),
  savePreference: (key: string, value: unknown) =>
    request<{ key: string; value: unknown }>(`/api/me/preferences/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  deletePreference: (key: string) => request<void>(`/api/me/preferences/${encodeURIComponent(key)}`, { method: 'DELETE' }),
}

/** What `/api/me/business-brief` sends and receives (the server fills in the dates). */
export interface ServerBriefInput {
  description: string
  selectedPreset: string | null
  businessType?: string | null
  recommendedPages?: string[]
  recommendedFeatures?: string[]
  suggestedTemplateCategory?: string | null
  themeDirection?: { style?: string | null; primaryColor?: string; accentColor?: string } | null
  direction?: Record<string, unknown> | null
}
export interface ServerBrief extends ServerBriefInput { createdAt: string; updatedAt: string }

export interface ServerOnboardingInput { currentStep: string | null; completedSteps: string[]; onboardingData: Record<string, unknown> }
export interface ServerOnboarding extends ServerOnboardingInput { updatedAt: string }

/** Where a published page should send its enquiries. */
export const leadsEndpoint = `${API_URL}/api/leads`
