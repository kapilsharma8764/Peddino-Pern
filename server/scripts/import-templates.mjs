#!/usr/bin/env node
/**
 * Loads the template files (the ~12,000 pages, stylesheets, scripts, fonts and
 * pictures under client/public/original-templates and client/public/templates)
 * into PostgreSQL, so the API can serve them and the client no longer has to ship
 * ~1.2 GB of static files.
 *
 *   node scripts/import-templates.mjs --dry-run      measure only, write nothing
 *   node scripts/import-templates.mjs                import into DATABASE_URL
 *   node scripts/import-templates.mjs --only=bizpage import a single template
 *   node scripts/import-templates.mjs --prune        also delete rows for files that are gone
 *
 * Pictures are shrunk to at most 1920px and re-encoded; text files are gzipped;
 * the legacy .eot font format, which no current browser asks for, is left out.
 * (.ttf stays: many icon fonts list it *before* the .woff, so browsers fetch it.)
 * URLs do not change: a file at
 * `original-templates/foo/img/a.jpg` is stored under exactly that id.
 *
 * Only what the app really uses is imported: the folders of the templates in
 * the gallery catalog, and the exact `/templates/...` pictures the built-in
 * designs name in the client source. The ~150 templates that were curated out
 * of the gallery are left behind (pass --all to import everything anyway).
 *
 * Safe to re-run: a file whose source bytes did not change is skipped.
 * Upload to a hosted database (Neon, Supabase, ...) by setting DATABASE_URL first.
 */
import '../src/load-env.js'
import { SCHEMA, closeStore, connect } from '../src/store.js'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const ROOTS = [
  { prefix: 'original-templates', dir: path.join(REPO, 'client', 'public', 'original-templates') },
  { prefix: 'templates', dir: path.join(REPO, 'client', 'public', 'templates') },
]
const CLIENT_SRC = path.join(REPO, 'client', 'src')
const CATALOG = path.join(CLIENT_SRC, 'templates', 'library', 'original-catalog.json')

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=')
  return [k, v ?? true]
}))
const DRY_RUN = Boolean(args['dry-run'])
const PRUNE = Boolean(args.prune)
const ALL = Boolean(args.all)
const ONLY = typeof args.only === 'string' ? args.only : null
const MAX_SIDE = Number(args['max-side'] ?? 1920)
// Bump when the optimising rules change, so unchanged files are re-processed.
const PIPELINE = 'v2'
const MAX_STORED = 64 * 1024 * 1024 // a Postgres bytea can hold far more; this only guards against a stray huge file

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.bmp': 'image/bmp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
}
const TEXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt'])
const DROP = new Set(['.eot', '.psd', '.ai', '.zip', '.rar', '.map', '.db', '.ds_store', '.md', '.scss', '.less', '.sass', '.sketch'])

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (entry.isFile()) yield full
  }
}

/** The `original-templates/<folder>` names the gallery catalog points at. */
function catalogFolders(catalog) {
  const folders = new Set()
  for (const t of catalog) {
    for (const url of [t.url, t.thumbnail, ...(t.pages ?? []).map((p) => p.url)]) {
      const m = /^\/original-templates\/([^/]+)\//.exec(url ?? '')
      if (m) folders.add(m[1])
    }
  }
  return folders
}

