export interface Slide {
  image: string
  heading: string
  text: string
  buttonText: string
  buttonUrl: string
}

/**
 * Reads the slides out of a widget's props.
 *
 * Kept apart from the component so both the editor and the published page work
 * from the same reading, and so the awkward cases — a missing list, a row that
 * is not an object, a slide with nothing on it — are handled in one place
 * rather than twice.
 */
export function sliderSlides(raw: unknown): Slide[] {
  if (!Array.isArray(raw)) return []

  return raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => ({
      image: typeof row.image === 'string' ? row.image : '',
      heading: typeof row.heading === 'string' ? row.heading : '',
      text: typeof row.text === 'string' ? row.text : '',
      buttonText: typeof row.buttonText === 'string' ? row.buttonText : '',
      buttonUrl: typeof row.buttonUrl === 'string' ? row.buttonUrl : '',
    }))
    // A slide with no picture and no words would show as a blank panel the
    // viewer has to click past.
    .filter((slide) => slide.image || slide.heading || slide.text)
}
