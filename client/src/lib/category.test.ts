import { describe, expect, it } from 'vitest'
import { categoryMatches, normalizeCategory } from './category'

describe('normalizeCategory', () => {
  it('leaves an already-canonical value unchanged', () => {
    expect(normalizeCategory('education')).toBe('education')
  })

  it('folds case and stray whitespace', () => {
    expect(normalizeCategory('  Education  ')).toBe('education')
    expect(normalizeCategory('EDUCATION')).toBe('education')
  })

  it('maps the misspelling this was reported for', () => {
    expect(normalizeCategory('Eduction')).toBe('education')
    expect(normalizeCategory('eduction')).toBe('education')
  })

  it('maps a few other plausible near-misses to their real category', () => {
    expect(normalizeCategory('School')).toBe('education')
    expect(normalizeCategory('Restaurant')).toBe('food')
    expect(normalizeCategory('real-estate')).toBe('realestate')
  })

  it('returns empty for nothing set, rather than matching everything', () => {
    expect(normalizeCategory(undefined)).toBe('')
    expect(normalizeCategory(null)).toBe('')
    expect(normalizeCategory('')).toBe('')
  })
})

describe('categoryMatches', () => {
  it('matches a template tagged with the typo against the real category', () => {
    expect(categoryMatches('Eduction', 'education')).toBe(true)
    expect(categoryMatches('education', 'Eduction')).toBe(true)
  })

  it('does not match a genuinely different category', () => {
    expect(categoryMatches('food', 'education')).toBe(false)
  })

  it('two empty values do not both compare as a match', () => {
    expect(categoryMatches(undefined, undefined)).toBe(false)
    expect(categoryMatches('', null)).toBe(false)
  })
})
