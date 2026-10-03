import type { BusinessProfile, WebsiteCategory } from './profile'
import { emptyProfile } from './profile'

/**
 * Reading a business out of a sentence someone typed.
 *
 * Used by the "describe it" way in, so that route arrives at the editor with
 * the same profile the four-step form would have produced — the name in the
 * header, the trade deciding which design suits.
 *
 * Deliberately simple and predictable rather than clever. It is a starting
 * point the person then edits, and a wrong guess they can see and fix beats a
 * confident one they cannot.
 */

const CATEGORY_WORDS: { category: WebsiteCategory; words: string[] }[] = [
  {
    category: 'education',
    words: ['school', 'coaching', 'tuition', 'classes', 'academy', 'institute', 'college', 'training', 'course'],
  },
  {
    category: 'food',
    words: ['restaurant', 'cafe', 'bakery', 'catering', 'kitchen', 'dhaba', 'diner', 'bistro', 'food'],
  },
  {
    category: 'beauty',
    words: ['salon', 'barber', 'parlour', 'parlor', 'spa', 'makeup', 'beauty'],
  },
  {
    category: 'fitness',
    words: ['gym', 'fitness', 'yoga', 'crossfit', 'workout', 'sports academy'],
  },
  {
    category: 'health',
    words: ['clinic', 'dental', 'doctor', 'hospital', 'diagnostic', 'physio', 'pharmacy'],
  },
  {
    category: 'realestate',
    words: ['real estate', 'realty', 'property dealer', 'builder', 'flats', 'plots', 'rental'],
  },
  {
    category: 'home-services',
    words: ['contractor', 'cleaning', 'solar', 'interior', 'construction', 'renovation', 'plumb', 'electric'],
  },
  {
    category: 'professional',
    words: [
      'agency', 'consult', 'law firm', 'legal', 'accountant', 'ca firm', 'marketing agency',
      'software', 'app', 'saas', 'platform', 'startup', 'it ', 'tech', 'developer', 'api', 'digital',
    ],
  },
]

const PRODUCT_WORDS = ['sell', 'shop', 'store', 'product', 'menu', 'catalogue', 'stock']
const SERVICE_WORDS = ['service', 'repair', 'consult', 'clinic', 'salon', 'coaching', 'agency', 'install', 'clean']

/** Words that are never a business name on their own. */
const FILLER = new Set([
  'a', 'an', 'the', 'my', 'our', 'we', 'i', 'want', 'need', 'make', 'build', 'create',
  'website', 'site', 'page', 'for', 'of', 'is', 'are', 'called', 'named', 'business',
])

/**
 * Words that mark the end of a name.
 *
 * "A clinic called Meridian offering check-ups" — the name is Meridian, and
 * without this it would run on into the rest of the sentence.
 */
const NAME_ENDS = new Set([
  'offering', 'offer', 'offers', 'that', 'which', 'who', 'with', 'in', 'at', 'on',
  'selling', 'sells', 'doing', 'does', 'providing', 'provides', 'specialising',
  'specializing', 'based', 'serving', 'near', 'from',
])

/**
 * Connectors kept lower case inside a name.
 *
 * "and" is not an ending — plenty of businesses are called Craft and Blade or
 * Smith and Sons — but capitalising it would read wrong.
 */
const LOWER_INSIDE = new Set(['and', 'of', 'the', '&'])

/**
 * The business name.
 *
 * A quoted name wins outright, since anyone who quotes one means it. Otherwise
 * the words after "for" or "called" are taken, with the filler removed.
 */
export function extractName(description: string): string {
  const quoted = description.match(/["“']([^"”']{2,60})["”']/)
  if (quoted) return quoted[1].trim()

  const after = description.match(/\b(?:for|called|named)\s+([A-Za-z0-9&' ]{2,60})/i)
  const source = after ? after[1] : description

  // A comma or dash ends the name as surely as a full stop does.
  const clause = source.split(/[,;–—]|\s-\s/)[0]

  const words: string[] = []
  for (const raw of clause.split(/\s+/)) {
    const word = raw.replace(/[^A-Za-z0-9&']/g, '')
    if (!word) continue
    const lower = word.toLowerCase()
    if (FILLER.has(lower)) continue
    if (NAME_ENDS.has(lower)) break
    words.push(word)
    if (words.length === 4) break
  }

  if (words.length === 0) return ''

  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index > 0 && LOWER_INSIDE.has(lower)) return lower
      // An all-capitals word is already how the owner writes it.
      return word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export function detectCategory(description: string): WebsiteCategory {
  const text = ` ${description.toLowerCase()} `
  for (const { category, words } of CATEGORY_WORDS) {
    if (words.some((word) => text.includes(word))) return category
  }
  return 'other'
}

export function profileFromDescription(description: string): BusinessProfile {
  const text = description.toLowerCase()
  const category = detectCategory(description)

  const sellsProduct = PRODUCT_WORDS.some((word) => text.includes(word))
  const sellsService = SERVICE_WORDS.some((word) => text.includes(word))

  return {
    ...emptyProfile,
    category,
    offer:
      category === 'education'
        ? null
        : sellsProduct && sellsService
          ? 'both'
          : sellsProduct
            ? 'product'
            : 'services',
    name: extractName(description),
    about: description.trim(),
  }
}
