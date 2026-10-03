import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { resolveSigningSecret } from './auth-config.js'

test('production rejects missing, empty, whitespace and short secrets without fallback', () => {
  for (const secret of [undefined, '', ' '.repeat(40), 'short', `  ${'a'.repeat(31)}  `]) {
    let fallbackCalled = false
    assert.throws(() => resolveSigningSecret({ NODE_ENV: 'production', SITEBUILDER_SECRET: secret }, () => {
      fallbackCalled = true
    }), /SITEBUILDER_SECRET must contain/)
    assert.equal(fallbackCalled, false)
  }
})

test('configured key is preserved exactly and development can use local fallback', () => {
  const key = ` ${randomBytes(32).toString('hex')} `
  assert.ok(resolveSigningSecret({ NODE_ENV: 'production', SITEBUILDER_SECRET: key }) === key)
  assert.equal(resolveSigningSecret({ NODE_ENV: 'development' }, () => 'local-test-value'), 'local-test-value')
})

const authUrl = new URL('./auth.js', import.meta.url).href
function run(source, extraEnv = {}) {
  const env = { ...process.env, NODE_ENV: 'production', ...extraEnv }
  if (!Object.hasOwn(extraEnv, 'SITEBUILDER_SECRET')) delete env.SITEBUILDER_SECRET
  return spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    env, encoding: 'utf8', timeout: 10000,
  })
}

test('actual production auth import refuses missing configuration', () => {
  const result = run(`await import(${JSON.stringify(authUrl)})`)
  assert.equal(result.status, 1)
  assert.ok(result.stderr.includes('SITEBUILDER_SECRET must contain'))
  assert.equal(result.stdout, '')
})

test('separate production processes verify the same configured signing key', () => {
  const key = randomBytes(32).toString('hex')
  const signer = run(`const {createToken}=await import(${JSON.stringify(authUrl)}); process.stdout.write(createToken('test-user'))`, {
    SITEBUILDER_SECRET: key,
  })
  assert.equal(signer.status, 0)
  // Token and key remain internal to the test, never passed as command arguments.
  const source = `const {readToken}=await import(${JSON.stringify(authUrl)}); process.exit(readToken(process.env.TEST_TOKEN)==='test-user'?0:1)`
  const verified = run(source, { SITEBUILDER_SECRET: key, TEST_TOKEN: signer.stdout })
  assert.equal(verified.status, 0)
  const wrongKey = run(source, { SITEBUILDER_SECRET: randomBytes(32).toString('hex'), TEST_TOKEN: signer.stdout })
  assert.equal(wrongKey.status, 1)
})
