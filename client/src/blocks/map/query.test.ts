import { describe, it, expect } from 'vitest'
import { mapQuery, mapEmbedUrl } from './query'

describe('mapQuery', () => {
  it('prefers a typed address', () => {
    expect(mapQuery({ address: '12 MG Road, Pune' })).toBe('12 MG Road, Pune')
  })

  it('reads the place out of a pasted Google link', () => {
    const url = 'https://www.google.com/maps/place/Kesar+Kitchen/@18.5,73.8,17z'
    expect(mapQuery({ mapUrl: url })).toBe('Kesar Kitchen')
  })

  it('reads a query-style link', () => {
    expect(mapQuery({ mapUrl: 'https://maps.google.com/?q=Iron+Yard+Gym' })).toBe('Iron Yard Gym')
  })

  it('returns nothing when there is nothing to go on', () => {
    expect(mapQuery({})).toBe('')
    expect(mapQuery({ address: '   ' })).toBe('')
  })
})

describe('mapEmbedUrl', () => {
  it('escapes the query', () => {
    expect(mapEmbedUrl('12 MG Road, Pune')).toBe(
      'https://www.google.com/maps?q=12%20MG%20Road%2C%20Pune&output=embed',
    )
  })
})
