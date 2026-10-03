#!/usr/bin/env node
/**
 * Starts the API for the end-to-end tests with a seeded database.
 *
 * The tests run against a throwaway schema (SITEBUILDER_DATA). The app now reads
 * its website types, starter designs, presets, pricing, marketing copy and layout
 * templates from PostgreSQL, so that schema is filled the same way a real install
 * is — `seedContent` and the layout-template import — before the API starts.
 */
import '../src/load-env.js'
import { connect } from '../src/store.js'
import { seedContent } from '../src/seed.js'
import { importLayoutTemplates } from '../src/layout-import.js'

await connect()
await seedContent()
const { failed, imported } = await importLayoutTemplates()
if (failed.length) console.warn(`[e2e] ${failed.length} layout templates failed to import`)
console.log(`[e2e] seeded content and ${imported} layout templates`)
await import('../src/index.js')
