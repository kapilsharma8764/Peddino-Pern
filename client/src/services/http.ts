import { API_URL } from '@/lib/api'

/**
 * Reads a public JSON endpoint (no sign-in needed). Gives up after a few seconds,
 * so a slow or missing API never leaves a screen waiting: callers keep their
 * bundled fallback and carry on.
 */
export class HttpError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Request failed (${status})`)
    this.name = 'HttpError'
    this.status = status
  }
}

export async function getJson<T>(path: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000)
  options.signal?.addEventListener('abort', () => controller.abort(), { once: true })
  try {
    const response = await fetch(`${API_URL}${path}`, { signal: controller.signal, headers: { accept: 'application/json' } })
    if (!response.ok) throw new HttpError(response.status)
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/** The items of a `{ items: [...] }` answer, or null when the shape is wrong or the list is empty. */
export function itemsOf<T>(body: unknown, check: (item: unknown) => item is T): T[] | null {
  const items = body && typeof body === 'object' ? (body as { items?: unknown }).items : null
  if (!Array.isArray(items) || items.length === 0 || !items.every(check)) return null
  return items
}

export const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
export const isStringList = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')
