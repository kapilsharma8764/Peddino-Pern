import test from 'node:test'
import assert from 'node:assert/strict'
import { createViewCounter } from './views.js'

const quiet = () => ({ unref() {} })

test('adds hits up and writes each site once per flush', async () => {
  const writes = []
  const counter = createViewCounter(async (id, n) => writes.push([id, n]), { setTimer: quiet })
  counter.hit('a'); counter.hit('a'); counter.hit('b'); counter.hit('')
  await counter.flush()
  assert.deepEqual(writes.sort(), [['a', 2], ['b', 1]])
  await counter.flush()
  assert.equal(writes.length, 2)
})

test('a failed write keeps its numbers for the next flush', async () => {
  let fail = true
  const writes = []
  const counter = createViewCounter(async (id, n) => { if (fail) throw new Error('down'); writes.push([id, n]) }, { setTimer: quiet })
  counter.hit('a'); counter.hit('a')
  await counter.flush()
  fail = false
  counter.hit('a')
  await counter.flush()
  assert.deepEqual(writes, [['a', 3]])
})
