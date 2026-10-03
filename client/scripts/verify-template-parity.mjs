#!/usr/bin/env node
/**
 * Proves that templates served out of MongoDB look the same as the original
 * files on disk.
 *
 * Every page of every template in the catalog is opened twice in a real browser:
 *   - REFERENCE: straight from client/public (what the templates were designed and
 *     audited against), served by a tiny static server here;
 *   - LIVE: from the API, i.e. the files as MongoDB stores them — optimised
 *     pictures, gzipped text, case-insensitive lookups and all.
 * For each page it compares which files loaded, which failed, how many pictures
 * are broken, how tall the page is and — as a picture — how different the first
 * screen looks. A page fails if the LIVE side lost a file the REFERENCE had,
 * has more broken pictures, or is a different height.
 *
 *   node scripts/verify-template-parity.mjs                     # API at http://127.0.0.1:8001
 *   API=http://127.0.0.1:8002 node scripts/verify-template-parity.mjs
 *   ONLY=bizpage node scripts/verify-template-parity.mjs        # templates whose id contains this
 *   SHOTS=1 ...                                                 # keep side-by-side PNGs of the worst pages
 *
 * Needs the API running against a database the importer has filled
 * (`node server/scripts/import-templates.mjs`). Exit code 1 on any failure.
 */
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CLIENT = path.resolve(HERE, '..')
const PUBLIC = path.join(CLIENT, 'public')
const OUT = path.resolve(CLIENT, '..', 'reports', 'template-parity')
const sharp = createRequire(path.join(CLIENT, '..', 'server', 'package.json'))('sharp')

const API = (process.env.API ?? 'http://127.0.0.1:8001').replace(/\/$/, '')
const ONLY = process.env.ONLY
const SHOTS = Boolean(process.env.SHOTS)
const REF_PORT = Number(process.env.REF_PORT ?? 5301)
const REF = `http://127.0.0.1:${REF_PORT}`
const VIEW = { width: 1280, height: 900 }
const HEIGHT_TOLERANCE = 0.03 // late-loading pictures and fonts nudge a page by a few pixels

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.ico': 'image/x-icon' }

function referenceServer() {
  return http.createServer(async (req, res) => {
    try {
      const file = path.resolve(PUBLIC, '.' + decodeURIComponent(new URL(req.url, REF).pathname))
      if (!file.startsWith(PUBLIC + path.sep)) throw new Error('outside')
      const data = await fs.readFile(file)
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Access-Control-Allow-Origin': '*' })
      res.end(data)
    } catch {
      res.writeHead(404); res.end('Not found')
    }
  }).listen(REF_PORT, '127.0.0.1')
}

/** Opens one page and reports what loaded, what failed and what it looked like. */
async function observe(context, origin, url) {
  const page = await context.newPage()
  const ok = new Set(), failed = new Set()
  const local = (u) => u.startsWith(origin + '/')
  page.on('response', (r) => { if (local(r.url())) (r.status() >= 400 ? failed : ok).add(new URL(r.url()).pathname) })
  page.on('requestfailed', (r) => { if (local(r.url())) failed.add(new URL(r.url()).pathname) })
  page.on('dialog', (d) => d.dismiss())
  try {
    await page.goto(origin + url, { waitUntil: 'load', timeout: 25000 })
    await page.waitForTimeout(2500)
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    const metrics = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      styles: document.styleSheets.length,
      brokenImages: [...document.images].filter((i) => (!i.complete || !i.naturalWidth) && i.getBoundingClientRect().width > 24 && getComputedStyle(i).display !== 'none').map((i) => i.getAttribute('src')),
      fonts: [...document.fonts].filter((f) => f.status === 'error').map((f) => f.family),
    }))
    const shot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...VIEW } })
    return { ok, failed, metrics, shot }
  } finally {
    await page.close()
  }
}

