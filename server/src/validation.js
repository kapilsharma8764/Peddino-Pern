/**
 * Small, dependency-free checks for request input. Each reader returns the clean
 * value, or `{ error }` with a sentence that is safe to show to the person.
 */

export const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/
const PREF_KEY = /^[a-z0-9][a-z0-9._-]{0,63}$/i
const COLOUR = /^#[0-9a-f]{3,8}$/i
// A name that suggests a secret. Nothing like that is ever stored as a preference or an answer.
const SECRETISH = /(api[-_.]?key|secret|password|passwd|token|credential|private[-_.]?key|gemini)/i

export const isSlug = (value) => typeof value === 'string' && value.length <= 80 && SLUG.test(value)

/** The text, trimmed and no longer than `max`; or null when it is not a string. */
export function text(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : null
}

export function readPaging(query, { defaultLimit = 24, maxLimit = 200 } = {}) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(Number(query.limit)) || defaultLimit))
  return { page, limit, offset: (page - 1) * limit }
}

/** Escapes % and _ so a search term is matched literally by LIKE. */
export const likePattern = (term) => `%${String(term).replace(/[\\%_]/g, (char) => `\\${char}`)}%`

/** True when an object, at any depth, has a key that looks like a secret. */
export function hasSecretKey(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some((item) => hasSecretKey(item, depth + 1))
  return Object.entries(value).some(([key, nested]) => SECRETISH.test(key) || hasSecretKey(nested, depth + 1))
}

function stringList(value, { max = 40, each = 80 } = {}) {
  if (!Array.isArray(value) || value.length > max) return null
  const out = []
  for (const item of value) {
    if (typeof item !== 'string' || item.length > each) return null
    out.push(item.trim())
  }
  return out
}

function plainObject(value, maxBytes) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  if (JSON.stringify(value).length > maxBytes) return null
  return value
}

/** The homepage "What are you building?" brief. */
export function readBrief(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Send the brief as JSON' }
  const description = text(body.description, 1200)
  if (description === null) return { error: 'The description must be text' }
  const selectedPreset = body.selectedPreset == null ? null : isSlug(body.selectedPreset) ? body.selectedPreset : undefined
  if (selectedPreset === undefined) return { error: 'The selected preset is not valid' }
  const businessType = body.businessType == null ? null : text(body.businessType, 80)
  const category = body.suggestedTemplateCategory == null ? null : text(body.suggestedTemplateCategory, 80)
  const pages = body.recommendedPages == null ? [] : stringList(body.recommendedPages)
  const features = body.recommendedFeatures == null ? [] : stringList(body.recommendedFeatures)
  if (pages === null || features === null) return { error: 'Pages and features must be short lists of text' }

  let themeDirection = null
  if (body.themeDirection != null) {
    const theme = plainObject(body.themeDirection, 1000)
    if (!theme) return { error: 'The theme direction is not valid' }
    const { style, primaryColor, accentColor } = theme
    if ([style, primaryColor, accentColor].some((v) => v !== undefined && typeof v !== 'string')) return { error: 'The theme direction is not valid' }
    if ([primaryColor, accentColor].some((v) => v !== undefined && !COLOUR.test(v))) return { error: 'Theme colours must look like #1a2b3c' }
    themeDirection = { style: text(style ?? '', 60), primaryColor, accentColor }
  }
  let direction = null
  if (body.direction != null) {
    direction = plainObject(body.direction, 20_000)
    if (!direction) return { error: 'The saved direction is not valid or is too large' }
  }
  return { value: { description, selectedPreset, businessType, recommendedPages: pages, recommendedFeatures: features, suggestedTemplateCategory: category, themeDirection, direction } }
}

/** The setup progress: where someone is, what they finished, and the answers so far. */
export function readOnboarding(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Send the progress as JSON' }
  const currentStep = body.currentStep == null ? null : text(body.currentStep, 60)
  const completed = body.completedSteps == null ? [] : stringList(body.completedSteps, { max: 30, each: 60 })
  if (completed === null) return { error: 'Completed steps must be a short list of text' }
  const data = body.onboardingData == null ? {} : plainObject(body.onboardingData, 64_000)
  if (!data) return { error: 'The answers are not valid or are too large' }
  if (hasSecretKey(data)) return { error: 'Keys, tokens and passwords cannot be saved here' }
  return { value: { currentStep, completedSteps: completed, onboardingData: data } }
}

export function readPreference(key, body) {
  if (typeof key !== 'string' || !PREF_KEY.test(key)) return { error: 'The preference name is not valid' }
  if (SECRETISH.test(key)) return { error: 'Keys, tokens and passwords cannot be saved as preferences' }
  if (!body || typeof body !== 'object' || !('value' in body)) return { error: 'Send { "value": … }' }
  const json = JSON.stringify(body.value)
  if (json === undefined || json.length > 16_000) return { error: 'The value is missing or too large' }
  if (hasSecretKey(body.value)) return { error: 'Keys, tokens and passwords cannot be saved as preferences' }
  return { value: body.value }
}
