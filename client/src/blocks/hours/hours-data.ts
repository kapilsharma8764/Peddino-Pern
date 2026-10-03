export interface OpeningRow {
  day: string
  /** Free text — "9 AM – 7 PM", "By appointment". Empty means closed. */
  hours: string
}

/**
 * Which row is today.
 *
 * The rows start on Monday, which is how opening hours are written on a shop
 * door, while `getDay()` counts from Sunday. Getting this off by one would
 * highlight the wrong day every day, so it lives here with a test.
 */
export function todayIndex(now: Date = new Date()): number {
  return (now.getDay() + 6) % 7
}

export const defaultHours: OpeningRow[] = [
  { day: 'Monday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Tuesday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Wednesday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Thursday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Friday', hours: '9:00 AM – 7:00 PM' },
  { day: 'Saturday', hours: '10:00 AM – 5:00 PM' },
  { day: 'Sunday', hours: '' },
]