/** Share of pixels that differ visibly between two same-size screenshots. */
async function difference(a, b) {
  const [x, y] = await Promise.all([a, b].map((buf) => sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })))
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return 1
  let different = 0
  const pixels = x.info.width * x.info.height
  for (let i = 0; i < pixels; i++) {
    const o = i * 3
    if (Math.abs(x.data[o] - y.data[o]) + Math.abs(x.data[o + 1] - y.data[o + 1]) + Math.abs(x.data[o + 2] - y.data[o + 2]) > 60) different++
  }
  return different / pixels
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(path.join(CLIENT, 'src/templates/library/original-catalog.json'), 'utf8'))
  const pages = catalog
    .filter((t) => !ONLY || t.id.includes(ONLY))
    .flatMap((t) => t.pages.map((p) => ({ template: t.id, name: p.name, url: p.url })))
  if (!pages.length) throw new Error('No pages matched.')

  const ping = await fetch(`${API}/api/templates`).then((r) => r.json()).catch(() => null)
  if (!Array.isArray(ping) || !ping.length) throw new Error(`The API at ${API} has no templates. Start it and run server/scripts/import-templates.mjs first.`)

  await fs.mkdir(OUT, { recursive: true })
  const server = referenceServer()
  const browser = await chromium.launch({ headless: true })
  const results = []
  let next = 0

  async function worker() {
    const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1, reducedMotion: 'reduce' })
    // Templates pull in Google Fonts, analytics and stock photos from the internet.
    // Those are the same on both sides and make the run slow and flaky, so they are cut.
    await context.route('**/*', (route) => {
      const u = route.request().url()
      return u.startsWith(REF + '/') || u.startsWith(API + '/') || u.startsWith('data:') || u.startsWith('blob:') ? route.continue() : route.abort()
    })
    while (next < pages.length) {
      const item = pages[next++]
      const row = { ...item, problems: [] }
      try {
        const ref = await observe(context, REF, item.url)
        const live = await observe(context, API, item.url)
        row.lostFiles = [...ref.ok].filter((f) => !live.ok.has(f))
        row.newlyBroken = live.metrics.brokenImages.filter((s) => !ref.metrics.brokenImages.includes(s))
        row.fontErrors = live.metrics.fonts.filter((f) => !ref.metrics.fonts.includes(f))
        row.heights = [ref.metrics.height, live.metrics.height]
        row.stylesheets = [ref.metrics.styles, live.metrics.styles]
        row.diff = await difference(ref.shot, live.shot)
        if (row.lostFiles.length) row.problems.push(`${row.lostFiles.length} file(s) the original loads are missing from the API: ${row.lostFiles.slice(0, 3).join(', ')}`)
        if (row.newlyBroken.length) row.problems.push(`${row.newlyBroken.length} picture(s) broken only on the API side`)
        if (row.fontErrors.length) row.problems.push(`font failed to load: ${row.fontErrors.join(', ')}`)
        if (live.metrics.styles < ref.metrics.styles) row.problems.push(`fewer stylesheets applied (${ref.metrics.styles} -> ${live.metrics.styles})`)
        if (Math.abs(row.heights[1] - row.heights[0]) > Math.max(24, row.heights[0] * HEIGHT_TOLERANCE)) row.problems.push(`page height ${row.heights[0]} -> ${row.heights[1]}`)
        if (SHOTS && row.diff > 0.02) {
          const name = `${item.template}__${item.name.replace(/\W+/g, '-')}`
          await sharp({ create: { width: VIEW.width * 2, height: VIEW.height, channels: 3, background: '#fff' } })
            .composite([{ input: ref.shot, left: 0, top: 0 }, { input: live.shot, left: VIEW.width, top: 0 }]).png().toFile(path.join(OUT, `${name}.png`))
        }
      } catch (error) {
        row.problems.push(`could not be compared: ${String(error.message).split('\n')[0]}`)
      }
      results.push(row)
      console.log(`${String(results.length).padStart(3)}/${pages.length} ${row.problems.length ? 'FAIL' : 'ok  '} ${(row.diff * 100 || 0).toFixed(1).padStart(5)}%  ${item.template} · ${item.name}${row.problems.length ? '\n        ' + row.problems.join('\n        ') : ''}`)
    }
    await context.close()
  }

  try {
    await Promise.all(Array.from({ length: 4 }, worker))
  } finally {
    await browser.close()
    server.close()
  }

  const failed = results.filter((r) => r.problems.length)
  const worst = [...results].sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0)).slice(0, 8)
  await fs.writeFile(path.join(OUT, 'report.json'), JSON.stringify({ api: API, pages: results.length, failed: failed.length, results }, null, 2))
  console.log(`\n${results.length} pages compared: ${results.length - failed.length} match, ${failed.length} do not.`)
  console.log('Largest visual differences on the first screen (animations and sliders cause some noise):')
  for (const r of worst) console.log(`  ${((r.diff ?? 0) * 100).toFixed(1).padStart(5)}%  ${r.template} · ${r.name}`)
  console.log(`Full report: ${path.relative(process.cwd(), path.join(OUT, 'report.json'))}`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((error) => { console.error(error); process.exit(1) })
