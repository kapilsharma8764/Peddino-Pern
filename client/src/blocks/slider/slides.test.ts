import { describe, it, expect } from 'vitest'
import { sliderSlides } from './slides'

describe('sliderSlides', () => {
  it('reads the slides that were filled in', () => {
    const slides = sliderSlides([
      { image: 'a.jpg', heading: 'One' },
      { heading: 'Two', text: 'Words' },
    ])
    expect(slides).toHaveLength(2)
    expect(slides[0].heading).toBe('One')
    expect(slides[1].image).toBe('')
  })

  it('drops a slide with nothing on it', () => {
    // An empty slide is a blank panel the viewer has to click past.
    expect(sliderSlides([{ image: '', heading: '', text: '' }, { heading: 'Real' }])).toHaveLength(1)
  })

  it('survives a broken or missing list', () => {
    expect(sliderSlides(undefined)).toEqual([])
    expect(sliderSlides('nope')).toEqual([])
    expect(sliderSlides([null, 42, { heading: 'Kept' }])).toHaveLength(1)
  })

  it('never returns a field as undefined', () => {
    // The component reads every field directly, so a missing one must come
    // back as an empty string rather than blowing up a template literal.
    const [slide] = sliderSlides([{ heading: 'Only a heading' }])
    expect(slide.text).toBe('')
    expect(slide.buttonUrl).toBe('')
  })
})
