import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resetEmailEnabled, sendResetEmail } from './reset-email.js'

const env = { RESEND_API_KEY: 'private-key', SITEBUILDER_MAIL_FROM: 'Peddino <support@example.com>' }

test('reset email requires both credentials and never sends when configuration is missing', async () => {
  for (const configuration of [{}, { RESEND_API_KEY: 'key' }, { ...env, SITEBUILDER_MAIL_FROM: ' ' }]) {
    assert.equal(resetEmailEnabled(configuration), false)
    await assert.rejects(sendResetEmail('user@example.com', '123456', {
      env: configuration,
      fetchImpl: () => assert.fail('unconfigured email must not be sent'),
    }), /not configured/)
  }
})

test('reset email sends the code only to its recipient with an expiry and bounded request', async () => {
  await sendResetEmail('user@example.com', '123456', {
    env,
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails')
      assert.equal(options.headers.authorization, 'Bearer private-key')
      const body = JSON.parse(options.body)
      assert.deepEqual(body.to, ['user@example.com'])
      assert.match(body.text, /123456/)
      assert.match(body.text, /15 minutes/)
      assert.ok(options.signal instanceof AbortSignal)
      assert.ok(!options.body.includes(env.RESEND_API_KEY))
      return { ok: true }
    },
  })
})

test('provider rejection does not count as a sent reset email or reveal provider details', async () => {
  await assert.rejects(sendResetEmail('user@example.com', '123456', {
    env,
    fetchImpl: async () => ({ ok: false, text: () => 'private-key provider error' }),
  }), { message: 'Password reset email could not be sent' })
})