/** Every `/templates/<folder>/<file>` picture named anywhere in the client source. */
async function referencedTemplateFiles() {
  const found = new Set()
  const pattern = /['"`(]\/templates\/([A-Za-z0-9_.-]+\/[^'"`)\s\\]+)/g
  for await (const file of walk(CLIENT_SRC)) {
    if (!/\.(tsx?|css|json|js)$/.test(file)) continue
    const text = await fs.readFile(file, 'utf8')
    for (const m of text.matchAll(pattern)) found.add(decodeURIComponent(m[1].split(/[?#]/)[0]))
  }
  return found
}

/** Shrinks a picture and returns the smaller of the original and the result. */
async function optimiseImage(buf, ext) {
  try {
    let img = sharp(buf, { failOn: 'none' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    let out
    if (ext === '.png') {
      out = await img.clone().png({ compressionLevel: 9, effort: 7 }).toBuffer()
      if (out.length > 400 * 1024) {
        const palette = await img.clone().png({ palette: true, quality: 85, effort: 7 }).toBuffer()
        if (palette.length < out.length) out = palette
      }
    } else {
      out = await img.jpeg({ quality: 80, mozjpeg: true }).toBuffer()
    }
    return out.length < buf.length ? out : buf
  } catch {
    return buf
  }
}

async function prepare(file, prefix, dir) {
  const rel = path.relative(dir, file).split(path.sep).join('/')
  const ext = path.extname(rel).toLowerCase()
  const source = await fs.readFile(file)
  const srcHash = createHash('sha1').update(source).update(PIPELINE).digest('hex')
  return { rel, ext, source, srcHash, id: `${prefix}/${rel}` }
}

async function encode({ ext, source }) {
  let data = source
  let encoding = 'identity'
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') data = await optimiseImage(source, ext)
  if (TEXT.has(ext)) {
    const zipped = gzipSync(source, { level: 9 })
    if (zipped.length < source.length) { data = zipped; encoding = 'gzip' }
  }
  return { data, encoding }
}

const UPSERT = (table) => `
  INSERT INTO ${table} (id, lc, template, kind, path, content_type, encoding, size, raw_size, src_hash, hash, data, updated_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
  ON CONFLICT (id) DO UPDATE SET lc = EXCLUDED.lc, template = EXCLUDED.template, kind = EXCLUDED.kind,
    path = EXCLUDED.path, content_type = EXCLUDED.content_type, encoding = EXCLUDED.encoding, size = EXCLUDED.size,
    raw_size = EXCLUDED.raw_size, src_hash = EXCLUDED.src_hash, hash = EXCLUDED.hash, data = EXCLUDED.data,
    updated_at = now()`

function mb(n) { return (n / 1048576).toFixed(1) + ' MB' }

async function main() {
  const db = DRY_RUN ? null : await connect() // also creates the tables
  const assets = db ? `"${SCHEMA}"."template_assets"` : null
  if (db) {
    console.log(`Connected. Schema "${SCHEMA}".`)
  } else console.log('DRY RUN: nothing is written.')

  const catalog = JSON.parse(await fs.readFile(CATALOG, 'utf8'))
  const folders = catalogFolders(catalog)
  const pictures = await referencedTemplateFiles()
  console.log(ALL ? 'Importing everything (--all).' : `Importing ${folders.size} catalog templates and ${pictures.size} referenced pictures.`)
  const wanted = (prefix, rel) => ALL || (prefix === 'original-templates' ? folders.has(rel.split('/')[0]) : pictures.has(rel))

  const totals = { files: 0, skipped: 0, dropped: 0, unused: 0, unchanged: 0, tooBig: 0, raw: 0, stored: 0 }
  const byExt = {}
  let batch = []
  let batchBytes = 0
  const seen = new Set()

  const flush = async () => {
    if (!batch.length) return
    // Take the batch *before* awaiting: the other workers keep adding to `batch`
    // while a write is in flight, and clearing it afterwards silently threw those
    // files away (about 1 in 60 never reached the database).
    const ops = batch
    batch = []; batchBytes = 0
    if (assets) for (const op of ops) await db.query(UPSERT(assets), op)
  }

  for (const { prefix, dir } of ROOTS) {
    const files = []
    for await (const f of walk(dir)) files.push(f)
    const existing = new Map()
    if (assets) for (const d of (await db.query(`SELECT id, src_hash FROM ${assets} WHERE kind = $1`, [prefix])).rows) existing.set(d.id, d.src_hash)

    let index = 0
    const worker = async () => {
      while (index < files.length) {
        const file = files[index++]
        const rel = path.relative(dir, file).split(path.sep).join('/')
        const ext = path.extname(rel).toLowerCase()
        const template = rel.split('/')[0]
        if (ONLY && !rel.includes(ONLY)) continue
        if (!wanted(prefix, rel)) { totals.unused++; continue }
        if (!rel.includes('/')) { totals.dropped++; continue } // loose files at the root, e.g. candidates.json
        if (DROP.has(ext)) { totals.dropped++; continue }
        if (!TYPES[ext]) { totals.skipped++; continue }

        const item = await prepare(file, prefix, dir)
        seen.add(item.id)
        totals.files++
        totals.raw += item.source.length
        if (existing.get(item.id) === item.srcHash) { totals.unchanged++; continue }

        const { data, encoding } = await encode(item)
        if (data.length > MAX_STORED) { totals.tooBig++; console.warn(`  too big, skipped: ${item.id} (${mb(data.length)})`); continue }
        totals.stored += data.length
        byExt[ext] ??= { n: 0, raw: 0, stored: 0 }
        byExt[ext].n++; byExt[ext].raw += item.source.length; byExt[ext].stored += data.length

        batch.push([
          item.id, item.id.toLowerCase(), template, prefix, item.rel, TYPES[ext], encoding,
          data.length, item.source.length, item.srcHash, createHash('sha1').update(data).digest('hex'), data,
        ])
        batchBytes += data.length
        if (batchBytes > 24 * 1024 * 1024 || batch.length >= 500) await flush()
        if (totals.files % 500 === 0) console.log(`  ${totals.files} files… ${mb(totals.raw)} in, ${mb(totals.stored)} out`)
      }
    }
    console.log(`Scanning ${prefix}: ${files.length} files`)
    await Promise.all(Array.from({ length: 4 }, worker))
    await flush()
  }

  if (assets && PRUNE && !ONLY) {
    const stale = (await db.query(`SELECT id FROM ${assets}`)).rows.map((d) => d.id).filter((id) => !seen.has(id))
    if (stale.length) await db.query(`DELETE FROM ${assets} WHERE id = ANY($1)`, [stale])
    console.log(`Pruned ${stale.length} rows for files that no longer exist.`)
  }

  if (db) {
    const col = `"${SCHEMA}"."template_catalog"`
    // `ord` keeps the gallery in the catalog's own order when it is read back.
    for (const [order, t] of catalog.entries()) {
      await db.query(
        `INSERT INTO ${col} (id, ord, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (id) DO UPDATE SET ord = EXCLUDED.ord, data = EXCLUDED.data`,
        [t.id, order, JSON.stringify(t)],
      )
    }
    await db.query(`DELETE FROM ${col} WHERE id <> ALL($1)`, [catalog.map((t) => t.id)])
    console.log(`Catalog: ${catalog.length} templates written to "template_catalog".`)
    await closeStore()
  }

  console.log('\nBy type (new/changed files only):')
  for (const [ext, v] of Object.entries(byExt).sort((a, b) => b[1].stored - a[1].stored))
    console.log(`  ${ext.padEnd(6)} ${String(v.n).padStart(5)} files  ${mb(v.raw).padStart(10)} -> ${mb(v.stored).padStart(10)}`)
  console.log(`\nFiles kept: ${totals.files} (${totals.unchanged} unchanged, ${totals.tooBig} too big). Left out: ${totals.unused} not used by the app, ${totals.dropped} legacy/unneeded, ${totals.skipped} unknown type.`)
  console.log(`Source ${mb(totals.raw)}  ->  stored ${mb(totals.stored)} (new/changed part).`)
}

main().catch((error) => { console.error(error); process.exit(1) })
