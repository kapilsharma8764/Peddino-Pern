import { describe, it, expect } from 'vitest'
import { whatsappNumber, whatsappHref } from './link'

describe('whatsappNumber', () => {
  it('strips the punctuation people type', () => {
    expect(whatsappNumber('98765 43210', '91')).toBe('919876543210')
    expect(whatsappNumber('+91 98765-43210', '91')).toBe('919876543210')
    expect(whatsappNumber('(98765) 43210', '91')).toBe('919876543210')
  })

  it('does not add the country code twice', () => {
    // Half of people include it and half do not; doubling it produces a link
    // that opens WhatsApp on an invalid number.
    expect(whatsappNumber('919876543210', '91')).toBe('919876543210')
  })

  it('returns nothing when there is no number', () => {
    expect(whatsappNumber('', '91')).toBe('')
    expect(whatsappNumber('   ', '91')).toBe('')
  })
})

describe('whatsappHref', () => {
  it('carries the opening message', () => {
    const href = whatsappHref('919876543210', 'Hello there')
    expect(href).toBe('https://wa.me/919876543210?text=Hello%20there')
  })

  it('omits the message when there is none', () => {
    expect(whatsappHref('919876543210', '   ')).toBe('https://wa.me/919876543210')
  })
})
