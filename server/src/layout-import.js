import { createRequire } from 'node:module'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { SCHEMA, connect } from './store.js'
import { upsertTemplate } from './repositories/layout-templates.js'

/**
 * Reads the layout templates out of client/src/templates/library/imported/*.ts and
 * loads them into PostgreSQL (`templates`). Used by `scripts/import-layout-templates.mjs`
 * and by the end-to-end test server, which seeds its throwaway database with it.
 *
 * One broken template is reported and skipped; it never stops the rest. A picture that
 * is missing (an empty gallery, an empty image, a /templates/… file that is not in the
 * database) does not stop the import either: the row is marked `image_status = 'partial'`
 * and the gallery draws the template without it.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CLIENT = path.resolve(HERE, '..', '..', 'client')

const IMAGE_URL = /\.(png|jpe?g|webp|gif|svg|avif)(\?|#|$)|images\.unsplash\.com|images\.pexels\.com/i
const LOCAL_ASSET = /^\/(original-templates|templates)\//
const EMPTY_IMAGE_KEY = /^(images?|photos?|gallery|logos?)$/i
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

/** Bundles the TypeScript templates with the client's esbuild and returns the array they export. */
export async function loadTemplates() {
  const { build } = createRequire(path.join(CLIENT, 'package.json'))('esbuild')
  const dir = await mkdtemp(path.join(tmpdir(), 'layout-templates-'))
  const file = path.join(dir, 'imported.mjs')
  try {
    await build({
      entryPoints: [path.join(CLIENT, 'src', 'templates', 'library', 'imported', 'index.ts')],
      bundle: true, platform: 'node', format: 'esm', outfile: file, logLevel: 'error',
      alias: { '@': path.join(CLIENT, 'src') },
      banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
    })
    const mod = await import(pathToFileURL(file).href)
    if (!Array.isArray(mod.importedTemplates)) throw new Error('imported/index.ts no longer exports importedTemplates')
    return mod.importedTemplates
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** Every image string in a value, depth first, plus a count of image slots that hold nothing. */
export function scan(value, found = { images: [], empty: 0 }, key = '') {
  if (typeof value === 'string') {
    if (IMAGE_URL.test(value) && (/^(https?:)?\/\//.test(value) || value.startsWith('/'))) found.images.push(value)
    else if (value === '' && EMPTY_IMAGE_KEY.test(key)) found.empty += 1
  } else if (Array.isArray(value)) {
    if (value.length === 0 && EMPTY_IMAGE_KEY.test(key)) found.empty += 1
    for (const item of value) scan(item, found, key)
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) scan(v, found, k)
  }
  return found
}

export function tagsFor(template) {
  const words = [template.category, template.source, ...template.pages.map((page) => page.name)]
  for (const section of template.home) words.push(section.type)
  const tags = []
  for (const word of words) {
    const tag = String(word ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    if (tag && tag.length <= 30 && !tags.includes(tag)) tags.push(tag)
  }
  return tags.slice(0, 12)
}

export function checkShape(template) {
  if (!template || typeof template !== 'object') throw new Error('not an object')
  if (typeof template.id !== 'string' || !SLUG.test(template.id)) throw new Error(`id "${template.id}" is not a usable slug`)
  if (typeof template.name !== 'string' || !template.name.trim()) throw new Error('no name')
  if (typeof template.category !== 'string') throw new Error('no category')
  if (!Array.isArray(template.home) || template.home.length === 0) throw new Error('no home sections')
  if (!Array.isArray(template.pages) || !Array.isArray(template.header) || !Array.isArray(template.footer)) throw new Error('header, pages or footer missing')
  if (!template.theme || typeof template.theme !== 'object') throw new Error('no theme')
}

/** Which /templates/… and /original-templates/… files exist in template_assets (lower case, no leading slash). */
async function localAssetsPresent(paths) {
  if (paths.length === 0) return new Set()
  const pool = await connect()
  const { rows } = await pool.query(`SELECT lc FROM "${SCHEMA}".template_assets WHERE lc = ANY($1::text[])`, [paths])
  return new Set(rows.map((row) => row.lc))
}

/** The row stored for a template: its light fields, a small preview, and the full tree. */
export function rowFor(template, index, { imagesChecked }) {
  const found = scan(template)
  const local = [...new Set(found.images.filter((url) => LOCAL_ASSET.test(url)))]
  const missingLocal = imagesChecked ? local.filter((url) => !imagesChecked.has(url.slice(1).toLowerCase())) : []
  const missing = found.empty + missingLocal.length
  return {
    missing,
    emptySlots: found.empty,
    missingFiles: missingLocal.length,
    row: {
      slug: template.id,
      name: template.name.trim(),
      category: template.category,
      description: template.description ?? '',
      thumbnail: found.images.find((url) => !missingLocal.includes(url)) ?? null,
      previewImage: null,
      templateData: template,
      previewData: { theme: template.theme, header: template.header, home: template.home.slice(0, 3) },
      tags: tagsFor(template),
      source: template.source ?? '',
      pageCount: 1 + template.pages.length,
      imageStatus: missing > 0 ? 'partial' : 'ok',
      sortOrder: (index + 1) * 10,
    },
  }
}

/** Imports the templates (or only `only`). With `dryRun` it reads and reports but writes nothing. */
export async function importLayoutTemplates({ dryRun = false, only = null, log = () => {} } = {}) {
  const all = await loadTemplates()
  const chosen = only ? all.filter((template) => template.id === only) : all
  log(`Read ${all.length} templates${only ? `, importing only "${only}" (${chosen.length})` : ''}${dryRun ? ' (dry run)' : ''}.`)
  if (!dryRun) await connect()

  let imported = 0
  let partial = 0
  const failed = []
  const seen = new Set()
  for (const [index, template] of chosen.entries()) {
    try {
      checkShape(template)
      if (seen.has(template.id)) throw new Error('duplicate id in the source')
      seen.add(template.id)
      const local = [...new Set(scan(template).images.filter((url) => LOCAL_ASSET.test(url)))].map((url) => url.slice(1).toLowerCase())
      // A dry run has no database to ask, so it treats every file as present.
      const present = dryRun ? new Set(local) : await localAssetsPresent(local)
      const { row, missing, emptySlots, missingFiles } = rowFor(template, index, { imagesChecked: present })
      if (missing > 0) partial += 1
      if (!dryRun) await upsertTemplate(row)
      imported += 1
      if (missing > 0) log(`  ok (partial images: ${emptySlots} empty, ${missingFiles} missing files)  ${template.id}`)
    } catch (error) {
      failed.push({ id: template?.id ?? `#${index}`, reason: error.message })
      log(`  FAILED  ${template?.id ?? `#${index}`}: ${error.message}`)
    }
  }
  log(`\nImported ${imported} of ${chosen.length}; failed ${failed.length}; ${partial} have a missing or empty picture (they still import and still render).`)
  return { total: chosen.length, imported, failed, partial }
}
