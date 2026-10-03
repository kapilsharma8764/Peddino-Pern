import { expect, it } from 'vitest'
import { AiUnavailableError } from '@/lib/ai-client'
import { emptyProfile } from './profile'
import { readBusinessCopy, writeBusinessCopy } from './write-with-ai'

const profile = { ...emptyProfile, name: 'Sunrise Clinic', about: 'A family clinic', category: 'health' as const }

it('keeps only short plain text from the AI', () => {
  const copy = readBusinessCopy({ about: '<b>We care</b> for families.', slogan: 'Health first', services: ['Checkups', '<i>Dental</i>', 7, ''], ctaText: 'Book now' })
  expect(copy).toEqual({ about: 'We care for families.', slogan: 'Health first', services: 'Checkups\nDental', ctaText: 'Book now' })
  expect(readBusinessCopy({ about: 'x' })).toBeNull()
  expect(readBusinessCopy(null)).toBeNull()
})

it('uses the AI answer when there is one', async () => {
  const ask = async () => JSON.stringify({ about: 'Care for every family.', slogan: 'Health first', services: ['Checkups'], ctaText: 'Book now' })
  const result = await writeBusinessCopy(profile, 'Clinic', undefined, ask)
  expect(result.source).toBe('ai')
  expect(result.copy.slogan).toBe('Health first')
})

it('falls back to the built-in draft when AI is missing, busy or unreadable', async () => {
  for (const ask of [async () => { throw new AiUnavailableError() }, async () => { throw new Error('busy') }, async () => 'not json']) {
    const result = await writeBusinessCopy(profile, 'Clinic', undefined, ask)
    expect(result.source).toBe('local')
    expect(result.copy.about.length).toBeGreaterThan(10)
  }
})

it('stops when cancelled', async () => {
  const ask = async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }) }
  await expect(writeBusinessCopy(profile, 'Clinic', undefined, ask)).rejects.toThrow('aborted')
})
