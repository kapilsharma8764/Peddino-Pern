import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { upsertContent, upsertPlan, upsertPreset, upsertStarterDesign, upsertWebsiteType } from './repositories/catalog.js'

/**
 * Loads the product-managed content into PostgreSQL from the seed files in
 * `client/src/data/seed/` (the same files the client keeps as its offline
 * fallback, so the two never drift). Every row is an upsert keyed by slug (or
 * page + section), so running this twice changes nothing and an edited row in
 * the seed file replaces its row in the database.
 */

export const SEED_DIR = fileURLToPath(new URL('../../client/src/data/seed/', import.meta.url))

async function readSeed(dir, name) {
  return JSON.parse(await readFile(join(dir, `${name}.json`), 'utf8'))
}

export async function seedContent({ dir = SEED_DIR, log = () => {} } = {}) {
  const counts = {}
  const run = async (name, rows, save) => {
    let done = 0
    for (const row of rows) {
      try {
        await save(row)
        done += 1
      } catch (error) {
        log(`  failed ${name} ${row.slug ?? `${row.pageKey}/${row.sectionKey}`}: ${error.message}`)
      }
    }
    counts[name] = done
    log(`  ${name}: ${done} of ${rows.length}`)
  }

  const [types, designs, presets, plans, content] = await Promise.all(
    ['website_types', 'starter_designs', 'business_presets', 'pricing_plans', 'site_content'].map((name) => readSeed(dir, name)),
  )

  // A website type that lists a design nobody defined would show an empty gallery row.
  const designSlugs = new Set(designs.map((design) => design.slug))
  for (const type of types) for (const slug of type.designs) if (!designSlugs.has(slug)) log(`  warning: ${type.slug} lists unknown design ${slug}`)

  await run('starter_designs', designs, upsertStarterDesign)
  await run('website_types', types, upsertWebsiteType)
  await run('business_presets', presets, upsertPreset)
  await run('pricing_plans', plans, upsertPlan)
  await run('site_content', content, upsertContent)
  return counts
}
