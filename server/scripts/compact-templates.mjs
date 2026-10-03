import '../src/load-env.js'
import pg from 'pg'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { compactAsset, dropLargeVideos, fitToBudget } from '../src/compact-assets.js'

const output = fileURLToPath(new URL('../data/compact-templates/', import.meta.url))
const limit = 750 * 1024 * 1024 // leave room for indexes, content and users in a 1 GB database
const maxVideo = Number(process.env.MAX_VIDEO_MB ?? 3) * 1024 * 1024 // bigger videos stay out of the hosted copy
const fitBudget = Number(process.env.FIT_MB ?? 300) * 1024 * 1024 // the template files in a database whose plan is 512 MB
const planLimitMb = Number(process.env.DB_LIMIT_MB ?? 512)
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`

async function exportLocal() {
  const url = new URL(process.env.DATABASE_URL)
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
    throw new Error('Export requires the local PostgreSQL source database')
  }
  const source = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 })
  try {
    await mkdir(join(output, 'blobs'), { recursive: true })
    const assets = (await source.query(`SELECT id, lc, template, kind, path, content_type, encoding,
      size, raw_size, src_hash, hash FROM public.template_assets ORDER BY id`)).rows
    const catalog = (await source.query('SELECT id, ord, data FROM public.template_catalog ORDER BY ord')).rows
    const groups = new Map()
    for (const asset of assets) {
      const key = `${asset.hash}:${asset.content_type}:${asset.encoding}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(asset)
    }
    const pending = [...groups.values()]
    const blobs = new Map()
    let index = 0, done = 0
    const warnings = []
    const worker = async () => {
      while (index < pending.length) {
        const aliases = pending[index++]
        const first = aliases[0]
        const { rows } = await source.query('SELECT data FROM public.template_assets WHERE id = $1', [first.id])
        const compact = await compactAsset(rows[0].data, first.content_type, first.encoding)
        if (compact.warning) warnings.push({ id: first.id, reason: compact.warning })
        if (!blobs.has(compact.hash)) {
          blobs.set(compact.hash, compact.data.length)
          await writeFile(join(output, 'blobs', compact.hash), compact.data)
        }
        for (const asset of aliases) {
          asset.hash = compact.hash
          asset.blob_hash = compact.hash
          asset.size = compact.data.length
          asset.content_type = compact.contentType
        }
        done++
        if (done % 2000 === 0) console.log(`Optimized ${done}/${pending.length} unique files`)
      }
    }
    await Promise.all(Array.from({ length: 4 }, worker))
    const bytes = [...blobs.values()].reduce((sum, size) => sum + size, 0)
    const full = { assets, catalog, blobs: [...blobs].map(([hash, size]) => ({ hash, size })), bytes, warnings }
    console.log(`Export: ${assets.length} URLs, ${blobs.size} shared files, ${catalog.length} templates, ${mb(bytes)}`)
    const manifest = dropLargeVideos(full, maxVideo)
    await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest))
    console.log(`Left out ${manifest.droppedVideos.length} video files over ${mb(maxVideo)}; hosted copy: ${manifest.assets.length} URLs, ${manifest.blobs.length} files, ${mb(manifest.bytes)}`)
    if (warnings.length) console.log(`Kept ${warnings.length} source images that could not be optimized; paths are recorded in the manifest.`)
    if (manifest.bytes > limit) throw new Error(`Export exceeds the ${mb(limit)} asset budget; nothing was uploaded`)
    console.log('Ready for a 1 GB database. The local database and template files were not changed.')
  } finally {
    await source.end()
  }
}

