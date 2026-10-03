import { describe, it, expect } from 'vitest'
import { todayIndex, defaultHours } from './hours-data'

describe('todayIndex', () => {
  it('matches rows that start on Monday', () => {
    // getDay() counts from Sunday; the table starts on Monday, so an
    // unadjusted index would highlight the wrong day every single day.
    expect(todayIndex(new Date('2026-09-07T10:00:00'))).toBe(0) // a Monday
    expect(todayIndex(new Date('2026-09-12T10:00:00'))).toBe(5) // Saturday
    expect(todayIndex(new Date('2026-09-13T10:00:00'))).toBe(6) // Sunday
  })

  it('stays inside the week', () => {
    for (let day = 0; day < 14; day += 1) {
      const date = new Date(2026, 8, 1 + day)
      expect(todayIndex(date)).toBeGreaterThanOrEqual(0)
      expect(todayIndex(date)).toBeLessThan(7)
    }
  })
})

describe('defaultHours', () => {
  it('covers the whole week', () => {
    expect(defaultHours).toHaveLength(7)
    expect(defaultHours[0].day).toBe('Monday')
  })

  it('leaves a closed day empty rather than writing "Closed"', () => {
    // The widget writes "Closed" itself, so the data stays a plain time range.
    expect(defaultHours[6].hours).toBe('')
  })
})
