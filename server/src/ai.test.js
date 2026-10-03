import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { askGemini, readAiRequest, registerAiRoutes } from './ai.js'

const good = { system: 'Reply in JSON', messages: [{ role: 'user', text: 'Hello' }] }

test('readAiRequest accepts a normal request and clamps temperature', () => {
  assert.deepEqual(readAiRequest({ ...good, temperature: 5 }), { system: 'Reply in JSON', messages: [{ role: 'user', text: 'Hello' }], temperature: 1 })
  assert.equal(readAiRequest(good).temperature, 0.4)
})

test('readAiRequest refuses missing, oversized and malformed input', () => {
  for (const body of [null, {}, { ...good, system: ' ' }, { ...good, messages: [] }, { ...good, messages: [{ role: 'admin', text: 'x' }] },
    { ...good, system: 'x'.repeat(60_001) }, { ...good, messages: [{ role: 'user', text: 'x'.repeat(6_001) }] },
    { ...good, messages: Array.from({ length: 13 }, () => ({ role: 'user', text: 'x' })) }]) {
    assert.ok('error' in readAiRequest(body))
  }
})

test('askGemini sends the key in a header and returns the text', async () => {
  let seen
  const text = await askGemini(readAiRequest(good), {
    key: 'k',
    fetchImpl: async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"a":1}' }] } }] }) } },
  })
  assert.equal(text, '{"a":1}')
  assert.equal(seen.init.headers['x-goog-api-key'], 'k')
  assert.ok(!seen.url.includes('key='))
})

async function serve(options) {
  const app = express()
  app.use(express.json())
  const requireUser = (handler) => (req, res, next) => (req.get('authorization') ? ((req.user = { id: 'u1' }), handler(req, res, next)) : res.status(401).json({ error: 'Please sign in' }))
  registerAiRoutes(app, { requireUser, asyncRoute: (h) => (req, res, next) => Promise.resolve(h(req, res, next)).catch(next), ...options })
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)) })
  return { server, base: `http://localhost:${server.address().port}` }
}
const post = (base, body, signedIn = true) => fetch(`${base}/api/ai/complete`, { method: 'POST', headers: { 'content-type': 'application/json', ...(signedIn ? { authorization: 'Bearer x' } : {}) }, body: JSON.stringify(body) })

test('status says whether a key is set', async () => {
  const on = await serve({ getKey: () => 'k' }); const off = await serve({ getKey: () => '' })
  assert.deepEqual(await (await fetch(`${on.base}/api/ai/status`)).json(), { available: true })
  assert.deepEqual(await (await fetch(`${off.base}/api/ai/status`)).json(), { available: false })
  on.server.close(); off.server.close()
})

test('complete needs sign-in, a key and a valid body, then relays the answer', async () => {
  const { server, base } = await serve({ getKey: () => 'k', ask: async () => '{"ok":true}' })
  assert.equal((await post(base, good, false)).status, 401)
  assert.equal((await post(base, { system: '' })).status, 400)
  const ok = await post(base, good)
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { text: '{"ok":true}' })
  server.close()
  const none = await serve({ getKey: () => '' })
  assert.equal((await post(none.base, good)).status, 503)
  none.server.close()
})

test('complete turns provider failures into readable errors without leaking details', async () => {
  const busy = await serve({ getKey: () => 'k', ask: async () => { throw Object.assign(new Error('secret detail'), { status: 429 }) } })
  const r = await post(busy.base, good)
  assert.equal(r.status, 429)
  assert.ok(!JSON.stringify(await r.json()).includes('secret'))
  busy.server.close()
  const down = await serve({ getKey: () => 'k', ask: async () => { throw new Error('boom') } })
  assert.equal((await post(down.base, good)).status, 502)
  down.server.close()
})
