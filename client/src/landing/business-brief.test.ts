import { describe, expect, it } from 'vitest'
import { analyzeBusinessBrief, briefError, chipPresets, detectPreset, explicitName, fallbackPresets } from './business-brief'

describe('business brief', () => {
  it('detects each example sentence as its own kind of business', () => {
    const chips = chipPresets(fallbackPresets)
    expect(chips.map((chip) => chip.id)).toEqual(['cafe', 'school', 'portfolio', 'restaurant', 'ecommerce', 'real-estate'])
    for (const chip of chips) expect(detectPreset(chip.example, fallbackPresets)).toBe(chip.id)
  })

  it('detects a kind of business from free text, with accents and plurals', () => {
    expect(detectPreset('I need a school website for my students')).toBe('school')
    expect(detectPreset('We run a small café in Pune')).toBe('cafe')
    expect(detectPreset('Online shop selling candles')).toBe('ecommerce')
    expect(detectPreset('Freelance designer based in Delhi')).toBe('portfolio')
    expect(detectPreset('Estate agent with rental properties')).toBe('real-estate')
  })

  it('returns null when nothing is clear', () => {
    expect(detectPreset('We do things for people')).toBeNull()
    expect(detectPreset('')).toBeNull()
  })

  it('asks for at least ten characters, after trimming', () => {
    expect(briefError('')).not.toBe('')
    expect(briefError('   short   ')).not.toBe('')
    expect(briefError('A bakery in town')).toBe('')
  })

  it('only takes a name the person actually gave', () => {
    expect(explicitName('A modern neighbourhood café serving coffee')).toBe('')
    expect(explicitName('A design studio called Forma, making interiors')).toBe('Forma')
    expect(explicitName('The "Blue Door" bakery')).toBe('Blue Door')
  })

  it('analyses a chip choice, a typed sentence and an unclear sentence', async () => {
    const chip = await analyzeBusinessBrief(fallbackPresets.find((p) => p.id === 'cafe')!.example, 'cafe')
    expect(chip.businessType).toBe('Cafe')
    expect(chip.suggestedPages).toEqual(['Home', 'About', 'Menu', 'Gallery', 'Contact'])
    const typed = await analyzeBusinessBrief('We need a restaurant with table booking', null)
    expect(typed.presetId).toBe('restaurant')
    const unclear = await analyzeBusinessBrief('We do things for people', null)
    expect(unclear.businessType).toBe('General Business')
  })
})
