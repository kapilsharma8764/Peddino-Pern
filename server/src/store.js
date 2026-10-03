import pg from 'pg'
import { randomUUID, createHash } from 'node:crypto'
import { applyMigrations } from './migrations.js'

/**
 * Where the server keeps its data: PostgreSQL.
 *
 * Every route goes through this module by plain functions — list, find, get,
 * insert, update, remove, increment — so nothing outside this file knows
 * which database it is talking to. A record's public shape is a plain object
 * with a string `id`, exactly as before.
 *
 * Each collection (users, sites, leads) is one table: `id` plus the whole
 * record as JSONB in `data`. That keeps the records flexible (a site is a big
 * nested document) while Postgres still guards what matters: unique ids, one
 * account per email, one site per public address.
 *
 * `DATABASE_URL` points at the server (default: a Postgres on this machine).
 * Tests and CI set `SITEBUILDER_DATA` to a unique path per run; that path is
 * turned into a schema name, so a throwaway run gets throwaway tables.
 */

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/sitebuilder'

function sanitizeSchemaName(raw) {
  const hash = createHash('sha1').update(raw).digest('hex').slice(0, 10)
  const readable = raw.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(-30).toLowerCase()
  return `sb_${readable || 'db'}_${hash}`.slice(0, 63)
}

// With nothing set, every way of starting the server lands on the same
// schema, so an account made one way is still there when the server is
// started another. Only tests and CI set `SITEBUILDER_DATA`.
export const SCHEMA =
  process.env.SITEBUILDER_PG_SCHEMA ??
  (process.env.SITEBUILDER_DATA ? sanitizeSchemaName(process.env.SITEBUILDER_DATA) : 'public')

const q = (name) => `"${name.replace(/"/g, '""')}"`
const table = (name) => `${q(SCHEMA)}.${q(name)}`

// Only these collections exist. A name is never taken from a request, but the
// list keeps table names out of reach of anything else all the same.
const COLLECTIONS = new Set(['users', 'sites', 'leads'])

let pool = null
let ready = null

export class DatabaseUnavailableError extends Error {
  constructor(cause) {
    super('The database is unavailable', { cause })
    this.name = 'DatabaseUnavailableError'
  }
}

async function database() {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new DatabaseUnavailableError()
  }
  if (!pool) {
    // A short, explicit timeout: if the database is unreachable, a request
    // fails in a few seconds with a clear error rather than hanging.
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 5000,
      max: 10,
      ssl: /sslmode=require/.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
    })
    pool.on('error', (error) => console.error('[db] idle client error', error.message))
  }
  if (!ready) {
    ready = createTables(pool)
    // A failed attempt must not be cached — the next call tries again.
    ready.catch(() => {
      ready = null
    })
  }
  try {
    await ready
  } catch (error) {
    throw new DatabaseUnavailableError(error)
  }
  return pool
}

async function createTables(db) {
  await db.query(`CREATE SCHEMA IF NOT EXISTS ${q(SCHEMA)}`)
  for (const name of COLLECTIONS) {
    await db.query(`CREATE TABLE IF NOT EXISTS ${table(name)} (id text PRIMARY KEY, data jsonb NOT NULL)`)
  }
  // Uniqueness the route handlers assume: two sign-ups for the same address,
  // racing, cannot both succeed. A site not yet published has no `slug`
  // string, so many unpublished sites can coexist.
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON ${table('users')} ((data->>'email'))`,
  )
  await db.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS sites_slug_key ON ${table('sites')} ((data->>'slug'))
       WHERE jsonb_typeof(data->'slug') = 'string'`,
  )
  await db.query(`CREATE INDEX IF NOT EXISTS sites_user_idx ON ${table('sites')} ((data->>'userId'))`)
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${table('template_assets')} (
      id text PRIMARY KEY,
      lc text NOT NULL,
      template text,
      kind text,
      path text,
      content_type text NOT NULL,
      encoding text NOT NULL DEFAULT 'identity',
      size integer,
      raw_size integer,
      src_hash text,
      hash text NOT NULL,
      data bytea NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`)
  await db.query(`CREATE INDEX IF NOT EXISTS template_assets_lc_idx ON ${table('template_assets')} (lc)`)
  await db.query(`CREATE INDEX IF NOT EXISTS template_assets_template_idx ON ${table('template_assets')} (template)`)
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${table('template_catalog')} (
      id text PRIMARY KEY,
      ord integer NOT NULL,
      data jsonb NOT NULL
    )`)
  // Everything newer than the tables above (content, layout templates, per-user
  // data, rate limits) is a SQL file in server/migrations/.
  await applyMigrations(db, SCHEMA)
}

/** The ready pool (tables created) — for the import scripts. */
export const connect = database

export async function checkDatabase() {
  const db = await database()
  await db.query('SELECT 1')
}

/** Closes the connection cleanly — used when the server shuts down. */
export async function closeStore() {
  ready = null
  if (pool) {
    const closing = pool
    pool = null
    await closing.end()
  }
}

class DuplicateError extends Error {
  constructor(field) {
    super(`${field} already exists`)
    this.field = field
  }
}

