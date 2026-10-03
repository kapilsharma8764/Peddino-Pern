import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { gzipSync } from 'node:zlib'
import { templateAssetHandler } from './template-assets.js'

const rows = {
  'original-templates/demo/index.html': { contentType: 'text/html; charset=utf-8', encoding: 'gzip', hash: 'abc', data: gzipSync('<h1>Hello</h1>') },
  'original-templates/demo/pages/index.html': { contentType: 'text/html; charset=utf-8', encoding: 'identity', hash: 'ghi', data: Buffer.from('<h1>Pages</h1>') },
  'original-templates/demo/img/a b.jpg': { contentType: 'image/jpeg', encoding: 'identity', hash: 'def', data: Buffer.from([1, 2, 3]) },
}

describe('templateAssetHandler', () => {
  let server, base
  before(async () => {
    const app = express()
    const lookup = async (id, { loose } = {}) => loose
      ? Object.entries(rows).find(([key]) => key.toLowerCase() === id.toLowerCase())?.[1] ?? null
      : rows[id] ?? null
    const handler = templateAssetHandler(lookup)
    // Like the real app, where helmet has already set this by the time the handler runs.
    app.use((_req, res, next) => { res.set('X-Frame-Options', 'SAMEORIGIN'); next() })
    app.get('/original-templates/*path', handler)
    await new Promise((resolve) => { server = app.listen(0, resolve) })
    base = `http://127.0.0.1:${server.address().port}`
  })
  after(() => server.close())

  test('serves a stored file with its type and open CORS', async () => {
    const res = await fetch(`${base}/original-templates/demo/img/a%20b.jpg`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/jpeg')
    assert.equal(res.headers.get('access-control-allow-origin'), '*')
    assert.deepEqual([...new Uint8Array(await res.arrayBuffer())], [1, 2, 3])
  })

  test('a gzipped page comes back readable', async () => {
    const res = await fetch(`${base}/original-templates/demo/index.html`)
    assert.equal(await res.text(), '<h1>Hello</h1>')
  })

  test('answers 304 when the file has not changed', async () => {
    const res = await fetch(`${base}/original-templates/demo/index.html`, { headers: { 'If-None-Match': '"abc"' } })
    assert.equal(res.status, 304)
  })

  test('404 for a file that is not stored', async () => {
    assert.equal((await fetch(`${base}/original-templates/demo/missing.css`)).status, 404)
  })

  test('a folder path answers with its index.html', async () => {
    const res = await fetch(`${base}/original-templates/demo/pages/`)
    assert.equal(res.status, 200)
    assert.equal(await res.text(), '<h1>Pages</h1>')
  })

  test('a path that differs only in letter case still finds the file', async () => {
    const res = await fetch(`${base}/original-templates/Demo/IMG/A%20B.JPG`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('content-type'), 'image/jpeg')
  })

  test('can be shown inside the client\'s own iframe', async () => {
    const res = await fetch(`${base}/original-templates/demo/index.html`)
    assert.equal(res.headers.get('x-frame-options'), null)
  })
})
