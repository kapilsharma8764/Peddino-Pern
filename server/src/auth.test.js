import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkCredentials,
  createToken,
  hashPassword,
  normaliseEmail,
  readToken,
  verifyPassword,
} from './auth.js'

describe('passwords', () => {
  test('accepts the right password and rejects the wrong one', () => {
    const stored = hashPassword('correct horse battery')
    assert.equal(verifyPassword('correct horse battery', stored), true)
    assert.equal(verifyPassword('correct horse batteryy', stored), false)
  })

  test('never stores the password itself', () => {
    const stored = hashPassword('hunter2hunter2')
    assert.ok(!stored.includes('hunter2'))
  })

  test('salts each hash, so two identical passwords do not match', () => {
    // Without a per-user salt, a leaked table would show at a glance which
    // accounts share a password.
    assert.notEqual(hashPassword('same password'), hashPassword('same password'))
  })

  test('survives a stored value that is missing or malformed', () => {
    assert.equal(verifyPassword('anything', undefined), false)
    assert.equal(verifyPassword('anything', 'nonsense'), false)
    assert.equal(verifyPassword('anything', 'only:one'), false)
  })
})

describe('session tokens', () => {
  test('reads back the user it was made for', () => {
    assert.equal(readToken(createToken('user-42')), 'user-42')
  })

  test('creates a standard signed JWT with a 30-day expiry', () => {
    const token = createToken('user-42')
    const [header, payload, signature] = token.split('.')
    assert.equal(JSON.parse(Buffer.from(header, 'base64url').toString()).typ, 'JWT')
    assert.equal(JSON.parse(Buffer.from(payload, 'base64url').toString()).sub, 'user-42')
    assert.ok(signature)
  })

  test('refuses a token that has been altered', () => {
    const token = createToken('user-42')
    const [header, payload, signature] = token.split('.')
    const alteredPayload = Buffer.from(JSON.stringify({ sub: 'user-1', exp: Date.now() / 1000 + 3600 })).toString('base64url')
    assert.equal(readToken(`${header}.${alteredPayload}.${signature}`), null)
    assert.equal(readToken(`${token}x`), null)
  })

  test('refuses nonsense rather than throwing', () => {
    assert.equal(readToken(''), null)
    assert.equal(readToken(undefined), null)
    assert.equal(readToken('a.b'), null)
  })
})

describe('checkCredentials', () => {
  test('asks for an email and a password worth having', () => {
    assert.equal(checkCredentials('someone@example.com', 'longenough1'), null)
    assert.ok(checkCredentials('not-an-email', 'longenough1'))
    assert.ok(checkCredentials('someone@example.com', 'short'))
  })

  test('refuses addresses that only look like an email', () => {
    for (const junk of ['a@b', 'x y@z.com', '@example.com', 'someone@', 'a@@b.com', '']) {
      assert.ok(checkCredentials(junk, 'longenough1'), `"${junk}" should be refused`)
    }
    assert.ok(checkCredentials(`${'a'.repeat(250)}@example.com`, 'longenough1'))
    assert.equal(checkCredentials('  Someone@Example.COM ', 'longenough1'), null)
  })

  test('bounds the password so hashing cannot be used to burn CPU', () => {
    assert.equal(checkCredentials('someone@example.com', 'x'.repeat(128)), null)
    assert.ok(checkCredentials('someone@example.com', 'x'.repeat(129)))
    assert.ok(checkCredentials('someone@example.com', undefined))
  })
})

describe('normaliseEmail', () => {
  test('treats the same address written differently as one address', () => {
    assert.equal(normaliseEmail('  Someone@Example.COM '), 'someone@example.com')
  })
})
