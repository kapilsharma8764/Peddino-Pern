import { SCHEMA, connect } from './store.js'

/**
 * Plain parameterised SQL for the repositories. `connect()` hands back the same
 * pool the rest of the server uses (tables and migrations are ready by then);
 * `t('name')` is a table name in the schema this server runs in. Table names
 * come only from the repositories' own source, never from a request.
 */

const quote = (name) => `"${name.replace(/"/g, '""')}"`

export const t = (name) => `${quote(SCHEMA)}.${quote(name)}`

export async function query(text, values = []) {
  const pool = await connect()
  return pool.query(text, values)
}
