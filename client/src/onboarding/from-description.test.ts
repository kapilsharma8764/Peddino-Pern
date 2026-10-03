import { describe, it, expect } from 'vitest'
import { detectCategory, extractName, profileFromDescription } from './from-description'

describe('extractName', () => {
  it('takes a quoted name outright', () => {
    // Someone who quotes a name means it.
    expect(extractName('A gym called "Iron Yard Fitness" in Pune')).toBe('Iron Yard Fitness')
  })

  it('reads the name after "called" or "for"', () => {
    expect(extractName('A coaching centre called Sharma Classes')).toBe('Sharma Classes')
    expect(extractName('Website for Craft and Blade barbers')).toBe('Craft and Blade Barbers')
  })

  it('drops the filler people start with', () => {
    expect(extractName('I want a website for my shop')).not.toContain('want')
    expect(extractName('I want a website for my shop').toLowerCase()).not.toContain('website')
  })

  it('returns nothing rather than nonsense', () => {
    expect(extractName('a website for my business')).toBe('')
    expect(extractName('')).toBe('')
  })
})

describe('detectCategory', () => {
  it('recognises the trade', () => {
    expect(detectCategory('A coaching centre for board exams')).toBe('education')
    expect(detectCategory('A SaaS platform for invoicing')).toBe('professional')
    expect(detectCategory('A barber shop with three chairs')).toBe('beauty')
  })

  it('falls back rather than guessing wildly', () => {
    expect(detectCategory('Something nice and modern')).toBe('other')
  })
})

describe('profileFromDescription', () => {
  it('fills in enough to reach a template', () => {
    const profile = profileFromDescription('A dental clinic called Meridian offering check-ups')
    expect(profile.name).toBe('Meridian')
    expect(profile.category).toBe('health')
    expect(profile.offer).toBe('services')
  })

  it('keeps the description as the About text', () => {
    // What they typed is the truest thing on the page; it should not be thrown
    // away just because it was typed into a different box.
    const text = 'We repair washing machines across the city, same day.'
    expect(profileFromDescription(text).about).toBe(text)
  })

  it('leaves education without a product-or-service answer', () => {
    expect(profileFromDescription('A school in Delhi').offer).toBeNull()
  })
})
