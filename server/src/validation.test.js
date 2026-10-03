import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { hasSecretKey, isSlug, likePattern, readBrief, readOnboarding, readPaging, readPreference, text } from './validation.js'

const brief = {
  description: '  A café  ', selectedPreset: 'cafe', businessType: 'Cafe', recommendedPages: ['Home'], recommendedFeatures: ['Menu'],
  suggestedTemplateCategory: 'Food & Dining', themeDirection: { style: 'Warm', primaryColor: '#8c5a2b', accentColor: '#e9b872' },
}

describe('validation', () => {
  test('slugs', () => {
    for (const ok of ['cafe', 'real-estate', 'free_iconic_master', 'a1']) assert.equal(isSlug(ok), true, ok)
    for (const bad of ['', 'Cafe', 'a b', '../x', 'x'.repeat(81), '-a', 'a--b', null, 5, ['a']]) assert.equal(isSlug(bad), false, String(bad))
  })

  test('text trims, caps, and refuses non-strings', () => {
    assert.equal(text('  hi  ', 10), 'hi')
    assert.equal(text('abcdef', 3), 'abc')
    assert.equal(text(5, 3), null)
  })

  test('paging stays inside its bounds', () => {
    assert.deepEqual(readPaging({}), { page: 1, limit: 24, offset: 0 })
    assert.deepEqual(readPaging({ page: '3', limit: '10' }), { page: 3, limit: 10, offset: 20 })
    assert.equal(readPaging({ limit: '99999' }).limit, 200)
    assert.deepEqual(readPaging({ page: '-4', limit: 'abc' }), { page: 1, limit: 24, offset: 0 })
  })

  test('a LIKE search is literal', () => {
    assert.equal(likePattern('50%_off\\'), '%50\\%\\_off\\\\%')
  })

  test('secret-looking keys are found at any depth', () => {
    assert.equal(hasSecretKey({ a: { b: [{ geminiKey: 'x' }] } }), true)
    assert.equal(hasSecretKey({ profile: { name: 'x', contact: { email: 'y' } } }), false)
    assert.equal(hasSecretKey({ API_KEY: 1 }), true)
    assert.equal(hasSecretKey('apiKey'), false)
  })

  test('a brief is read clean, or refused with a sentence', () => {
    const ok = readBrief(brief)
    assert.equal(ok.value.description, 'A café')
    assert.deepEqual(ok.value.recommendedPages, ['Home'])
    assert.equal(readBrief({ description: '' }).value.selectedPreset, null)
    for (const bad of [null, [], 'x', { ...brief, description: 1 }, { ...brief, selectedPreset: 'No Good' }, { ...brief, recommendedPages: 'Home' },
      { ...brief, recommendedPages: Array(41).fill('x') }, { ...brief, themeDirection: { primaryColor: 'blue' } }, { ...brief, themeDirection: [] },
      { ...brief, direction: { big: 'x'.repeat(25_000) } }]) {
      assert.ok(readBrief(bad).error, JSON.stringify(bad)?.slice(0, 60))
    }
  })

  test('onboarding progress refuses secrets and oversize answers', () => {
    assert.ok(readOnboarding({ currentStep: 'type', completedSteps: ['type'], onboardingData: { profile: { name: 'A' } } }).value)
    assert.ok(readOnboarding({}).value, 'an empty body is an empty progress')
    assert.ok(readOnboarding({ onboardingData: { token: 'abc' } }).error)
    assert.ok(readOnboarding({ completedSteps: 'type' }).error)
    assert.ok(readOnboarding({ onboardingData: { text: 'x'.repeat(70_000) } }).error)
  })

  test('preferences need a plain key and a non-secret value', () => {
    assert.deepEqual(readPreference('widget-order', { value: [1] }), { value: [1] })
    assert.ok(readPreference('Bad Key!', { value: 1 }).error)
    assert.ok(readPreference('gemini-key', { value: 'x' }).error)
    assert.ok(readPreference('ok', { value: { password: 'x' } }).error)
    assert.ok(readPreference('ok', {}).error)
    assert.ok(readPreference('ok', { value: 'x'.repeat(17_000) }).error)
  })
})
