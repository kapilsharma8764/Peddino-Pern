import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, uniqueSlug } from './slug.js'

describe('slugify', () => {
  test('reads like the business name', () => {
    assert.equal(slugify('Sharma Coaching Classes'), 'sharma-coaching-classes')
    assert.equal(slugify('Craft & Blade'), 'craft-blade')
  })

  test('never produces an empty address', () => {
    assert.equal(slugify(''), 'site')
    assert.equal(slugify('!!!'), 'site')
    assert.equal(slugify(null), 'site')
  })

  test('keeps addresses a sensible length', () => {
    assert.ok(slugify('a'.repeat(200)).length <= 60)
  })
})

describe('uniqueSlug', () => {
  test('adds a counter when the name is taken', () => {
    const taken = [{ id: '1', slug: 'blade' }]
    assert.equal(uniqueSlug('Blade', taken), 'blade-2')
  })

  test('lets a site keep the address it already has', () => {
    // Republishing must not walk a live address to blade-2, which would break
    // every link the business has already handed out.
    const taken = [{ id: '1', slug: 'blade' }]
    assert.equal(uniqueSlug('Blade', taken, '1'), 'blade')
  })

  test('steps aside from addresses the server itself uses', () => {
    assert.equal(uniqueSlug('API', []), 'api-site')
  })
})
