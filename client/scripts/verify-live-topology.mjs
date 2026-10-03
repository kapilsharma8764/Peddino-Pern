#!/usr/bin/env node
/**
 * Rehearses the live deployment on this machine, end to end, in a real browser.
 *
 * What runs is the same shape as production:
 *   - the client is a *lean production build* (no template files at all in it),
 *     served by `vite preview`;
 *   - every `/original-templates/*` and `/templates/<folder>/*` request is
 *     forwarded to the API, which answers from MongoDB — exactly what the
 *     rewrites in vercel.json do on Vercel;
 *   - the gallery list comes from `GET /api/templates`.
 * Accounts and saved sites are stubbed, so nothing in the database is touched.
 *
 * For a handful of templates it checks the gallery (list + thumbnails), the
 * sandboxed preview, the editor canvas, and the "Download site" export (which
 * is the same inlining step publishing uses) — and fails on any template file
 * that answers with an error or any picture that does not draw.
 *
 *   1. node server/src/index.js                       (API on 8001, database already imported)
 *   2. cd client && SITEBUILDER_LEAN_BUILD=1 VITE_API_URL=http://127.0.0.1:8001 \
 *        npx vite build --outDir ../.tmp-dist
 *   3. DIST=../.tmp-dist API=http://127.0.0.1:8001 node scripts/verify-live-topology.mjs
 *
 * SAMPLE="Atlanta,Osteriax" picks templates by name; by default a spread is chosen.
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const CLIENT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const JSZip = createRequire(path.join(CLIENT, 'package.json'))('jszip')
const API = (process.env.API ?? 'http://127.0.0.1:8001').replace(/\/$/, '')
const DIST = path.resolve(CLIENT, process.env.DIST ?? '../.tmp-dist')
const PORT = Number(process.env.WEB_PORT ?? 5302)
const WEB = `http://127.0.0.1:${PORT}`

const catalog = JSON.parse(await readFile(path.join(CLIENT, 'src/templates/library/original-catalog.json'), 'utf8'))
const sample = process.env.SAMPLE
  ? process.env.SAMPLE.split(',').map((n) => catalog.find((t) => t.name.toLowerCase() === n.trim().toLowerCase())).filter(Boolean)
  : [...new Set([catalog[0], catalog.find((t) => t.pages.length > 4), ...catalog.filter((_, i) => i % 17 === 5)])].slice(0, 6)

const preview = spawn(process.execPath, [path.join(CLIENT, 'node_modules/vite/bin/vite.js'), 'preview', '--outDir', DIST, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
  cwd: CLIENT, env: { ...process.env, SITEBUILDER_TEMPLATE_PROXY: API }, stdio: 'ignore',
})
const stop = () => preview.kill()
process.on('exit', stop)

async function waitFor(url) {
  for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).ok) return } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 500)) }
  throw new Error(`${url} did not come up`)
}

const failures = []
const check = (label, ok, detail = '') => { console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ' — ' + detail : ''}`); if (!ok) failures.push(`${label} ${detail}`) }


try {
  await waitFor(WEB)
  await waitFor(`${API}/api/templates`)
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  await context.addInitScript(() => window === window.top && localStorage.setItem('sitebuilder-auth', JSON.stringify({ state: { token: 'stub', user: { id: 'u1', name: 'Test', email: 'test@example.test' } }, version: 0 })))
  // Stubbed account and saved-site calls; the template routes are the real API's.
  await context.route(`${API}/api/**`, (route) => {
    const { pathname } = new URL(route.request().url())
    if (pathname === '/api/templates') return route.continue()
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) })
    if (pathname === '/api/auth/me') return json(200, { user: { id: 'u1', name: 'Test', email: 'test@example.test' } })
    if (pathname === '/api/sites' && route.request().method() === 'POST') return json(201, { id: 'site-1' })
    return json(200, [])
  })
  await context.route('**/*', (route) => {
    const u = route.request().url()
    return u.startsWith(WEB) || u.startsWith(API) || u.startsWith('data:') || u.startsWith('blob:') ? route.fallback() : route.abort()
  })

  const badResponses = []
  // A template file that answers with an error only counts when the original
  // folder on disk really has it. Old templates name files they never shipped
  // (a missing icon font, say); those fail the same way in the original.
  const deadInTheOriginal = []
  context.on('response', (r) => {
    const { pathname } = new URL(r.url())
    if (r.status() < 400 || !/^\/(original-)?templates\//.test(pathname)) return
    // .eot is the Internet Explorer font format. It is left out of the database on purpose
    // (no current browser requests it); only the export step probes it and shrugs off the 404.
    if (/\.eot$/i.test(pathname)) return
    if (existsSync(path.join(CLIENT, 'public', decodeURIComponent(pathname)))) badResponses.push(`${r.status()} ${r.url()}`)
    else deadInTheOriginal.push(pathname)
  })

  for (const template of sample) {
    console.log(`\n${template.name} (${template.pages.length} page${template.pages.length === 1 ? '' : 's'})`)
    const before = badResponses.length
    const page = await context.newPage()
    const listed = page.waitForResponse((r) => r.url() === `${API}/api/templates`)
    await page.goto(`${WEB}/templates?search=${encodeURIComponent(template.name)}`, { waitUntil: 'domcontentloaded' })
    check('gallery list comes from the API', (await listed).ok())
    const card = page.locator('article', { hasText: template.name }).first()
    await card.waitFor()
    await page.waitForTimeout(1500)
    check('thumbnail draws', await card.locator('img').evaluate((i) => i.complete && i.naturalWidth > 0))

    await card.getByRole('button', { name: `Preview ${template.name}` }).first().click()
    const frame = page.frameLocator(`iframe[title="${template.name} original preview"]`)
    await frame.locator('body').waitFor({ state: 'attached' })
    await page.waitForTimeout(2500)
    const preview = page.frames().find((f) => f.url().includes('/original-templates/'))
    const previewInfo = await preview.evaluate(() => ({ text: document.body.innerText.trim().length, sheets: document.styleSheets.length, broken: [...document.images].filter((i) => (!i.complete || !i.naturalWidth) && i.getBoundingClientRect().width > 24 && getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('src')) }))
    check('sandboxed preview has content and styles', previewInfo.text > 40 && previewInfo.sheets > 0, JSON.stringify(previewInfo))
    check('preview pictures draw', previewInfo.broken.length === 0, previewInfo.broken.slice(0, 3).join(', '))

    await page.getByRole('button', { name: 'Use this template' }).click()
    await page.waitForURL('**/editor', { timeout: 30000 })
    const canvas = page.frameLocator('iframe[title$="website canvas"]').first()
    await canvas.locator('body').waitFor({ state: 'attached', timeout: 30000 })
    await page.waitForTimeout(3000)
    const canvasFrame = page.frames().find((f) => f !== page.mainFrame() && f.url() !== 'about:blank') ?? page.frames()[1]
    const canvasInfo = await canvasFrame.evaluate(() => ({ text: document.body.innerText.trim().length, broken: [...document.images].filter((i) => (!i.complete || !i.naturalWidth) && i.getBoundingClientRect().width > 24 && getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('src')) }))
    check('editor canvas has content', canvasInfo.text > 40, `${canvasInfo.text} characters`)
    check('editor pictures draw', canvasInfo.broken.length === 0, canvasInfo.broken.slice(0, 3).join(', '))

    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: /Download site/ }).click()])
    const zip = await JSZip.loadAsync(await readFile(await download.path()))
    const home = await zip.file('index.html')?.async('string')
    check('exported site has a home page', Boolean(home))
    let bytes = 0
    for (const file of Object.values(zip.files)) if (!file.dir && file.name.endsWith('.html')) bytes += (await file.async('string')).length
    console.log(`       downloaded site: ${(bytes / 1048576).toFixed(1)} MB of HTML across ${Object.values(zip.files).filter((f) => f.name.endsWith('.html')).length} file(s)`)
    if (home) {
      const exported = await context.newPage()
      await exported.setContent(home, { waitUntil: 'load' })
      await exported.waitForTimeout(2000)
      const info = await exported.evaluate(() => ({ text: document.body.innerText.trim().length, external: [...document.querySelectorAll('link[rel=stylesheet],script[src],img[src]')].map((e) => e.getAttribute('href') || e.getAttribute('src')).filter((u) => /\/(original-)?templates\//.test(u || '')), broken: [...document.images].filter((i) => (!i.complete || !i.naturalWidth) && i.getBoundingClientRect().width > 24 && getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('src')?.slice(0, 80)) }))
      check('exported site is self-contained', info.external.length === 0, info.external.slice(0, 2).join(', '))
      check('exported site has content', info.text > 40)
      check('exported pictures draw', info.broken.length === 0, info.broken.slice(0, 3).join(', '))
      await exported.close()
    }
    check('no template file answered with an error', badResponses.length === before, badResponses.slice(before).slice(0, 3).join(', '))
    await page.close()
  }
  await browser.close()
} finally {
  stop()
}

console.log(failures.length ? `\n${failures.length} check(s) failed.` : '\nAll checks passed: the live topology renders the templates correctly.')
process.exit(failures.length ? 1 : 0)
