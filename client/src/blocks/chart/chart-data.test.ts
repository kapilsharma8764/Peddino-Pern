import { describe, it, expect } from 'vitest'
import { donutSegment, parseValue, toSlices } from './chart-data'

describe('parseValue', () => {
  it('reads numbers the way people write them', () => {
    expect(parseValue('62%')).toBe(62)
    expect(parseValue('1,200')).toBe(1200)
    expect(parseValue('₹4.5')).toBe(4.5)
    expect(parseValue(88)).toBe(88)
  })

  it('treats anything unreadable as zero rather than NaN', () => {
    // One bad row must not blank out the whole chart.
    expect(parseValue('')).toBe(0)
    expect(parseValue('soon')).toBe(0)
    expect(parseValue(undefined)).toBe(0)
    expect(parseValue(Number.NaN)).toBe(0)
  })
})

describe('toSlices', () => {
  const rows = [
    { label: 'Repeat', value: '60%' },
    { label: 'Referrals', value: '30%' },
    { label: 'Online', value: '10%' },
  ]

  it('works out each share of the total', () => {
    const slices = toSlices(rows)
    expect(slices.map((s) => Math.round(s.fraction * 100))).toEqual([60, 30, 10])
  })

  it('keeps what the user typed for the label', () => {
    expect(toSlices(rows)[0].display).toBe('60%')
  })

  it('gives every row a colour without being asked', () => {
    const colours = toSlices(rows).map((s) => s.color)
    expect(colours.every(Boolean)).toBe(true)
    expect(new Set(colours).size).toBe(colours.length)
  })

  it('survives an empty or broken list', () => {
    expect(toSlices(undefined)).toEqual([])
    expect(toSlices([])).toEqual([])
    expect(toSlices([null, 'nope'])).toEqual([])
  })

  it('does not divide by zero when every value is zero', () => {
    const slices = toSlices([{ label: 'a', value: '0' }, { label: 'b', value: '0' }])
    expect(slices.every((s) => s.fraction === 0)).toBe(true)
  })
})

describe('donutSegment', () => {
  it('draws a closed path', () => {
    const path = donutSegment(0, 0.25)
    expect(path.startsWith('M ')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
    expect(path).not.toContain('NaN')
  })

  it('flags the long way round for segments over half', () => {
    expect(donutSegment(0, 0.75)).toContain(' 1 1 ')
    expect(donutSegment(0, 0.25)).toContain(' 0 1 ')
  })
})
