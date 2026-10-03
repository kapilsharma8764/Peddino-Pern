import { describe, it, expect } from 'vitest'
import { suggestAbout, suggestSlogans } from './suggestions'
import { emptyProfile } from './profile'

const coaching = {
  ...emptyProfile,
  category: 'education' as const,
  name: 'Sharma Coaching Classes',
}

describe('suggestions', () => {
  it('offers several slogans so a second press gives something new', () => {
    expect(suggestSlogans(coaching).length).toBeGreaterThan(2)
    expect(new Set(suggestSlogans(coaching)).size).toBe(suggestSlogans(coaching).length)
  })

  it('suits the slogans to the kind of business', () => {
    const forSchool = suggestSlogans(coaching).join(' ').toLowerCase()
    const forTrade = suggestSlogans({
      ...emptyProfile,
      category: 'professional',
      offer: 'services',
      name: 'BrightHouse',
    })
      .join(' ')
      .toLowerCase()
    expect(forSchool).not.toBe(forTrade)
    expect(forSchool).toContain('student')
  })

  it('writes the About draft around the business name', () => {
    const about = suggestAbout(coaching)
    expect(about).toContain(coaching.name)
    expect(about.startsWith('## ')).toBe(true)
    expect(about).toContain('- ')
  })

  it('narrows the wording by what the business name says', () => {
    const base = { ...emptyProfile, category: 'food' as const }
    const cafe = suggestAbout({ ...base, name: 'Bella Coffee House' })
    const bakery = suggestAbout({ ...base, name: 'Bella Bakery' })
    expect(cafe).toContain('café')
    expect(bakery).toContain('bakery')
    expect(cafe).not.toBe(bakery)
  })

  it('weaves the name and city into the slogans and About', () => {
    const profile = {
      ...emptyProfile,
      category: 'health' as const,
      name: 'Smile Dental Care',
      contact: { ...emptyProfile.contact, address: '12 MG Road, Jaipur, 302001' },
    }
    expect(suggestSlogans(profile).join(' ')).toContain('Smile Dental Care')
    expect(suggestAbout(profile)).toContain('in Jaipur')
  })

  it('does not misread a short keyword inside a longer word', () => {
    const about = suggestAbout({ ...emptyProfile, category: 'professional', name: 'Africa Traders' })
    expect(about).not.toContain('accounts, tax')
  })

  it('drops name-based slogans when no name is entered yet', () => {
    const slogans = suggestSlogans({ ...emptyProfile, category: 'food' })
    expect(slogans.length).toBeGreaterThan(1)
    expect(slogans.join(' ')).not.toContain('We:')
  })

  it('still writes something usable before a name is entered', () => {
    // Someone may press it early; an About that says "undefined" would be worse
    // than one that is merely generic.
    const about = suggestAbout(emptyProfile)
    expect(about).not.toContain('undefined')
    expect(about.length).toBeGreaterThan(60)
  })
})
