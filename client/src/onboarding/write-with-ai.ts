import { askAi } from '@/lib/ai-client'
import type { BusinessProfile } from './profile'
import { suggestAbout, suggestSlogans } from './suggestions'

export interface BusinessCopy { about: string; slogan: string; services: string; ctaText: string }

const SYSTEM = `You write the first draft of a small business website. Reply with JSON only:
{"about":"2-3 friendly sentences","slogan":"a tagline under 8 words","services":["3 to 6 short service names"],"ctaText":"a button label of 2-4 words"}.
Write in the language of the business description (English, Hindi or Hinglish). Use only facts you were given; never invent prices, years, awards, numbers or phone numbers. No HTML.`

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim().slice(0, max) : '')

/** Keeps only plain, short text from whatever the AI sent, so nothing odd reaches the website. */
export function readBusinessCopy(raw: unknown): BusinessCopy | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const services = Array.isArray(value.services) ? value.services.map((item) => clip(item, 40)).filter(Boolean).slice(0, 6) : []
  const copy = { about: clip(value.about, 500), slogan: clip(value.slogan, 80), services: services.join('\n'), ctaText: clip(value.ctaText, 30) }
  return copy.about && copy.slogan ? copy : null
}

/** Offline answer, from the built-in suggestions, for when no AI is reachable. */
export function localBusinessCopy(profile: BusinessProfile): BusinessCopy {
  return { about: suggestAbout(profile), slogan: suggestSlogans(profile)[0] ?? '', services: profile.services, ctaText: profile.ctaText ?? '' }
}

/**
 * Drafts the about text, tagline, services and button for this business.
 * `source` says where it came from, so the screen can be honest about it.
 */
export async function writeBusinessCopy(profile: BusinessProfile, typeName: string, signal?: AbortSignal, ask: typeof askAi = askAi): Promise<{ copy: BusinessCopy; source: 'ai' | 'local' }> {
  const facts = [`Business name: ${profile.name}`, typeName && `Type: ${typeName}`, profile.about && `What they said about it: ${profile.about}`, profile.city && `City: ${profile.city}`, profile.services && `Services they listed: ${profile.services.replace(/\n/g, ', ')}`].filter(Boolean).join('\n')
  try {
    const text = await ask(SYSTEM, [{ role: 'user', text: facts }], { temperature: 0.7, signal })
    const copy = readBusinessCopy(JSON.parse(text))
    if (copy) return { copy, source: 'ai' }
  } catch (error) {
    // Cancelled on purpose: stop. Anything else (no AI, busy, an unreadable answer) still gets a useful draft.
    if (error instanceof Error && error.name === 'AbortError') throw error
  }
  return { copy: localBusinessCopy(profile), source: 'local' }
}
