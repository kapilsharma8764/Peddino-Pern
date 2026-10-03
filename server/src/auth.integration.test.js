import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import pg from 'pg'

/**
 * Sign-up, sign-in and JWT checks against the real Express app and a real
 * PostgreSQL - nothing mocked.
 *
 * Safety, because this writes accounts:
 *  - It only ever talks to a PostgreSQL on this machine. `DATABASE_URL` is
 *    honoured only when it points at localhost; anything else (a hosted
 *    address in your shell or in `server/.env`) is ignored, so a test run can
 *    never reach production data.
 *  - Every run uses its own throwaway schema, named at random, and drops
 *    exactly that schema at the end. Nothing else is read, changed or deleted.
 *  - The JWT secret is a random value made for this run. It is never printed.
 *
 * Without a local PostgreSQL this suite is skipped on a developer's machine,
 * and fails when `CI` is set - a pipeline that silently skipped its auth
 * checks would be worse than one that broke.
 */

const LOCAL_PG = /^postgres(ql)?:\/\/([^@/]*@)?(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/
const configured = process.env.DATABASE_URL
const PG_URL = configured && LOCAL_PG.test(configured) ? configured : 'postgresql://postgres@127.0.0.1:5432/sitebuilder'

const runId = randomBytes(4).toString('hex')
const SCHEMA = `sb_test_auth_${Date.now().toString(36)}_${runId}`
const SECRET = randomBytes(32).toString('hex')

async function pgReachable(url) {
  const probe = new pg.Client({ connectionString: url, connectionTimeoutMillis: 2500 })
  try {
    await probe.connect()
    await probe.query('select 1')
    return true
  } catch {
    return false
  } finally {
    await probe.end().catch(() => {})
  }
}

const reachable = await pgReachable(PG_URL)
const skip = !reachable && !process.env.CI ? 'PostgreSQL is not reachable on this machine (start it, or run in CI)' : false

// ?? helpers ????????????????????????????????????????????????????????????????

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

/** A JWT signed by us, so a rejection can only be about what is *in* it. */
function forgeToken(payload, { secret = SECRET, header = { alg: 'HS256', typ: 'JWT' } } = {}) {
  const unsigned = `${encode(header)}.${encode(payload)}`
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`
}

const now = () => Math.floor(Date.now() / 1000)
const freshPassword = () => `Pw-${randomBytes(9).toString('base64url')}`
const emailFor = (label) => `auth-it-${runId}-${label}@example.com`

describe('auth integration (PostgreSQL + JWT)', { skip }, () => {
  let server
  let baseUrl
  let closeStore
  let admin
  let users

  const alice = { email: emailFor('alice'), password: freshPassword(), name: 'Alice Test' }
  const bob = { email: emailFor('bob'), password: freshPassword(), name: 'Bob Test' }
  let aliceToken
  let aliceId
  let bobToken

  async function call(method, path, { token, body, headers } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : undefined, raw: text }
  }

  before(async () => {
    // The API reads these once, when it is first imported ? so they are set
    // first and the app is imported afterwards, never at the top of the file.
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = PG_URL
    process.env.SITEBUILDER_PG_SCHEMA = SCHEMA
    process.env.SITEBUILDER_SECRET = SECRET
    delete process.env.SITEBUILDER_DATA

    const { app } = await import('./index.js')
    ;({ closeStore } = await import('./store.js'))

    server = createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    baseUrl = `http://127.0.0.1:${server.address().port}`

    admin = new pg.Client({ connectionString: PG_URL, connectionTimeoutMillis: 5000 })
    await admin.connect()
    users = {
      async findOne({ email }) {
        const { rows } = await admin.query(`SELECT id, data FROM "${SCHEMA}".users WHERE data->>'email' = $1`, [email])
        return rows[0] ? { ...rows[0].data, id: rows[0].id } : null
      },
      async countDocuments({ email }) {
        const { rows } = await admin.query(`SELECT count(*)::int AS n FROM "${SCHEMA}".users WHERE data->>'email' = $1`, [email])
        return rows[0].n
      },
    }
  })

  after(async () => {
    // Drops only the schema this run created, and only if its name is one
    // this file generated.
    assert.match(SCHEMA, /^sb_test_auth_[a-z0-9]+_[0-9a-f]{8}$/)
    if (server) await new Promise((resolve) => server.close(resolve))
    if (closeStore) await closeStore().catch(() => {})
    if (admin) {
      await admin.query(`DROP SCHEMA "${SCHEMA}" CASCADE`)
      const { rows } = await admin.query('SELECT 1 FROM information_schema.schemata WHERE schema_name = $1', [SCHEMA])
      assert.equal(rows.length, 0, 'temporary schema was not dropped')
      await admin.end()
    }
  })

  // ?? sign-up ??????????????????????????????????????????????????????????????

  test('registers a new user and returns a signed JWT', async () => {
    const res = await call('POST', '/api/auth/register', { body: alice })
    assert.equal(res.status, 201)
    aliceToken = res.body.token
    aliceId = res.body.user.id
    assert.equal(res.body.user.email, alice.email)
    assert.equal(typeof aliceToken, 'string')
    assert.equal(aliceToken.split('.').length, 3, 'a JWT is header.payload.signature')

    const [header, payload] = aliceToken
      .split('.')
      .slice(0, 2)
      .map((part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')))
    assert.deepEqual(header, { alg: 'HS256', typ: 'JWT' })
    assert.equal(payload.sub, aliceId)
    assert.ok(Number.isInteger(payload.iat) && Number.isInteger(payload.exp))
    const lifetime = payload.exp - payload.iat
    assert.ok(lifetime >= 60 * 60 && lifetime <= 31 * 24 * 60 * 60, `expiry of ${lifetime}s should be sensible`)
  })

  test('the response never carries the password or its hash', async () => {
    const res = await call('POST', '/api/auth/register', { body: bob })
    assert.equal(res.status, 201)
    bobToken = res.body.token
    assert.doesNotMatch(res.raw, /password|scrypt/i)
    assert.ok(!res.raw.includes(bob.password))
  })

  test('the user really is in PostgreSQL, with a salted hash and not the password', async () => {
    const row = await users.findOne({ email: alice.email })
    assert.ok(row, 'user row exists in the users collection')
    assert.equal(row.id, aliceId)
    assert.notEqual(row.password, alice.password)
    assert.ok(!String(row.password).includes(alice.password))
    assert.match(row.password, /^[0-9a-f]{32}:[0-9a-f]{128}$/, 'salt:scrypt-hash')

    const other = await users.findOne({ email: bob.email })
    assert.notEqual(row.password.split(':')[0], other.password.split(':')[0], 'every user gets their own salt')
  })

  test('rejects a malformed email and a too-short password with 400', async () => {
    assert.equal((await call('POST', '/api/auth/register', { body: { email: 'not-an-email', password: freshPassword() } })).status, 400)
    assert.equal((await call('POST', '/api/auth/register', { body: { email: 'a@b', password: freshPassword() } })).status, 400)
    assert.equal((await call('POST', '/api/auth/register', { body: { email: emailFor('short'), password: 'short' } })).status, 400)
    assert.equal((await call('POST', '/api/auth/register', { body: { email: emailFor('short'), password: 'x'.repeat(129) } })).status, 400)
    assert.equal(await users.countDocuments({ email: emailFor('short') }), 0)
  })

  test('rejects a duplicate email with 409, whatever its letter case', async () => {
    const same = await call('POST', '/api/auth/register', { body: { ...alice, name: 'Someone Else' } })
    assert.equal(same.status, 409)
    assert.equal(same.body.token, undefined)

    const shouted = await call('POST', '/api/auth/register', { body: { ...alice, email: alice.email.toUpperCase() } })
    assert.equal(shouted.status, 409)
    assert.equal(await users.countDocuments({ email: alice.email }), 1)
  })

  test('refuses database operator objects in place of an email or password', async () => {
    const res = await call('POST', '/api/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } })
    assert.equal(res.status, 400)
  })

  // ?? sign-in ??????????????????????????????????????????????????????????????

  test('logs in with the right password: 200 and a JWT for the same user', async () => {
    const res = await call('POST', '/api/auth/login', { body: { email: alice.email, password: alice.password } })
    assert.equal(res.status, 200)
    assert.equal(res.body.token.split('.').length, 3)
    assert.equal(res.body.user.id, aliceId)
    aliceToken = res.body.token
  })

  test('logs in with the email typed in another case', async () => {
    const res = await call('POST', '/api/auth/login', { body: { email: `  ${alice.email.toUpperCase()} `, password: alice.password } })
    assert.equal(res.status, 200)
  })

  test('wrong password and unknown email are both 401 with the same message and no token', async () => {
    const wrong = await call('POST', '/api/auth/login', { body: { email: alice.email, password: `${alice.password}x` } })
    const unknown = await call('POST', '/api/auth/login', { body: { email: emailFor('nobody'), password: alice.password } })
    for (const res of [wrong, unknown]) {
      assert.equal(res.status, 401)
      assert.equal(res.body.token, undefined)
    }
    assert.equal(wrong.body.error, unknown.body.error, 'must not reveal which emails have accounts')
  })

  // ?? bearer tokens ????????????????????????????????????????????????????????

  test('GET /api/auth/me with a Bearer JWT returns the registered user', async () => {
    const res = await call('GET', '/api/auth/me', { token: aliceToken })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.email, alice.email)
    assert.equal(res.body.user.id, aliceId)
    assert.doesNotMatch(res.raw, /password/i)
  })

  test('control: a token forged with the right secret is accepted, so the rejections below mean something', async () => {
    const res = await call('GET', '/api/auth/me', { token: forgeToken({ sub: aliceId, iat: now(), exp: now() + 600 }) })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.email, alice.email)
  })

  const PROTECTED = [
    ['GET', '/api/auth/me'],
    ['GET', '/api/sites'],
    ['POST', '/api/sites'],
    ['GET', '/api/leads'],
  ]

  test('protected endpoints answer 401 with no token at all', async () => {
    for (const [method, path] of PROTECTED) {
      const res = await call(method, path, { body: method === 'POST' ? { config: { blocks: [] } } : undefined })
      assert.equal(res.status, 401, `${method} ${path}`)
    }
  })

  test('protected endpoints answer 401 for fake, tampered, expired and wrongly-signed JWTs', async () => {
    const [header, payload, signature] = aliceToken.split('.')
    const swappedPayload = encode({ sub: aliceId, iat: now(), exp: now() + 99_999_999 })
    const bobPayload = encode({ sub: 'someone-else', iat: now(), exp: now() + 600 })

    const bad = {
      'random text': 'not-a-token',
      'three junk segments': 'aaa.bbb.ccc',
      'payload swapped, old signature kept': `${header}.${swappedPayload}.${signature}`,
      'user swapped, old signature kept': `${header}.${bobPayload}.${signature}`,
      'signature removed': `${header}.${payload}.`,
      'one character appended': `${aliceToken}x`,
      'signed with a different secret': forgeToken({ sub: aliceId, iat: now(), exp: now() + 600 }, { secret: randomBytes(32).toString('hex') }),
      'expired an hour ago (correct signature)': forgeToken({ sub: aliceId, iat: now() - 7200, exp: now() - 3600 }),
      'no expiry claim (correct signature)': forgeToken({ sub: aliceId, iat: now() }),
      'no subject claim (correct signature)': forgeToken({ iat: now(), exp: now() + 600 }),
      'alg "none"': `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ sub: aliceId, iat: now(), exp: now() + 600 })}.`,
      'alg switched to HS512': forgeToken({ sub: aliceId, iat: now(), exp: now() + 600 }, { header: { alg: 'HS512', typ: 'JWT' } }),
      'valid signature, user that does not exist': forgeToken({ sub: 'no-such-user', iat: now(), exp: now() + 600 }),
    }

    for (const [label, token] of Object.entries(bad)) {
      for (const [method, path] of PROTECTED) {
        const res = await call(method, path, { token, body: method === 'POST' ? { config: { blocks: [] } } : undefined })
        assert.equal(res.status, 401, `${label} ? ${method} ${path}`)
      }
    }
  })

  test('the Authorization header must be the Bearer scheme', async () => {
    assert.equal((await call('GET', '/api/auth/me', { headers: { authorization: aliceToken } })).status, 401)
    assert.equal((await call('GET', '/api/auth/me', { headers: { authorization: `Basic ${aliceToken}` } })).status, 401)
    assert.equal((await call('GET', '/api/auth/me', { headers: { authorization: 'Bearer ' } })).status, 401)
  })

  // ?? one user cannot reach another's data ?????????????????????????????????

  describe('data belongs to its owner', () => {
    let siteId
    let leadId

    test('a user creates and reads their own site', async () => {
      const created = await call('POST', '/api/sites', { token: aliceToken, body: { name: 'Alice site', config: { blocks: [] } } })
      assert.equal(created.status, 201)
      siteId = created.body.id
      assert.equal(created.body.userId, aliceId)
      assert.equal((await call('GET', `/api/sites/${siteId}`, { token: aliceToken })).status, 200)
    })

    test('another user gets 404 ? not the site, not even confirmation it exists', async () => {
      assert.equal((await call('GET', `/api/sites/${siteId}`, { token: bobToken })).status, 404)
      assert.equal((await call('PUT', `/api/sites/${siteId}`, { token: bobToken, body: { name: 'hijacked' } })).status, 404)
      assert.equal((await call('POST', `/api/sites/${siteId}/publish`, { token: bobToken, body: { html: '<p>x</p>' } })).status, 404)
      assert.equal((await call('DELETE', `/api/sites/${siteId}`, { token: bobToken })).status, 404)

      const bobsList = await call('GET', '/api/sites', { token: bobToken })
      assert.equal(bobsList.status, 200)
      assert.deepEqual(bobsList.body, [])

      const still = await call('GET', `/api/sites/${siteId}`, { token: aliceToken })
      assert.equal(still.status, 200)
      assert.equal(still.body.name, 'Alice site', 'the owner\'s site is untouched')
    })

    test('a visitor can send an enquiry to a site without an account', async () => {
      const res = await call('POST', '/api/leads', { body: { siteId, slug: null, name: 'Visitor', email: 'visitor@example.com', message: 'Hello' } })
      assert.equal(res.status, 201)
      leadId = res.body.id
    })

    test('only the site owner can read enquiries', async () => {
      const bobs = await call('GET', '/api/leads', { token: bobToken })
      assert.equal(bobs.status, 200)
      assert.deepEqual(bobs.body, [])
      assert.deepEqual((await call('GET', `/api/leads?siteId=${siteId}`, { token: bobToken })).body, [])

      const alices = await call('GET', '/api/leads', { token: aliceToken })
      assert.deepEqual(alices.body.map((lead) => lead.id), [leadId])
    })

    test('only the site owner can change or delete an enquiry', async () => {
      assert.equal((await call('PATCH', `/api/leads/${leadId}`, { token: bobToken, body: { status: 'lost' } })).status, 404)
      assert.equal((await call('DELETE', `/api/leads/${leadId}`, { token: bobToken })).status, 404)

      const untouched = await call('GET', '/api/leads', { token: aliceToken })
      assert.equal(untouched.body.length, 1, 'the enquiry survived the other user\'s delete')
      assert.equal(untouched.body[0].status, 'new', 'and kept its status')

      const changed = await call('PATCH', `/api/leads/${leadId}`, { token: aliceToken, body: { status: 'contacted' } })
      assert.equal(changed.status, 200)
      assert.equal(changed.body.status, 'contacted')
      assert.equal((await call('DELETE', `/api/leads/${leadId}`, { token: aliceToken })).status, 204)
    })

    test('enquiries with no owning site cannot be changed by any account', async () => {
      const orphan = await call('POST', '/api/leads', { body: { name: 'Nobody\'s enquiry', message: 'no site' } })
      assert.equal(orphan.status, 201)
      assert.equal((await call('PATCH', `/api/leads/${orphan.body.id}`, { token: aliceToken, body: { status: 'won' } })).status, 404)
      assert.equal((await call('DELETE', `/api/leads/${orphan.body.id}`, { token: aliceToken })).status, 404)
    })
  })
});
