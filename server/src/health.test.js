import { test } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { registerHealthRoute } from './health.js'

test('readiness fails when the database fails, recovers, and hides connection details', async () => {
  let available = false
  const app = express()
  registerHealthRoute(app, async () => {
    if (!available) throw new Error('postgresql://private-password@private-host/database')
  })
  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  try {
    const url = `http://127.0.0.1:${server.address().port}/api/health`
    const failed = await fetch(url)
    assert.equal(failed.status, 503)
    assert.deepEqual(await failed.json(), { ok: false, database: 'unavailable' })
    available = true
    const recovered = await fetch(url)
    assert.equal(recovered.status, 200)
    assert.deepEqual(await recovered.json(), { ok: true, database: 'ready' })
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