/** The field a unique-index violation was for, or null. */
function duplicateField(error) {
  if (error?.code !== '23505') return null
  const name = String(error.constraint ?? '')
  if (name.startsWith('users_email')) return 'email'
  if (name.startsWith('sites_slug')) return 'slug'
  if (name.endsWith('_pkey')) return 'id'
  return name || 'value'
}

function collection(name) {
  if (!COLLECTIONS.has(name)) throw new Error(`Unknown collection "${name}"`)
  return table(name)
}

/** A stored row as the plain object routes expect: its data, with `id`. */
function toPublic(row) {
  return row ? { ...row.data, id: row.id } : row
}

/**
 * Turns a small filter object into SQL. Supports what the routes use: a plain
 * value (`{ userId }`, `{ published: true }`) and `{ field: { $type: 'string' } }`.
 */
function whereFor(filter, values) {
  const clauses = []
  for (const [field, condition] of Object.entries(filter)) {
    if (field === 'id') {
      values.push(String(condition))
      clauses.push(`id = $${values.length}`)
    } else if (condition && typeof condition === 'object' && '$type' in condition) {
      values.push(field)
      clauses.push(`jsonb_typeof(data->$${values.length}) = '${condition.$type === 'string' ? 'string' : 'null'}'`)
    } else {
      values.push(JSON.stringify({ [field]: condition }))
      clauses.push(`data @> $${values.length}::jsonb`)
    }
  }
  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
}

export async function list(name, filter = {}) {
  const db = await database()
  const values = []
  const where = whereFor(filter, values)
  const { rows } = await db.query(`SELECT id, data FROM ${collection(name)} ${where}`, values)
  return rows.map(toPublic)
}

export async function find(name, predicate) {
  return (await list(name)).find(predicate)
}

export async function get(name, id) {
  const db = await database()
  const { rows } = await db.query(`SELECT id, data FROM ${collection(name)} WHERE id = $1`, [id])
  return toPublic(rows[0])
}

export async function insert(name, record) {
  const db = await database()
  const now = new Date().toISOString()
  const row = { id: randomUUID(), createdAt: now, updatedAt: now, ...record }
  const { id, ...data } = row
  try {
    await db.query(`INSERT INTO ${collection(name)} (id, data) VALUES ($1, $2::jsonb)`, [id, JSON.stringify(data)])
  } catch (error) {
    const field = duplicateField(error)
    if (field) throw new DuplicateError(field)
    throw error
  }
  return row
}

export async function update(name, id, changes) {
  const db = await database()
  // `id` is never touched by `changes`, even if a caller passed one — the
  // row being updated is the one named by `id`, not by anything in the patch.
  const { id: _ignored, ...safeChanges } = changes
  const patch = { ...safeChanges, updatedAt: new Date().toISOString() }
  let result
  try {
    result = await db.query(
      `UPDATE ${collection(name)} SET data = data || $2::jsonb WHERE id = $1 RETURNING id, data`,
      [id, JSON.stringify(patch)],
    )
  } catch (error) {
    const field = duplicateField(error)
    if (field) throw new DuplicateError(field)
    throw error
  }
  return result.rowCount === 0 ? null : toPublic(result.rows[0])
}

export { DuplicateError }

export async function remove(name, id) {
  const db = await database()
  const result = await db.query(`DELETE FROM ${collection(name)} WHERE id = $1`, [id])
  return result.rowCount > 0
}

/**
 * One stored template file — a page, stylesheet, font or picture — looked up
 * by the same path the browser asks for (`original-templates/foo/img/a.jpg`).
 * Loaded by `scripts/import-templates.mjs`.
 */
export async function getTemplateAsset(id, { loose = false } = {}) {
  const db = await database()
  const { rows } = loose
    ? await db.query(
        `SELECT a.content_type, a.encoding, a.hash, COALESCE(a.data, b.data) AS data
         FROM ${table('template_assets')} a LEFT JOIN ${table('template_blobs')} b ON a.blob_hash = b.hash
         WHERE a.lc = $1 LIMIT 1`,
        [id.toLowerCase()],
      )
    : await db.query(
        `SELECT a.content_type, a.encoding, a.hash, COALESCE(a.data, b.data) AS data
         FROM ${table('template_assets')} a LEFT JOIN ${table('template_blobs')} b ON a.blob_hash = b.hash
         WHERE a.id = $1`,
        [id],
      )
  const row = rows[0]
  if (!row) return null
  return { contentType: row.content_type, encoding: row.encoding, hash: row.hash, data: row.data }
}

/**
 * The template gallery's catalog, in gallery order — the JSON the importer
 * loaded into `template_catalog`. Empty when nothing has been imported yet, in
 * which case the client keeps using the catalog bundled with it.
 */
export async function getTemplateCatalog() {
  const db = await database()
  const { rows } = await db.query(`SELECT id, data FROM ${table('template_catalog')} ORDER BY ord`)
  return rows.map((row) => ({ ...row.data, id: row.id }))
}

/** Adds `by` to a number field in one step, so concurrent counters never overwrite each other. */
export async function increment(name, id, field, by = 1) {
  const db = await database()
  await db.query(
    `UPDATE ${collection(name)}
        SET data = jsonb_set(data, ARRAY[$2]::text[], to_jsonb(COALESCE((data->>$2)::numeric, 0) + $3::numeric))
      WHERE id = $1`,
    [id, field, by],
  )
}