async function importHosted() {
  const url = new URL(process.env.DATABASE_URL)
  const verify = process.argv.includes('--verify-export')
  const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (verify && !isLocal) throw new Error('Export verification only uses local PostgreSQL')
  if (!verify && isLocal) {
    throw new Error('Import requires DATABASE_URL for the hosted target')
  }
  if (verify) process.env.SITEBUILDER_PG_SCHEMA = `sb_test_compact_${randomBytes(8).toString('hex')}`
  const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'))
  if (manifest.bytes > limit) throw new Error('The export is too large for the 1 GB database budget')
  const { connect, closeStore, SCHEMA } = await import('../src/store.js')
  const schema = `"${SCHEMA.replaceAll('"', '""')}"`
  let db
  try {
    db = await connect()
    // A run that stopped halfway (a dropped connection) resumes: files already stored are not sent again.
    const stored = new Set((await db.query(`SELECT hash FROM ${schema}.template_blobs`)).rows.map((row) => row.hash))
    // Blob batches bound memory and avoid a network round trip for every asset.
    let hashes = [], buffers = [], batchBytes = 0, sent = 0
    const flush = async () => {
      if (!hashes.length) return
      for (let attempt = 1; ; attempt += 1) {
        try {
          await db.query(`INSERT INTO ${schema}.template_blobs (hash, data)
            SELECT * FROM unnest($1::text[], $2::bytea[]) ON CONFLICT (hash) DO NOTHING`, [hashes, buffers])
          break
        } catch (error) {
          if (attempt === 4) throw error
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt))
        }
      }
      sent += hashes.length
      if (sent % 3000 < hashes.length) console.log(`Stored ${sent} new files`)
      hashes = []; buffers = []; batchBytes = 0
    }
    for (const blob of manifest.blobs) {
      if (!/^[a-f0-9]{64}$/.test(blob.hash)) throw new Error('Invalid export hash')
      if (stored.has(blob.hash)) continue
      const data = await readFile(join(output, 'blobs', blob.hash))
      if (data.length !== blob.size || createHash('sha256').update(data).digest('hex') !== blob.hash) {
        throw new Error('An exported asset is incomplete or changed')
      }
      hashes.push(blob.hash); buffers.push(data); batchBytes += data.length
      if (batchBytes >= 8 * 1024 * 1024 || hashes.length >= 300) await flush()
    }
    await flush()
    for (let offset = 0; offset < manifest.assets.length; offset += 500) {
      const batch = JSON.stringify(manifest.assets.slice(offset, offset + 500))
      await db.query(`INSERT INTO ${schema}.template_assets
        (id, lc, template, kind, path, content_type, encoding, size, raw_size, src_hash, hash, blob_hash, data)
        SELECT id, lc, template, kind, path, content_type, encoding, size, raw_size, src_hash, hash, blob_hash, NULL
        FROM jsonb_to_recordset($1::jsonb) AS x(id text, lc text, template text, kind text, path text,
          content_type text, encoding text, size integer, raw_size integer, src_hash text, hash text, blob_hash text)
        ON CONFLICT (id) DO UPDATE SET lc=EXCLUDED.lc, template=EXCLUDED.template, kind=EXCLUDED.kind,
          path=EXCLUDED.path, content_type=EXCLUDED.content_type, encoding=EXCLUDED.encoding,
          size=EXCLUDED.size, raw_size=EXCLUDED.raw_size, src_hash=EXCLUDED.src_hash,
          hash=EXCLUDED.hash, blob_hash=EXCLUDED.blob_hash, data=NULL`, [batch])
    }
    await db.query(`INSERT INTO ${schema}.template_catalog (id, ord, data)
      SELECT id, ord, data FROM jsonb_to_recordset($1::jsonb) AS x(id text, ord integer, data jsonb)
      ON CONFLICT (id) DO UPDATE SET ord=EXCLUDED.ord, data=EXCLUDED.data`, [JSON.stringify(manifest.catalog)])
    console.log(`Imported ${manifest.assets.length} asset URLs and ${manifest.catalog.length} templates`)
    const missing = await db.query(`SELECT count(*)::int AS missing FROM ${schema}.template_assets a
      LEFT JOIN ${schema}.template_blobs b ON a.blob_hash=b.hash WHERE COALESCE(a.data,b.data) IS NULL`)
    if (missing.rows[0].missing) throw new Error('Some imported URLs have no file data')
    const size = await db.query(`SELECT sum(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)))::bigint AS bytes
      FROM pg_tables WHERE schemaname=$1`, [SCHEMA])
    console.log(`Database schema size: ${mb(Number(size.rows[0].bytes))}`)
    if (Number(size.rows[0].bytes) > planLimitMb * 0.8 * 1024 * 1024) throw new Error(`The imported schema leaves too little space for users in a ${planLimitMb} MB database`)
  } finally {
    if (verify && db) {
      if (!/^sb_test_compact_[a-f0-9]{16}$/.test(SCHEMA)) throw new Error('Invalid verification schema')
      await db.query(`DROP SCHEMA ${schema} CASCADE`)
      console.log('Removed the temporary verification schema.')
    }
    await closeStore()
  }
}

/** Cuts an export down to the templates that fit FIT_MB, keeping the full export beside it as manifest.all.json. */
async function fitExisting() {
  const file = join(output, 'manifest.json')
  const all = join(output, 'manifest.all.json')
  const exists = await stat(all).then(() => true, () => false)
  if (!exists) await copyFile(file, all)
  const fitted = fitToBudget(JSON.parse(await readFile(all, 'utf8')), fitBudget)
  await writeFile(file, JSON.stringify(fitted))
  console.log(`Fits ${mb(fitBudget)}: ${fitted.catalog.length} original templates (${fitted.leftOutTemplates.length} left out), ${fitted.assets.length} URLs, ${fitted.blobs.length} files, ${mb(fitted.bytes)}`)
}

/** Applies the video limit to an export that was made without it, without redoing the image work. */
async function trimExisting() {
  const file = join(output, 'manifest.json')
  const trimmed = dropLargeVideos(JSON.parse(await readFile(file, 'utf8')), maxVideo)
  await writeFile(file, JSON.stringify(trimmed))
  console.log(`Left out ${trimmed.droppedVideos.length} video files over ${mb(maxVideo)}; hosted copy: ${trimmed.assets.length} URLs, ${trimmed.blobs.length} files, ${mb(trimmed.bytes)}`)
  if (trimmed.bytes > limit) throw new Error(`Still over the ${mb(limit)} asset budget`)
}

try {
  if (process.argv.includes('--fit')) await fitExisting()
  else if (process.argv.includes('--trim')) await trimExisting()
  else if (process.argv.includes('--import') || process.argv.includes('--verify-export')) await importHosted()
  else await exportLocal()
} catch (error) {
  console.error(error instanceof TypeError ? 'Check the database configuration.' : error.message)
  process.exitCode = 1
}
