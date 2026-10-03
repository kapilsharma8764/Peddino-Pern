import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Loads `server/.env` before anything else in the process runs.
 *
 * This has to be the very first thing `index.js` imports: ES module imports
 * are evaluated in the order they're written, and `auth.js` / `google-auth.js`
 * read `process.env` once, at import time — so this file's own imports must
 * come before theirs, or a value set in `.env` would arrive too late to be
 * seen.
 *
 * Does nothing if there is no `.env` file (an install using real environment
 * variables instead), and does nothing on a Node version that predates
 * `process.loadEnvFile` (in which case set environment variables directly).
 */
const envFile = join(dirname(fileURLToPath(import.meta.url)), '..', '.env')
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile)
}
