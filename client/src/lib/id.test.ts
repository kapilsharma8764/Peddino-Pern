import { describe, it, expect } from 'vitest'
import { newId } from './id'

describe('newId', () => {
  it('keeps ids unique when many are created in the same millisecond', () => {
    // This is the case that matters: applying a template creates every block
    // in one synchronous pass, so a timestamp-only id would repeat.
    const ids = Array.from({ length: 2000 }, () => newId('block'))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('prefixes the id so it stays readable in the config', () => {
    expect(newId('page')).toMatch(/^page-/)
    expect(newId('block-hero')).toMatch(/^block-hero-/)
  })
})
