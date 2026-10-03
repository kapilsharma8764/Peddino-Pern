#!/usr/bin/env node
/**
 * Crawl colorlib.com's free-template pages, skip anything premium ("Buy Now"),
 * download the ones with a genuine direct ZIP, and stage them under
 * templates/colorlib/<category>/<slug>/ following templates/README.md's schema.
 *
 *     npm run import:colorlib -- --limit=10 --categories=education,portfolio --free-only
 *
 * Deliberately plain Node (matches scripts/verify.mjs): built-in fetch, no
 * HTML-parser dependency (a handful of small regexes is enough for Colorlib's
 * fairly consistent markup), and the OS's own `tar` for zip extraction
 * (bsdtar ships with Windows 10+, macOS, and most Linux distros, and can read
 * zip archives with `tar -xf`).
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outDir = join(root, 'templates', 'colorlib')
const BASE = 'https://colorlib.com/wp'

const argv = process.argv.slice(2)
const limit = Number(argv.find((a) => a.startsWith('--limit='))?.slice('--limit='.length) ?? 10)
const categories = (argv.find((a) => a.startsWith('--categories='))?.slice('--categories='.length) ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const freeOnly = argv.includes('--free-only')
const dryRun = argv.includes('--dry-run')

const skipped = []
const imported = []

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (template-importer)' } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  return res.text()
}

/** Extract `/wp/template/<slug>/` detail links from a category listing page. */
function extractDetailLinks(html) {
  const links = new Set()
  for (const m of html.matchAll(/href="(https:\/\/colorlib\.com\/wp\/template\/[a-z0-9-]+\/)"/gi)) {
    links.add(m[1])
  }
  return [...links]
}

function extractTitle(html) {
  const m = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  return m ? m[1].trim() : null
}

function isPremium(html) {
  // Colorlib premium templates show a "Buy Now" / price CTA; genuinely free
  // templates show a direct "Download" button with a preview.colorlib.com/downloads/free/ link.
  return /buy now/i.test(html) && !/downloads\/free\//i.test(html)
}

function extractFreeZipUrl(html) {
  const m = html.match(/https:\/\/preview\.colorlib\.com\/downloads\/free\/[a-z0-9-]+\.zip/i)
  return m ? m[0] : null
}

function extractLicense(html) {
  const m = html.match(/CC BY[ \d.]*\d/i)
  return m ? m[0] : 'unknown'
}

function slugify(url) {
  return url.replace(/\/$/, '').split('/').pop()
}

async function crawlCategory(categorySlug) {
  const html = await fetchText(`${BASE}/cat/${categorySlug}/`)
  return extractDetailLinks(html)
}

async function importOne(detailUrl, categorySlug) {
  const slug = slugify(detailUrl)
  const html = await fetchText(detailUrl)
  const name = extractTitle(html) ?? slug

  if (isPremium(html)) {
    skipped.push({ slug, sourceUrl: detailUrl, reason: 'premium (Buy Now, no free ZIP)' })
    return
  }

  const zipUrl = extractFreeZipUrl(html)
  if (!zipUrl) {
    skipped.push({ slug, sourceUrl: detailUrl, reason: 'no direct free ZIP link found' })
    return
  }
  if (freeOnly === false) {
    // still only free ones are supported by this script; premium requires purchase + manual drop-in
  }

  const templateDir = join(outDir, categorySlug, slug)
  const sourceDir = join(templateDir, 'source', 'original-html')
  const license = extractLicense(html)

  if (dryRun) {
    console.log(`[dry-run] would import ${name} (${slug}) from ${zipUrl}`)
    imported.push({ slug, name, categorySlug, sourceUrl: detailUrl, zipUrl, license })
    return
  }

  mkdirSync(sourceDir, { recursive: true })
  const zipRes = await fetch(zipUrl)
  if (!zipRes.ok) throw new Error(`failed to download ${zipUrl}: ${zipRes.status}`)
  const zipPath = join(templateDir, 'source', `${slug}.zip`)
  writeFileSync(zipPath, Buffer.from(await zipRes.arrayBuffer()))
  await extractZip(zipPath, sourceDir)
  rmSync(zipPath)

  writeFileSync(join(templateDir, 'source', 'license.txt'), `${license}\nSource: ${detailUrl}\n`)
  writeFileSync(join(templateDir, 'source', 'source-url.txt'), `${detailUrl}\n`)

  const pages = readdirSync(sourceDir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => f.replace(/\.html$/, ''))

  const now = new Date().toISOString()
  const templateJson = {
    id: `colorlib-${slug}`,
    name,
    slug,
    category: categorySlug,
    sourceProvider: 'Colorlib',
    sourceUrl: detailUrl,
    demoUrl: `https://preview.colorlib.com/#${slug}`,
    license,
    framework: null,
    preview: 'preview.png',
    pages,
    header: 'shared',
    footer: 'shared',
    theme: null,
    assets: [],
    createdAt: now,
    updatedAt: now,
    compatibilityVersion: 1,
    importStatus: 'imported',
    providerTemplateId: null,
  }
  writeFileSync(join(templateDir, 'template.json'), JSON.stringify(templateJson, null, 2))
  writeFileSync(
    join(templateDir, 'README.md'),
    `# ${name}\n\nImported from Colorlib (${license}).\n\nSource: ${detailUrl}\n`,
  )

  imported.push({ slug, name, categorySlug, sourceUrl: detailUrl, license, pages })
}

function extractZip(zipPath, destDir) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('tar', ['-xf', zipPath, '-C', destDir], { stdio: 'inherit' })
    child.on('exit', (code) => (code === 0 ? resolvePromise() : reject(new Error(`tar exited ${code}`))))
    child.on('error', reject)
  })
}

function updateManifest() {
  const manifestPath = join(outDir, 'manifest.json')
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : { provider: 'Colorlib', sourceUrl: 'https://colorlib.com/wp/templates/', templates: [] }
  const bySlug = new Map(manifest.templates.map((t) => [t.slug, t]))
  for (const t of imported) bySlug.set(t.slug, t)
  manifest.templates = [...bySlug.values()]
  manifest.updatedAt = new Date().toISOString()
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

async function main() {
  if (categories.length === 0) {
    console.error('Pass --categories=slug1,slug2 (matching templates/colorlib/categories.json slugs)')
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
        await importOne(link, categorySlug)
        count += 1
      } catch (err) {
        skipped.push({ slug: slugify(link), sourceUrl: link, reason: err.message })
      }
    }
  }

  if (!dryRun) updateManifest()

  console.log(`\nImported: ${imported.length}`)
  for (const t of imported) console.log(`  ✓ ${t.name} (${t.slug}) [${t.categorySlug}]`)
  console.log(`\nSkipped: ${skipped.length}`)
  for (const s of skipped) console.log(`  ✗ ${s.slug}: ${s.reason}`)
}

main()
