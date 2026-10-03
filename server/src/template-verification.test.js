import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { digest, fetchAsset, scanPage, resourcePaths, validateBaseline } from './template-verification.js'

const origin = 'https://templates.example'
const page = { kind: 'page', url: '/original-templates/test/index.html', type: 'text/html' }
const responder = (body, type = 'text/html', status = 200) => async () => new Response(body, { status, headers: { 'content-type': type } })

test('frontend SPA HTML is not a thumbnail', async () => {
  const result = await fetchAsset(origin, { url: '/thumbnail.jpg', type: 'image/' }, responder('<html>SPA</html>'))
  assert.equal(result.status, 'WRONG_MIME')
  assert.equal(result.ok, false)
})
test('200 HTML must match the expected template, not a different page or SPA', async () => {
  const html = '<html><title>Expected template</title></html>'
  const job = { ...page, hash: digest(html) }
  assert.equal((await fetchAsset(origin, job, responder(html))).ok, true)
  for (const wrong of ['<html>SPA</html>', '<html><title>Different template</title></html>']) {
    assert.equal((await fetchAsset(origin, job, responder(wrong))).status, 'WRONG_CONTENT')
  }
})
test('failed page is explicitly skipped and fails deep verification with zero references', async () => {
  const report = await scanPage(origin, page, { ok: false, body: '' }, new Set())
  assert.equal(report.skipped, 1)
  assert.equal(report.checked, 0)
  assert.equal(report.failures[0].status, 'SOURCE_PAGE_FAILED')
})
test('known optional shim 404 is separated from new missing CSS', async () => {
  const baseline = validateBaseline([{ path: '/original-templates/test/shim.js', reason: 'Reviewed absent optional shim' }])
  const body = '<script src="shim.js"></script><link rel="stylesheet" href="new.css">'
  const report = await scanPage(origin, page, { ok: true, body }, baseline, responder('', 'text/plain', 404))
  assert.equal(report.baselineMissing, 1)
  assert.equal(report.checked, 2)
  assert.deepEqual(report.failures, [{ url: '/original-templates/test/new.css', status: 404 }])
})
test('baseline never excuses 500 or HTML fallback', async () => {
  const baseline = new Set(['/original-templates/test/shim.js'])
  for (const fetcher of [responder('', 'text/plain', 500), responder('<html>SPA</html>')]) {
    const report = await scanPage(origin, page, { ok: true, body: '<script src="shim.js"></script>' }, baseline, fetcher)
    assert.equal(report.baselineMissing, 0)
    assert.equal(report.failures.length, 1)
  }
})
test('resource parsing includes srcset/inline CSS but excludes external and navigation URLs', () => {
  const html = '<img srcset="one.jpg 1x, two.jpg 2x"><div style="background:url(bg.png)"></div><a href="about.html">About</a><script src="https://elsewhere.example/a.js"></script>'
  assert.deepEqual(resourcePaths(html, page.url, origin).sort(), ['bg.png', 'one.jpg', 'two.jpg'].map((name) => '/original-templates/test/' + name))
})
test('baseline requires exact paths, reasons, and no duplicates', () => {
  for (const value of [{}, [{ path: '/original-templates/*', reason: 'all' }], [{ path: '/original-templates/a.js', reason: '' }],
    [{ path: '/original-templates/a.js', reason: 'one' }, { path: '/original-templates/a.js', reason: 'two' }]]) assert.throws(() => validateBaseline(value))
})
test('network errors are sanitized and off-origin requests are never sent', async () => {
  const result = await fetchAsset(origin, page, async () => { throw new Error('private credential-bearing detail') })
  assert.equal(result.status, 'NETWORK_OR_REDIRECT_ERROR')
  assert.equal(JSON.stringify(result).includes('private'), false)
  assert.equal((await fetchAsset(origin, { url: 'https://other.example/x' }, () => assert.fail('must not fetch'))).status, 'OFF_ORIGIN')
})

test('healthy HTML-linked resources pass the deep scan', async () => {
  const report = await scanPage(origin, page, { ok: true, body: '<link rel="stylesheet" href="ok.css">' }, new Set(), responder('body{}', 'text/css'))
  assert.equal(report.scanned, 1)
  assert.equal(report.checked, 1)
  assert.deepEqual(report.failures, [])
})

test('CLI exit status catches wrong frontend content using loopback HTTP fixtures', async () => {
  const publicRoot = new URL('../../client/public/', import.meta.url)
  const catalog = JSON.parse(await readFile(new URL('../../client/src/templates/library/original-catalog.json', import.meta.url), 'utf8'))
  const pages = new Map()
  for (const template of catalog) for (const item of template.pages) {
    pages.set(item.url, await readFile(new URL(item.url.slice(1), publicRoot)))
  }
  const thumbnails = new Set(catalog.map((item) => item.thumbnail))
  let mode = 'healthy'
  const handler = (frontend) => (req, res) => {
    if (!frontend && req.url === '/api/templates') {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify(catalog))
    }
    if (frontend && ((mode === 'thumbnail' && req.url === catalog[0].thumbnail) ||
      (mode === 'page' && req.url === catalog[0].pages[0].url))) {
      res.setHeader('content-type', 'text/html')
      return res.end('<html>Wrong SPA page</html>')
    }
    if (pages.has(req.url)) {
      res.setHeader('content-type', 'text/html')
      return res.end(pages.get(req.url))
    }
    if (thumbnails.has(req.url)) {
      res.setHeader('content-type', 'image/jpeg')
      return res.end('fixture image payload')
    }
    res.statusCode = 404
    res.end()
  }
  const api = createServer(handler(false))
  const frontend = createServer(handler(true))
  try {
    for (const server of [api, frontend]) await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    for (mode of ['healthy', 'thumbnail', 'page']) {
      const result = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [fileURLToPath(new URL('../scripts/verify-live-templates.mjs', import.meta.url)),
          `--frontend=http://127.0.0.1:${frontend.address().port}`], {
          env: { ...process.env, TEMPLATE_API_URL: `http://127.0.0.1:${api.address().port}` }, stdio: ['ignore', 'pipe', 'pipe'],
        })
        let output = ''
        child.stdout.on('data', (chunk) => { output += chunk })
        child.stderr.on('data', (chunk) => { output += chunk })
        child.on('error', reject)
        child.on('close', (code) => resolve({ code, output }))
      })
      assert.equal(result.code, mode === 'healthy' ? 0 : 1, result.output)
      if (mode === 'thumbnail') assert.match(result.output, /WRONG_MIME/)
      if (mode === 'page') assert.match(result.output, /WRONG_CONTENT/)
    }
  } finally {
    for (const server of [api, frontend]) {
      server.closeAllConnections()
      await new Promise((resolve) => server.close(resolve))
    }
  }
})
