#!/usr/bin/env node
/** Read-only GET verification. Use TEMPLATE_API_URL, --frontend=https://...,
 * --deep and optionally --baseline=reviewed.json (array of {path, reason}).
 * No missing-path baseline is approved by default. Deep checks HTML-linked
 * resources, not JS-generated requests or dependencies inside external CSS/JS.
 * HTML must match original source bytes. Intentional transformations require
 * a reviewed expected-content manifest before accepting them.
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { digest, fetchAsset, scanPage, validateBaseline } from '../src/template-verification.js'

const root = fileURLToPath(new URL('../../', import.meta.url))
async function pool(items, worker, size = 8) {
  let index = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (index < items.length) await worker(items[index++])
  }))
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const split = arg.indexOf('=')
    return split < 0 ? [arg.replace(/^--/, ''), true] : [arg.slice(0, split).replace(/^--/, ''), arg.slice(split + 1)]
  }))
  const origins = [process.env.TEMPLATE_API_URL ?? 'http://127.0.0.1:8001']
  if (args.frontend) origins.push(args.frontend)
  for (const origin of origins) {
    const url = new URL(origin)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid origin')
  }
  const catalog = JSON.parse(await readFile(path.join(root, 'client/src/templates/library/original-catalog.json'), 'utf8'))
  const baseline = validateBaseline(args.baseline ? JSON.parse(await readFile(args.baseline, 'utf8')) : [])
  const jobs = catalog.flatMap((template) => [
    { kind: 'thumbnail', url: template.thumbnail, type: 'image/' },
    ...template.pages.map((page) => ({ kind: 'page', url: page.url, type: 'text/html' })),
  ])
  const publicRoot = path.resolve(root, 'client/public')
  for (const job of jobs.filter((job) => job.kind === 'page')) {
    const source = path.resolve(publicRoot, '.' + job.url)
    if (!source.startsWith(publicRoot + path.sep)) throw new Error('Invalid source path')
    job.hash = digest(await readFile(source))
  }
  let failed = false
  for (const origin of origins) {
    console.log(`Origin: ${new URL(origin).origin}`)
    // The frontend rewrites assets, not /api/templates; catalog is API-only.
    if (origin === origins[0]) {
      let listed
      const response = await fetchAsset(origin, { url: '/api/templates', type: 'application/json' })
      try { if (response.ok) listed = JSON.parse(response.body) } catch { /* fail below */ }
      const catalogOk = Array.isArray(listed) && listed.length === catalog.length &&
        catalog.every((template) => listed.some((item) => item?.id === template.id && Array.isArray(item.pages) &&
          JSON.stringify(item.pages.map((page) => page?.url)) === JSON.stringify(template.pages.map((page) => page.url))))
      console.log(`Catalog: ${Array.isArray(listed) ? listed.length : 'unavailable'}/${catalog.length} ${catalogOk ? 'OK' : 'FAIL'}`)
      failed ||= !catalogOk
    }
    let passed = 0
    const failures = []
    const deep = { scanned: 0, skipped: 0, checked: 0, baselineMissing: 0, failures: [] }
    await pool(jobs, async (job) => {
      const result = await fetchAsset(origin, job)
      if (result.ok) passed++
      else failures.push({ url: job.url, status: result.status })
      if (args.deep && job.kind === 'page') {
        const report = await scanPage(origin, job, result, baseline)
        for (const key of ['scanned', 'skipped', 'checked', 'baselineMissing']) deep[key] += report[key]
        deep.failures.push(...report.failures)
      }
    })
    console.log(`Thumbnails/pages: ${passed}/${jobs.length} OK`)
    if (args.deep) console.log(`Deep HTML-linked resources: pages scanned=${deep.scanned}, skipped=${deep.skipped}, references checked=${deep.checked}, baseline-missing=${deep.baselineMissing}, unexpected=${deep.failures.length}`)
    for (const failure of [...failures, ...deep.failures].slice(0, 10)) console.log(`  FAIL ${failure.status} ${new URL(failure.url, origin).pathname}`)
    failed ||= failures.length > 0 || deep.failures.length > 0
  }
  console.log(failed ? 'RESULT: FAILED' : 'RESULT: PASSED')
  process.exitCode = failed ? 1 : 0
}

main().catch(() => {
  console.error('RESULT: FAILED (invalid configuration, baseline, or unreadable source; details suppressed)')
  process.exitCode = 1
});
