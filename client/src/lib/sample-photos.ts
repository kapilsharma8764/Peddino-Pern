/**
 * The photographs a widget shows before anyone has chosen their own.
 *
 * Every widget carries sample content — a heading says "Your headline here",
 * a features list names three features — so that dragging one onto the page
 * gives you something to react to rather than an empty box. Reacting is how
 * people edit. Pictures were the exception: the hero and the image widget both
 * defaulted to no photograph, so a new site had no images at all and read as a
 * wireframe.
 *
 * Sizes are requested from the image host rather than downloading the original,
 * which is several megabytes for a picture shown at eight hundred pixels.
 */

const HOST = 'https://images.unsplash.com'

/** A sized, compressed request for one photograph. */
export function samplePhoto(id: string, width = 1200): string {
  return `${HOST}/${id}?auto=format&fit=crop&w=${width}&q=80`
}

export const samplePhotos = {
  /** A bright, neutral workspace — suits almost any trade. */
  workspace: 'photo-1497366754035-f200968a6e72',
  /** People talking across a desk. */
  meeting: 'photo-1522071820081-009f0129c71c',
  /** A shopfront counter. */
  counter: 'photo-1521737604893-d14cc237f11d',
  /** A desk with a laptop — suits portfolios and technical products. */
  desk: 'photo-1498050108023-c5249f4df085',
  /** Books and notes — suits schools and courses. */
  study: 'photo-1513475382585-d06e58bcb0e0',
  /** A consulting room — suits doctors and clinics. */
  consult: 'photo-1631217868264-e5b90bb7e133',
  /** A clinic corridor. */
  clinic: 'photo-1519494026892-80bbd2d6fd0d',
  /** A classroom. */
  classroom: 'photo-1580582932707-520aed937b7b',
  /** A room set for an evening event. */
  venue: 'photo-1519671482749-fd09be7ccebf',
  /** A table laid for dinner. */
  dining: 'photo-1414235077428-338989a2e8c0',
} as const
