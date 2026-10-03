import type { RealTemplate } from './types'
import { importedTemplates } from './imported'
import { categoryMatches } from '@/lib/category'

/**
 * The templates the chooser offers.
 *
 * Every one is imported from a downloaded design in `templates Download/` —
 * its sections, its words and its pictures, read out of that download's HTML
 * and rebuilt as this builder's own widgets so all of it stays editable.
 *
 * This list only ever grows by importing another real design. It is never
 * produced by combining ingredients, which is what the generator this replaced
 * used to do and why its fifty-five "templates" all looked alike.
 */
export const templates: RealTemplate[] = importedTemplates

export function templateById(id: string): RealTemplate | undefined {
  return templates.find((template) => template.id === id)
}

/**
 * The design to open when nobody has chosen one.
 *
 * Matched on the trade picked in the form, falling back to the first, so a
 * site is never built from nothing.
 */
export function defaultTemplateFor(category: string | null): RealTemplate {
  return templates.find((template) => categoryMatches(template.category, category)) ?? templates[0]
}

export { buildTemplate, toBlocks } from './types'
export type { RealTemplate, SectionSpec, TemplatePage } from './types'
