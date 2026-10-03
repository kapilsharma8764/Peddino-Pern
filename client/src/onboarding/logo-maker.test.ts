import { describe, it, expect } from 'vitest'
import { defaultDesign, initialsFrom, logoDataUrl, logoSvg } from './logo-maker'

describe('initialsFrom', () => {
  it('takes one letter from each of the first two words', () => {
    expect(initialsFrom('Sharma Coaching Classes')).toBe('SC')
    expect(initialsFrom('Iron Yard Fitness')).toBe('IY')
  })

  it('takes a single letter from a one-word name', () => {
    // "SH" for Sharma reads as an abbreviation of nothing.
    expect(initialsFrom('Sharma')).toBe('S')
  })

  it('skips the joining words', () => {
    expect(initialsFrom('Craft and Blade')).toBe('CB')
    expect(initialsFrom('The Coffee House')).toBe('CH')
  })

  it('gives something rather than nothing for an empty name', () => {
    expect(initialsFrom('')).toBe('?')
    expect(initialsFrom('   ')).toBe('?')
  })
})

describe('logoSvg', () => {
  const design = defaultDesign('Sharma Coaching Classes')

  it('draws the name and the initials', () => {
    const svg = logoSvg(design)
    expect(svg).toContain('Sharma Coaching Classes')
    expect(svg).toContain('>SC<')
    expect(svg.startsWith('<svg')).toBe(true)
  })

  it('makes the square version the mark on its own', () => {
    // Used as the favicon, where the full name would be unreadable.
    const square = logoSvg(design, true)
    expect(square).not.toContain('Sharma Coaching Classes')
    expect(square).toContain('viewBox="0 0 256 256"')
  })

  it('escapes a name that would otherwise break the markup', () => {
    const svg = logoSvg({ ...design, name: 'Tom & Jerry <Ltd>' })
    expect(svg).toContain('Tom &amp; Jerry &lt;Ltd&gt;')
    expect(svg).not.toContain('<Ltd>')
  })

  it('drops the plate when the shape is none', () => {
    const plain = logoSvg({ ...design, shape: 'none' })
    expect(plain).not.toContain('<circle')
    expect(plain).not.toContain('<rect')
  })
})

describe('logoDataUrl', () => {
  it('produces a URL an img tag can use', () => {
    const url = logoDataUrl(defaultDesign('Kesar Kitchen'))
    expect(url.startsWith('data:image/svg+xml,')).toBe(true)
  })

  it('stays small — it travels inside the site on every save', () => {
    const url = logoDataUrl(defaultDesign('Sharma Coaching Classes'))
    expect(url.length).toBeLessThan(3000)
  })
})
