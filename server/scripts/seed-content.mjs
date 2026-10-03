#!/usr/bin/env node
/**
 * Loads website types, starter designs, business presets, pricing plans and
 * marketing content into PostgreSQL from client/src/data/seed/*.json.
 *
 *   npm run seed:content            (from server/)
 *
 * Safe to run again: rows are upserted by slug, nothing is duplicated.
 * Point it at a hosted database by setting DATABASE_URL first.
 */
import '../src/load-env.js'
import { closeStore, connect } from '../src/store.js'
import { seedContent } from '../src/seed.js'

try {
  await connect() // creates the tables and applies migrations
  console.log('Seeding content…')
  const counts = await seedContent({ log: console.log })
  console.log('Done.', counts)
} catch (error) {
  console.error('Seeding failed:', error.message)
  process.exitCode = 1
} finally {
  await closeStore()
}
