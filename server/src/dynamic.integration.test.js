import './load-env.js'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import pg from 'pg'

/**
 * Migrations, seeds, the content / pricing / template / per-user APIs and the
 * PostgreSQL rate-limit store, against the real Express app and a real
 * PostgreSQL. Same safety rules as auth.integration.test.js: only a local
 * database, one throwaway schema per run, dropped at the end.
 */

const LOCAL_PG = /^postgres(ql)?:\/\/([^@/]*@)?(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/
const configured = process.env.DATABASE_URL
const PG_URL = configured && LOCAL_PG.test(configured) ? configured : 'postgresql://postgres@127.0.0.1:5432/sitebuilder'
const runId = randomBytes(4).toString('hex')
const SCHEMA = `sb_test_dyn_${Date.now().toString(36)}_${runId}`

async function pgReachable(url) {
  const probe = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2500 })
  try { await probe.connect(); await probe.query('select 1'); return true } catch { return false } finally { await probe.end().catch(() => {}) }
}
const reachable = await pgReachable(PG_URL)
const skip = !reachable && !process.env.CI ? 'PostgreSQL is not reachable on this machine (start it, or run in CI)' : false

describe('content, templates, per-user data and rate limits (PostgreSQL)', { skip }, () => {
  let server, baseUrl, closeStore, admin
  let migrate, seedContent, repo, PgRateLimitStore
  let alice, bob

  async function call(method, path, { token, body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : undefined, headers: response.headers }
  }
  const count = async (table) => (await admin.query(`SELECT count(*)::int AS n FROM "${SCHEMA}"."${table}"`)).rows[0].n

  before(async () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = PG_URL
    process.env.SITEBUILDER_PG_SCHEMA = SCHEMA
    process.env.SITEBUILDER_SECRET = randomBytes(32).toString('hex')
    delete process.env.SITEBUILDER_DATA

    const { app } = await import('./index.js')
    ;({ closeStore } = await import('./store.js'))
    ;({ applyMigrations: migrate } = await import('./migrations.js'))
    ;({ seedContent } = await import('./seed.js'))
    repo = await import('./repositories/layout-templates.js')
    ;({ PgRateLimitStore } = await import('./rate-limit-store.js'))

    server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`
    admin = new pg.Client({ connectionString: PG_URL, connectionTimeoutMillis: 5000 })
    await admin.connect()

    // Two accounts, and the seeded content, for everything below.
    const make = async (label) => {
      const res = await call('POST', '/api/auth/register', { body: { email: `dyn-${runId}-${label}@example.com`, password: `Pw-${randomBytes(9).toString('base64url')}`, name: label } })
      assert.equal(res.status, 201)
      return { token: res.body.token, id: res.body.user.id }
    }
    alice = await make('alice')
    bob = await make('bob')
    await seedContent()
  })

  after(async () => {
    assert.match(SCHEMA, /^sb_test_dyn_[a-z0-9]+_[0-9a-f]{8}$/)
    if (server) await new Promise((resolve) => server.close(resolve))
    if (closeStore) await closeStore().catch(() => {})
    if (admin) {
      await admin.query(`DROP SCHEMA "${SCHEMA}" CASCADE`)
      await admin.end()
    }
  })

  // ── migrations and seeds ────────────────────────────────────────────────

  test('every migration is applied once and re-running changes nothing', async () => {
    const done = (await admin.query(`SELECT name FROM "${SCHEMA}".schema_migrations ORDER BY name`)).rows.map((row) => row.name)
    assert.deepEqual(done, ['001_content_tables.sql', '002_layout_templates.sql', '003_user_data.sql', '004_rate_limits.sql'])
    const pool = new pg.Pool({ connectionString: PG_URL })
    try { assert.deepEqual(await migrate(pool, SCHEMA), []) } finally { await pool.end() }
  })

  test('seeding is idempotent and loads all the current content', async () => {
    const before = [await count('website_types'), await count('starter_designs'), await count('business_presets'), await count('pricing_plans'), await count('site_content')]
    assert.deepEqual(before, [29, 12, 7, 3, 24])
    await seedContent()
    const after = [await count('website_types'), await count('starter_designs'), await count('business_presets'), await count('pricing_plans'), await count('site_content')]
    assert.deepEqual(after, before)
  })

  // ── content, pricing, catalog ───────────────────────────────────────────

  test('pricing: list, one plan, unknown and malformed names', async () => {
    const list = await call('GET', '/api/pricing')
    assert.equal(list.status, 200)
    assert.deepEqual(list.body.plans.map((plan) => plan.slug), ['free', 'pro', 'business'])
    assert.equal(list.body.plans[0].featured, true)
    assert.equal(list.body.plans[1].comingSoon, true)
    assert.equal((await call('GET', '/api/pricing/pro')).body.priceLabel, 'Coming soon')
    assert.equal((await call('GET', '/api/pricing/nope')).status, 404)
    assert.equal((await call('GET', '/api/pricing/Bad Slug!')).status, 400)
  })

  test('an inactive plan is not served', async () => {
    await admin.query(`UPDATE "${SCHEMA}".pricing_plans SET is_active = false WHERE slug = 'business'`)
    assert.deepEqual((await call('GET', '/api/pricing')).body.plans.map((plan) => plan.slug), ['free', 'pro'])
    assert.equal((await call('GET', '/api/pricing/business')).status, 404)
    await admin.query(`UPDATE "${SCHEMA}".pricing_plans SET is_active = true WHERE slug = 'business'`)
  })

  test('marketing content by page', async () => {
    const features = await call('GET', '/api/content/features')
    assert.equal(features.status, 200)
    assert.deepEqual(features.body.sections.map((s) => s.sectionKey), ['hero', 'proof', 'build', 'design', 'publish', 'cta'])
    assert.equal((await call('GET', '/api/content/no-such-page')).status, 404)
    assert.equal((await call('GET', '/api/content/..%2Fetc')).status, 400)
  })

  test('website types, starter designs and business presets', async () => {
    assert.equal((await call('GET', '/api/website-types')).body.items.length, 29)
    assert.equal((await call('GET', '/api/starter-designs')).body.items.length, 12)
    const school = await call('GET', '/api/starter-designs?type=school')
    assert.deepEqual(school.body.items.map((d) => d.slug), ['education', 'light-elegant', 'modern-business'])
    assert.equal((await call('GET', '/api/starter-designs?type=zzz')).status, 404)
    assert.equal((await call('GET', '/api/starter-designs?type=Bad!')).status, 400)
    const presets = (await call('GET', '/api/business-presets')).body.items
    assert.deepEqual(presets.filter((p) => p.isChip).map((p) => p.slug), ['cafe', 'school', 'portfolio', 'restaurant', 'ecommerce', 'real-estate'])
    assert.equal((await call('GET', '/api/business-presets/cafe')).body.businessType, 'Cafe')
    assert.equal((await call('GET', '/api/business-presets/nope')).status, 404)
  })

  // ── layout templates ────────────────────────────────────────────────────

  test('layout templates: list, filter, search, page, detail, default, missing', async () => {
    const make = (slug, category, extra = {}) => ({
      slug, name: `Template ${slug}`, category, description: `A ${category} design called ${slug}`, thumbnail: null,
      templateData: { id: slug, name: `Template ${slug}`, category, home: [{ type: 'hero', variant: 'split', props: {} }], pages: [], header: [], footer: [], theme: {} },
      previewData: { theme: {}, header: [], home: [] }, tags: [category, 'sample'], pageCount: 1, imageStatus: 'partial', sortOrder: 10, ...extra,
    })
    await repo.upsertTemplate(make('alpha-school', 'education'))
    await repo.upsertTemplate(make('beta-school', 'education', { sortOrder: 20 }))
    await repo.upsertTemplate(make('gamma-cafe', 'food', { sortOrder: 30 }))
    await repo.upsertTemplate(make('alpha-school', 'education')) // same slug again: replaced, not duplicated
    assert.equal(await count('templates'), 3)

    const all = await call('GET', '/api/layout-templates')
    assert.equal(all.body.total, 3)
    assert.equal(all.body.items[0].template, undefined, 'the list never carries the full tree')
    assert.equal(all.body.items[0].imageStatus, 'partial')
    assert.deepEqual((await call('GET', '/api/layout-templates?category=food')).body.items.map((t) => t.slug), ['gamma-cafe'])
    assert.deepEqual((await call('GET', '/api/layout-templates?search=GAMMA')).body.items.map((t) => t.slug), ['gamma-cafe'])
    assert.equal((await call('GET', '/api/layout-templates?search=%25')).body.total, 0, 'a % in a search is literal')
    assert.deepEqual((await call('GET', '/api/layout-templates?tag=sample&limit=2&page=2')).body.items.map((t) => t.slug), ['gamma-cafe'])
    assert.equal((await call('GET', '/api/layout-templates?limit=9999')).body.pageSize, 200)
    assert.equal((await call('GET', '/api/layout-templates?category=Bad!')).status, 400)

    const detail = await call('GET', '/api/layout-templates/beta-school')
    assert.equal(detail.body.template.id, 'beta-school')
    assert.equal((await call('GET', '/api/layout-templates/missing')).status, 404)
    assert.equal((await call('GET', '/api/layout-templates/Bad!')).status, 400)
    assert.equal((await call('GET', '/api/layout-templates/default?category=education')).body.slug, 'alpha-school')
    assert.equal((await call('GET', '/api/layout-templates/default?category=nothing')).body.slug, 'alpha-school', 'unknown category still gets a starting template')
  })

  // ── per-user data ───────────────────────────────────────────────────────

  test('/api/me needs a signed-in user', async () => {
    for (const [method, path] of [['GET', '/api/me/business-brief'], ['PUT', '/api/me/onboarding'], ['GET', '/api/me/preferences'], ['PUT', '/api/me/preferences/x']]) {
      assert.equal((await call(method, path, method === 'GET' ? {} : { body: {} })).status, 401, `${method} ${path}`)
    }
  })

  test('business brief: save, read back, replace, validate', async () => {
    assert.equal((await call('GET', '/api/me/business-brief', { token: alice.token })).body.brief, null)
    const brief = {
      description: 'A modern neighbourhood café serving coffee', selectedPreset: 'cafe', businessType: 'Cafe',
      recommendedPages: ['Home', 'Menu'], recommendedFeatures: ['Gallery'], suggestedTemplateCategory: 'Food & Dining',
      themeDirection: { style: 'Warm', primaryColor: '#8c5a2b', accentColor: '#e9b872' },
    }
    const created = await call('POST', '/api/me/business-brief', { token: alice.token, body: { ...brief, userId: bob.id, user_id: bob.id } })
    assert.equal(created.status, 201)
    const again = await call('POST', '/api/me/business-brief', { token: alice.token, body: { ...brief, description: 'Changed café brief' } })
    assert.equal(again.status, 200)
    assert.equal((await call('PUT', '/api/me/business-brief', { token: alice.token, body: { ...brief, description: 'Final café brief' } })).status, 200)
    assert.equal((await call('GET', '/api/me/business-brief', { token: alice.token })).body.brief.description, 'Final café brief')

    // It is stored for the signed-in user, whatever the body claimed, and bob sees none of it.
    const rows = (await admin.query(`SELECT user_id FROM "${SCHEMA}".user_business_briefs`)).rows
    assert.deepEqual(rows, [{ user_id: alice.id }])
    assert.equal((await call('GET', '/api/me/business-brief', { token: bob.token })).body.brief, null)

    for (const bad of [{ ...brief, description: 42 }, { ...brief, selectedPreset: 'Not A Slug' }, { ...brief, themeDirection: { primaryColor: 'red' } }, { ...brief, recommendedPages: 'Home' }, 'text']) {
      assert.equal((await call('PUT', '/api/me/business-brief', { token: alice.token, body: bad })).status, 400, JSON.stringify(bad).slice(0, 50))
    }
  })

  test('onboarding progress: save, read, isolate, refuse secrets', async () => {
    assert.equal((await call('GET', '/api/me/onboarding', { token: alice.token })).body.onboarding, null)
    const progress = { currentStep: 'details', completedSteps: ['type'], onboardingData: { onboarding: { typeId: 'school', pages: ['About'] }, profile: { name: 'Bright Future' } } }
    const saved = await call('PUT', '/api/me/onboarding', { token: alice.token, body: progress })
    assert.equal(saved.status, 200)
    assert.deepEqual((await call('GET', '/api/me/onboarding', { token: alice.token })).body.onboarding.onboardingData.profile, { name: 'Bright Future' })
    assert.equal((await call('GET', '/api/me/onboarding', { token: bob.token })).body.onboarding, null)
    const leaky = await call('PUT', '/api/me/onboarding', { token: alice.token, body: { ...progress, onboardingData: { profile: { geminiKey: 'AIza-secret' } } } })
    assert.equal(leaky.status, 400)
    assert.equal((await call('PUT', '/api/me/onboarding', { token: alice.token, body: { currentStep: 'x', completedSteps: 'no' } })).status, 400)
  })

  test('preferences: save, list, delete, never keys or tokens', async () => {
    assert.equal((await call('PUT', '/api/me/preferences/widget-order', { token: alice.token, body: { value: ['a', 'b'] } })).status, 200)
    assert.deepEqual((await call('GET', '/api/me/preferences', { token: alice.token })).body.preferences, { 'widget-order': ['a', 'b'] })
    assert.deepEqual((await call('GET', '/api/me/preferences', { token: bob.token })).body.preferences, {})
    assert.equal((await call('PUT', '/api/me/preferences/gemini-key', { token: alice.token, body: { value: 'x' } })).status, 400)
    assert.equal((await call('PUT', '/api/me/preferences/ok', { token: alice.token, body: { value: { apiKey: 'x' } } })).status, 400)
    assert.equal((await call('PUT', '/api/me/preferences/ok', { token: alice.token, body: {} })).status, 400)
    assert.equal((await call('DELETE', '/api/me/preferences/widget-order', { token: bob.token })).status, 404)
    assert.equal((await call('DELETE', '/api/me/preferences/widget-order', { token: alice.token })).status, 204)
  })

  test('deleting a user removes their rows', async () => {
    const carol = await call('POST', '/api/auth/register', { body: { email: `dyn-${runId}-carol@example.com`, password: `Pw-${randomBytes(9).toString('base64url')}`, name: 'Carol' } })
    await call('PUT', '/api/me/onboarding', { token: carol.body.token, body: { currentStep: 'type' } })
    assert.equal(await count('user_onboarding'), 2)
    await admin.query(`DELETE FROM "${SCHEMA}".users WHERE id = $1`, [carol.body.user.id])
    assert.equal(await count('user_onboarding'), 1)
  })

  // ── rate limits ─────────────────────────────────────────────────────────

  test('rate-limit counters live in PostgreSQL and survive a new store (a restart)', async () => {
    const options = { windowMs: 60_000 }
    const first = new PgRateLimitStore('test-limit'); first.init(options)
    assert.equal((await first.increment('1.2.3.4')).totalHits, 1)
    assert.equal((await first.increment('1.2.3.4')).totalHits, 2)
    const afterRestart = new PgRateLimitStore('test-limit'); afterRestart.init(options)
    assert.equal((await afterRestart.increment('1.2.3.4')).totalHits, 3)
    assert.equal((await afterRestart.get('1.2.3.4')).totalHits, 3)
    assert.equal((await afterRestart.increment('5.6.7.8')).totalHits, 1, 'another client has its own count')
    const other = new PgRateLimitStore('other-limit'); other.init(options)
    assert.equal((await other.increment('1.2.3.4')).totalHits, 1, 'another limiter has its own count')
    await afterRestart.decrement('1.2.3.4')
    assert.equal((await afterRestart.get('1.2.3.4')).totalHits, 2)
    await afterRestart.resetKey('1.2.3.4')
    assert.equal(await afterRestart.get('1.2.3.4'), undefined)
  })

  test('a window that has passed starts a fresh count', async () => {
    const store = new PgRateLimitStore('short-window'); store.init({ windowMs: 150 })
    assert.equal((await store.increment('k')).totalHits, 1)
    assert.equal((await store.increment('k')).totalHits, 2)
    await new Promise((resolve) => setTimeout(resolve, 250))
    assert.equal((await store.increment('k')).totalHits, 1)
  })

  test('the API limiter writes its counter to the database', async () => {
    await call('GET', '/api/health')
    const rows = (await admin.query(`SELECT key, hits FROM "${SCHEMA}".rate_limits WHERE key LIKE 'general:%'`)).rows
    assert.ok(rows.length >= 1 && rows[0].hits >= 1)
  })
})
