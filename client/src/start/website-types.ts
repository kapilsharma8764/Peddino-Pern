import type { BusinessProfile, WebsiteCategory } from '@/onboarding/profile'
import seed from '@/data/seed/website_types.json'

/**
 * The kinds of website someone can say they are building.
 *
 * There are more of these than the builder has template categories, so each one
 * is mapped onto the nearest existing category (`category`), which is what the
 * template gallery filters on, and carries its own keywords, which rank the
 * most fitting templates first inside that category.
 */
export interface WebsiteTypeDef {
  id: string
  name: string
  hint: string
  /** lucide-react icon name, resolved where the card is drawn. */
  icon: string
  category: WebsiteCategory
  websiteType?: BusinessProfile['websiteType']
  keywords: string[]
  /** Pages that usually suit this kind of site, ticked by default in "Create a site". */
  pages: string[]
  /** Starting designs that suit it, shown first. */
  designs: string[]
}

/** A website type as the API and the seed file spell it. */
export interface WebsiteTypeRow {
  slug: string
  name: string
  description: string
  icon: string
  category: string
  websiteType: BusinessProfile['websiteType'] | null
  keywords: string[]
  pages: string[]
  designs: string[]
}

export const toWebsiteType = (row: WebsiteTypeRow): WebsiteTypeDef => ({
  id: row.slug, name: row.name, hint: row.description, icon: row.icon, category: row.category as WebsiteCategory,
  keywords: row.keywords, pages: row.pages, designs: row.designs, ...(row.websiteType ? { websiteType: row.websiteType } : {}),
})

/**
 * The offline fallback: the seed file, which is also what fills the database.
 * Components read the list through `useCatalog`, which swaps in the API's copy
 * once it has loaded, so the database is the source of truth.
 */
export const websiteTypes: WebsiteTypeDef[] = (seed as unknown as WebsiteTypeRow[]).map(toWebsiteType)

export const websiteTypeMap = new Map(websiteTypes.map((type) => [type.id, type]))

export function matchesTypeSearch(type: WebsiteTypeDef, query: string): boolean {
  const q = query.trim().toLowerCase()
  return !q || `${type.name} ${type.hint} ${type.keywords.join(' ')}`.toLowerCase().includes(q)
}

/** How well a template's text fits the chosen type. Higher sorts earlier; 0 means no keyword matched. */
export function typeScore(type: WebsiteTypeDef | undefined, text: string): number {
  if (!type) return 0
  const lower = text.toLowerCase()
  return type.keywords.reduce((score, keyword, i) => (lower.includes(keyword) ? score + (type.keywords.length - i) : score), 0)
}
