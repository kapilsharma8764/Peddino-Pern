#!/usr/bin/env node
/**
 * Crawl nicepage.com's template listing/detail pages and stage metadata under
 * templates/nicepage/<category>/<slug-or-id>/. Nicepage does not offer a
 * direct HTML/ZIP export for its templates (only the Windows/Mac app or the
 * Online Builder) — per this project's own rules, this script therefore never
 * downloads the app installer or treats it as template source. Every
 * template it finds is recorded with importStatus "needs-nicepage-export";
 * use scripts/import-nicepage-export.mjs afterwards once someone has
 * manually exported a template's HTML through Nicepage's own tools.
 *
 *     npm run import:nicepage -- --limit=10 --categories=school,portfolio --free-only
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = join(root, 'templates', 'nicepage')
const BASE = 'https://nicepage.com'

const argv = process.argv.slice(2)
const limit = Number(argv.find((a) => a.startsWith('--limit='))?.slice('--limit='.length) ?? 10)
const categories = (argv.find((a) => a.startsWith('--categories='))?.slice('--categories='.length) ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const skipped = []
const staged = []

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (template-importer)' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.text()
}

function extractDetailLinks(html) {
  const links = new Set()
  for (const m of html.matchAll(/href="(https:\/\/nicepage\.com\/st\/\d+\/[a-z0-9-]+)"/gi)) {
    links.add(m[1])
  }
  return [...links]
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  return m ? m[1].trim() : null
}

function extractTemplateId(url) {
  const m = url.match(/\/st\/(\d+)\//)
  return m ? m[1] : null
}

function hasDirectExport(html) {
  // A direct raw HTML/source download link, as opposed to the app/online-builder CTAs.
  return /href="[^"]+\.zip"/i.test(html) && !/nicepage\.(exe|dmg)/i.test(html)
}

async function crawlCategory(categorySlug) {
  const html = await fetchText(`${BASE}/website-templates/${categorySlug}`)
  return extractDetailLinks(html)
}

async function stageOne(detailUrl, categorySlug) {
  const providerTemplateId = extractTemplateId(detailUrl)
  const slugOrId = detailUrl.split('/').pop() || providerTemplateId
  const html = await fetchText(detailUrl)
  const name = extractTitle(html) ?? slugOrId

  const templateDir = join(outDir, categorySlug, slugOrId)
  const sourceDir = join(templateDir, 'source')
  mkdirSync(sourceDir, { recursive: true })

  const directExport = hasDirectExport(html)
  const importStatus = directExport ? 'imported' : 'needs-nicepage-export'

  if (!directExport) {
    writeFileSync(join(sourceDir, 'nicepage-template-id.txt'), `${providerTemplateId ?? 'unknown'}\n`)
    writeFileSync(
      join(sourceDir, 'export-notes.md'),
      [
        `# Manual export needed for "${name}"`,
        '',
        `1. Open ${detailUrl}`,
        `2. Note the template ID: ${providerTemplateId ?? 'unknown'}`,
        '3. Open the Nicepage desktop app or Online Builder and search/add this template by ID.',
        '4. Export as HTML if your license/account allows it.',
        `5. Place the exported files in downloads/nicepage-exports/${providerTemplateId ?? slugOrId}/.`,
        `6. Run: npm run import:nicepage-export -- --source=downloads/nicepage-exports/${providerTemplateId ?? slugOrId} --template-id=${providerTemplateId ?? slugOrId}`,
        '',
      ].join('\n'),
    )
  }
  writeFileSync(join(sourceDir, 'source-url.txt'), `${detailUrl}\n`)

  const now = new Date().toISOString()
  const templateJson = {
    id: `nicepage-${slugOrId}`,
    name,
    slug: slugOrId,
    category: categorySlug,
    sourceProvider: 'Nicepage',
    sourceUrl: detailUrl,
    demoUrl: detailUrl,
    license: 'see Nicepage license agreement',
    framework: null,
    preview: 'preview.png',
    pages: [],
    header: 'shared',
    footer: 'shared',
    theme: null,
    assets: [],
    createdAt: now,
    updatedAt: now,
    compatibilityVersion: 1,
    importStatus,
    providerTemplateId,
  }
  writeFileSync(join(templateDir, 'template.json'), JSON.stringify(templateJson, null, 2))
  writeFileSync(
    join(templateDir, 'README.md'),
    `# ${name}\n\nSource: ${detailUrl}\nStatus: ${importStatus}\n`,
  )

  staged.push({ slug: slugOrId, name, categorySlug, providerTemplateId, importStatus })
}

function updateManifest() {
  const manifestPath = join(outDir, 'manifest.json')
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { provider: 'Nicepage', sourceUrl: 'https://nicepage.com/website-templates', templates: [] }
  const bySlug = new Map(manifest.templates.map((t) => [t.slug, t]))
  for (const t of staged) bySlug.set(t.slug, t)
  manifest.templates = [...bySlug.values()]
  manifest.updatedAt = new Date().toISOString()
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

async function main() {
  if (categories.length === 0) {
    console.error('Pass --categories=slug1,slug2 (matching templates/nicepage/categories.json slugs)')
    process.exit(1)
  }
  let count = 0
  for (const categorySlug of categories) {
    if (count >= limit) break
    let links
    try {
      links = await crawlCategory(categorySlug)
    } catch (err) {
      console.error(`Failed to crawl category ${categorySlug}: ${err.message}`)
      continue
    }
    for (const link of links) {
      if (count >= limit) break
      try {
        await stageOne(link, categorySlug)
        count += 1
      } catch (err) {
        skipped.push({ url: link, reason: err.message })
      }
    }
  }

  updateManifest()

  console.log(`\nStaged: ${staged.length}`)
  for (const t of staged) console.log(`  - ${t.name} (${t.slug}) [${t.importStatus}]`)
  console.log(`\nSkipped: ${skipped.length}`)
  for (const s of skipped) console.log(`  ✗ ${s.url}: ${s.reason}`)
}

main()
