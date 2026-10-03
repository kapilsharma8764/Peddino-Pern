import test from 'node:test'
import assert from 'node:assert/strict'
import { cachedFor } from './ttl-cache.js'

test('loads once inside the time window and again after it', async () => {
  let clock = 0, calls = 0
  const get = cachedFor(1000, async () => ++calls, () => clock)
  assert.equal(await get(), 1)
  clock = 999
  assert.equal(await get(), 1)
  clock = 1000
  assert.equal(await get(), 2)
})

test('requests that overlap share one load', async () => {
  let calls = 0
  const get = cachedFor(1000, async () => { calls++; await new Promise((resolve) => setTimeout(resolve, 20)); return 'x' })
  assert.deepEqual(await Promise.all([get(), get(), get()]), ['x', 'x', 'x'])
  assert.equal(calls, 1)
})

test('a failed load is not remembered, and clear forces a fresh one', async () => {
  let calls = 0
  const get = cachedFor(1000, async () => { calls++; if (calls === 1) throw new Error('down'); return calls })
  await assert.rejects(get(), /down/)
  assert.equal(await get(), 2)
  get.clear()
  assert.equal(await get(), 3)
})
