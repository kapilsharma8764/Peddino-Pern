import type { BlockConfig } from '@/blocks/types'
import { buildLayout, layoutMap, type WireRow } from './layouts'

/**
 * Page structures: a whole page's skeleton, built from the same layouts the
 * section library offers. Each row of a structure is one empty, labelled
 * section — HERO, SERVICES, FAQ — with drop zones inside it. Nothing here has
 * words or pictures; a client fills the slots with widgets.
 *
 * These are not templates. A template is a finished, designed page.
 */

export interface StructureSection {
  label: string
  layout: string
}

export interface StructureDef {
  id: string
  label: string
  description: string
  sections: StructureSection[]
}

const s = (label: string, layout: string): StructureSection => ({ label, layout })

export const structures: StructureDef[] = [
  {
    id: 'simple', label: 'Simple Landing Page', description: 'Hero, features, about and a closing call to action.',
    sections: [s('Hero', 'h-centered'), s('Features', 'cd-3'), s('About', 'ct-image-content'), s('Call to action', 'ct-narrow')],
  },
  {
    id: 'business', label: 'Business Website', description: 'For a company or practice with services and proof.',
    sections: [s('Hero', 'h-left-right'), s('Logos / trust row', 'four-equal'), s('Services', 'cd-service'), s('About', 'ct-image-content'), s('Statistics', 'four-equal'), s('Testimonials', 'cd-testimonial'), s('Call to action', 'ct-narrow')],
  },
  {
    id: 'education', label: 'Education Website', description: 'Courses, teachers and admissions.',
    sections: [s('Hero', 'h-content-media'), s('Courses', 'cd-6'), s('Categories', 'cd-4'), s('Teachers', 'cd-team'), s('Statistics', 'four-equal'), s('Testimonials', 'cd-testimonial'), s('FAQ', 'ct-narrow'), s('Call to action', 'ct-narrow')],
  },
  {
    id: 'portfolio', label: 'Portfolio', description: 'Introduce yourself and show your work.',
    sections: [s('Hero', 'h-left-right'), s('About', 'ct-image-content'), s('Skills', 'three-equal'), s('Projects', 'cd-portfolio'), s('Experience', 'ct-narrow'), s('Testimonials', 'cd-testimonial'), s('Contact', 'ct-two')],
  },
  {
    id: 'ecommerce', label: 'E-commerce', description: 'A shop front with categories and products.',
    sections: [s('Hero', 'h-content-media'), s('Categories', 'cd-4'), s('Featured products', 'cd-product'), s('Promotional banner', 'a-full-section'), s('Products grid', 'g-4x2'), s('Testimonials', 'cd-testimonial'), s('Newsletter', 'ct-narrow')],
  },
  {
    id: 'service', label: 'Service Website', description: 'Explain what you do, how it works and why to choose you.',
    sections: [s('Hero', 'h-left-right'), s('Services grid', 'cd-service'), s('Process', 'four-equal'), s('Why choose us', 'ct-image-content'), s('Testimonials', 'cd-testimonial'), s('FAQ', 'ct-narrow'), s('Contact call to action', 'ct-narrow')],
  },
  {
    id: 'landing', label: 'Landing Page', description: 'One focused page with a single goal.',
    sections: [s('Hero', 'h-full'), s('Benefits', 'cd-3'), s('Details', 'ct-content-image'), s('Call to action', 'ct-narrow')],
  },
  { id: 'blank', label: 'Blank', description: 'Nothing on the page. Add sections one at a time.', sections: [] },
]

export const structureMap = new Map(structures.map((structure) => [structure.id, structure]))

/** Fresh sections for a structure, each labelled so the canvas can say what it is for. */
export function buildStructure(id: string): BlockConfig[] {
  const structure = structureMap.get(id)
  if (!structure) throw new Error(`Unknown structure: ${id}`)
  return structure.sections.map((entry) => {
    const block = buildLayout(entry.layout)
    block.props = { ...block.props, sectionLabel: entry.label }
    return block
  })
}

/** A tiny picture of the whole page: header, one band per section, footer. */
export function structureWire(structure: StructureDef): { label: string; rows: WireRow[] }[] {
  return structure.sections.map((entry) => ({ label: entry.label, rows: layoutMap.get(entry.layout)?.wire ?? [] }))
}
