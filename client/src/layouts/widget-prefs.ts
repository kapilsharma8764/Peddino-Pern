import { useCallback, useState } from 'react'

/**
 * Favourite and recently used widgets, kept in this browser only.
 * They are conveniences for the person using the editor, not part of the site,
 * so they are never saved with it. Every read and write is guarded: private
 * windows and blocked storage must not stop the widget list from working.
 */
const FAVORITES = 'sb-widget-favorites'
const RECENT = 'sb-widget-recent'
const RECENT_LIMIT = 8

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch { return [] }
}

/** The widgets added most recently, newest first. */
export function readRecent(): string[] { return read(RECENT) }

function write(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

/** Remembers a widget as just used. Safe to call from anywhere an add happens. */
export function rememberWidget(type: string) {
  write(RECENT, [type, ...read(RECENT).filter((item) => item !== type)].slice(0, RECENT_LIMIT))
}

export function useWidgetPrefs() {
  const [favorites, setFavorites] = useState<string[]>(() => read(FAVORITES))

  const toggleFavorite = useCallback((type: string) => {
    setFavorites((current) => {
      const next = current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
      write(FAVORITES, next)
      return next
    })
  }, [])

  return { favorites, toggleFavorite }
}
