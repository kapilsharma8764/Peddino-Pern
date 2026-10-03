#!/usr/bin/env node
/**
 * Loads the widget-based layout templates into PostgreSQL (`templates`).
 *
 * They are written as TypeScript modules in
 * client/src/templates/library/imported/*.ts. This bundles that folder with the
 * client's own esbuild, reads the templates out of it, works out the light fields the
 * gallery lists (tags, a thumbnail, a small preview, page count, whether any picture is
 * missing) and upserts one row per template keyed by slug. See src/layout-import.js.
 *
 *   npm run import:layout-templates                 import into DATABASE_URL
 *   npm run import:layout-templates -- --dry-run    read and report, write nothing
 *   npm run import:layout-templates -- --only=bedoctor
 *
 * One broken template is logged and skipped; it never stops the rest. Safe to re-run.
 */
import '../src/load-env.js'
import { closeStore } from '../src/store.js'
import { importLayoutTemplates } from '../src/layout-import.js'

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true] }))

try {
  const result = await importLayoutTemplates({ dryRun: Boolean(args['dry-run']), only: typeof args.only === 'string' ? args.only : null, log: console.log })
  if (result.failed.length) process.exitCode = 1
} catch (error) {
  console.error('Import failed:', error.message)
  process.exitCode = 1
} finally {
  await closeStore().catch(() => {})
}
