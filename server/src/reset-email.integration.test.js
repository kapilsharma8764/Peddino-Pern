import './load-env.js'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import pg from 'pg'

const local = /^postgres(ql)?:\/\/([^@/]*@)?(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/
const url = local.test(process.env.DATABASE_URL ?? '') ? process.env.DATABASE_URL : 'postgresql://postgres@127.0.0.1:5432/sitebuilder'
const schema = `sb_test_mail_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`
const admin = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2500 })
let reachable = false
try { await admin.connect(); await admin.query('SELECT 1'); reachable = true } catch { await admin.end().catch(() => {}) }

describe('production password reset integration', { skip: !reachable && !process.env.CI ? 'Local PostgreSQL is unavailable' : false }, () => {
  let server, base, closeStore
  let sent
  const realFetch = globalThis.fetch
  const email = 'reset-check@example.com'
  const post = async (path, body) => {
    const response = await realFetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    return { status: response.status, body: await response.json() }
  }

  before(async () => {
    process.env.NODE_ENV = 'production'
    process.env.VERCEL = '1'
    process.env.DATABASE_URL = url
    process.env.SITEBUILDER_PG_SCHEMA = schema
    process.env.SITEBUILDER_SECRET = randomBytes(32).toString('hex')
    process.env.RATE_LIMIT_AUTH = '100000'
    delete process.env.SITEBUILDER_OWNER_EMAIL
    delete process.env.SITEBUILDER_OWNER_PASSWORD
    delete process.env.RESEND_API_KEY
    delete process.env.SITEBUILDER_MAIL_FROM
    const { app } = await import('./index.js')
    ;({ closeStore } = await import('./store.js'))
    server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${server.address().port}`
    assert.equal((await post('/api/auth/register', { email, password: 'Original-password-123' })).status, 201)
  })

  after(async () => {
    globalThis.fetch = realFetch
    if (server) await new Promise((resolve) => server.close(resolve))
    if (closeStore) await closeStore()
    assert.match(schema, /^sb_test_mail_[a-z0-9]+_[0-9a-f]{8}$/)
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
    await admin.end()
  })

  test('missing email setup returns 503 for every address without claiming success', async () => {
    for (const address of [email, 'unknown@example.com']) {
      const result = await post('/api/auth/forgot', { email: address })
      assert.equal(result.status, 503)
      assert.equal(result.body.devCode, undefined)
      assert.equal(result.body.ok, undefined)
    }
  })

  test('configured email delivers a code without exposing it and the code resets the password', async () => {
    process.env.RESEND_API_KEY = 'fake-provider-key'
    process.env.SITEBUILDER_MAIL_FROM = 'support@example.com'
    globalThis.fetch = async (endpoint, options) => {
      assert.equal(endpoint, 'https://api.resend.com/emails')
      sent = JSON.parse(options.body)
      return { ok: true }
    }
    const forgot = await post('/api/auth/forgot', { email })
    assert.equal(forgot.status, 200)
    assert.equal(forgot.body.devCode, undefined)
    assert.deepEqual(sent.to, [email])
    const code = sent.text.match(/\b\d{6}\b/)[0]
    assert.ok(!JSON.stringify(forgot.body).includes(code))
    const unknown = await post('/api/auth/forgot', { email: 'unknown@example.com' })
    assert.deepEqual(unknown.body, forgot.body)
    assert.equal((await post('/api/auth/reset', { email, code, password: 'Updated-password-456' })).status, 200)
    assert.equal((await post('/api/auth/login', { email, password: 'Updated-password-456' })).status, 200)
  })

  test('provider failure returns an availability error without a code or credentials', async () => {
    globalThis.fetch = async () => ({ ok: false })
    const result = await post('/api/auth/forgot', { email })
    assert.equal(result.status, 503)
    assert.equal(result.body.devCode, undefined)
    assert.ok(!JSON.stringify(result.body).includes(process.env.RESEND_API_KEY))
  })
})
