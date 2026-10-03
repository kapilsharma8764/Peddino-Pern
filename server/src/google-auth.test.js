import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { googleSignInEnabled, verifyGoogleCredential } from './google-auth.js'

// These run with no `GOOGLE_CLIENT_ID` set (nothing in the test environment
// configures it), so they exercise the "not configured" path rather than
// verifying a real Google-signed token — that would need a live network call
// to Google. `index.test.js`-style route tests cover the request/response
// shape; this covers the module not doing something unsafe when it is asked
// to verify a credential it was never set up to check.

describe('googleSignInEnabled', () => {
  test('is false when no client id is configured', () => {
    assert.equal(googleSignInEnabled(), false)
  })
})

describe('verifyGoogleCredential', () => {
  test('refuses to verify anything without a configured client id', async () => {
    assert.equal(await verifyGoogleCredential('whatever-looks-like-a-token'), null)
  })

  test('refuses a missing credential', async () => {
    assert.equal(await verifyGoogleCredential(''), null)
    assert.equal(await verifyGoogleCredential(undefined), null)
  })
})
