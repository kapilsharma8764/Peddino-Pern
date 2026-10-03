import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveSigningSecret } from './auth-config.js'

/**
 * Accounts and sessions.
 *
 * Passwords are hashed with scrypt and a per-user salt; sessions are signed
 * tokens rather than rows in a table, so nothing has to be looked up on every
 * request and nothing has to be cleaned up when they expire.
 *
 * Production requires a configured signing secret. In development, a random secret
 * is generated once and kept in `server/data/.session-secret`, so restarting
 * the server does not sign everyone out, yet no two machines share a secret.
 */

function localSecret() {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', '.session-secret')
  try {
    if (existsSync(file)) {
      const saved = readFileSync(file, 'utf8').trim()
      if (saved.length >= 32) return saved
    }
    const fresh = randomBytes(32).toString('hex')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, fresh)
    return fresh
  } catch {
    // A read-only disk still gets a working server, just one that signs
    // people out on restart.
    return randomBytes(32).toString('hex')
  }
}

const SECRET = resolveSigningSecret(process.env, localSecret)
const SESSION_DAYS = 30

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored ?? '').split(':')
  if (!salt || !hash) return false

  const attempt = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  // Lengths must match before timingSafeEqual, and comparing this way keeps a
  // wrong password from being distinguishable by how long the check took.
  if (attempt.length !== expected.length) return false
  return timingSafeEqual(attempt, expected)
}

function sign(payload) {
  return createHmac('sha256', SECRET).update(payload).digest('base64url')
}

function base64url(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

export function createToken(userId) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url({ alg: 'HS256', typ: 'JWT' })
  const payload = base64url({ sub: String(userId), iat: now, exp: now + SESSION_DAYS * 24 * 60 * 60 })
  const unsigned = `${header}.${payload}`
  return `${unsigned}.${sign(unsigned)}`
}

/** The user id in a token, or null if it is forged, altered or expired. */
export function readToken(token) {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 3) return null

  const [header, encodedPayload, signature] = parts
  const unsigned = `${header}.${encodedPayload}`

  const expected = Buffer.from(sign(unsigned))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null

  try {
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (decodedHeader?.alg !== 'HS256' || decodedHeader?.typ !== 'JWT') return null
    if (typeof payload?.sub !== 'string' || !payload.sub) return null
    if (!Number.isFinite(payload.exp) || payload.exp * 1000 < Date.now()) return null
    return payload.sub
  } catch {
    return null
  }
}

export function normaliseEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

/** A six-digit code for resetting a forgotten password. */
export function createResetCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

// Something@something.tld with no spaces — deliberately loose, since the only
// real proof an address works is a message reaching it. It only has to stop
// obvious junk (`a@b`, `x y@z.com`) from becoming an account.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL = 254
// scrypt does real work per attempt, so an unbounded password is a cheap way to
// burn a request's worth of CPU. No genuine password is this long.
const MAX_PASSWORD = 128

/** Why a sign-up should be refused, or null when it is fine. */
export function checkCredentials(email, password) {
  const address = normaliseEmail(email)
  if (address.length > MAX_EMAIL || !EMAIL_SHAPE.test(address)) return 'That does not look like an email address'
  const secret = String(password ?? '')
  if (secret.length < 8) return 'Please use a password of at least 8 characters'
  if (secret.length > MAX_PASSWORD) return `Please use a password of at most ${MAX_PASSWORD} characters`
  return null
}
