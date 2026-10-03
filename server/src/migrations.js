import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

/**
 * Applies the SQL files in `server/migrations/`, oldest name first, once each.
 *
 * Applied names are kept in `schema_migrations`. A session-level advisory lock
 * makes two servers starting together (serverless cold starts) take turns, and
 * each file runs in its own transaction so a failed one leaves nothing half-made.
 * `__SCHEMA__` in a file is replaced with the schema the server runs in.
 */

const DIR = fileURLToPath(new URL('../migrations/', import.meta.url))
const LOCK_ID = 7_302_641
const quote = (name) => `"${name.replace(/"/g, '""')}"`

export async function migrationFiles(dir = DIR) {
  return (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()
}

export async function applyMigrations(pool, schema, dir = DIR) {
  const target = quote(schema)
  // The usual start: everything is already applied, so no lock is needed. (Through a
  // transaction-mode pooler such as Supabase's port 6543 a session lock is unreliable,
  // so it is only taken when there is something to apply.)
  try {
    const { rows } = await pool.query(`SELECT name FROM ${target}.schema_migrations`)
    const applied = new Set(rows.map((row) => row.name))
    if ((await migrationFiles(dir)).every((name) => applied.has(name))) return []
  } catch { /* the table is not there yet: the first run, below */ }
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID])
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${target}.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
    )
    const done = new Set((await client.query(`SELECT name FROM ${target}.schema_migrations`)).rows.map((row) => row.name))
    const applied = []
    for (const name of await migrationFiles(dir)) {
      if (done.has(name)) continue
      const sql = (await readFile(join(dir, name), 'utf8')).replaceAll('__SCHEMA__', target)
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query(`INSERT INTO ${target}.schema_migrations (name) VALUES ($1)`, [name])
        await client.query('COMMIT')
        applied.push(name)
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        error.message = `Migration ${name} failed: ${error.message}`
        throw error
      }
    }
    return applied
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {})
    client.release()
  }
}
