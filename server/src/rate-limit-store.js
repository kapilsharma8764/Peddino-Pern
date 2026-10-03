import { query, t } from './db.js'

/**
 * A rate-limit store for express-rate-limit that keeps its counters in
 * PostgreSQL (`rate_limits`), so a restart, a redeploy or a second serverless
 * instance does not hand everyone a fresh allowance.
 *
 * One upsert per request: the row for this limiter and client is created, or
 * counted up, or restarted when its window has passed — all in one statement,
 * so two requests at the same moment cannot both read the same count.
 * `prefix` keeps the limiters (general, sign-in, enquiries, AI) apart.
 *
 * If the database cannot be reached the limiters are created with
 * `passOnStoreError`, so the API keeps answering rather than refusing everyone.
 */
export class PgRateLimitStore {
  localKeys = false

  constructor(prefix, run = query) {
    this.prefix = prefix
    this.run = run
    this.windowMs = 60_000
  }

  init(options) {
    this.windowMs = options.windowMs
    sweep(this.run)
  }

  name(key) {
    return `${this.prefix}:${key}`
  }

  async get(key) {
    const { rows } = await this.run(`SELECT hits, reset_at FROM ${t('rate_limits')} WHERE key = $1 AND reset_at > now()`, [this.name(key)])
    return rows[0] ? { totalHits: rows[0].hits, resetTime: new Date(rows[0].reset_at) } : undefined
  }

  async increment(key) {
    const { rows } = await this.run(
      `INSERT INTO ${t('rate_limits')} AS r (key, hits, reset_at)
            VALUES ($1, 1, now() + make_interval(secs => $2::double precision / 1000))
       ON CONFLICT (key) DO UPDATE SET
            hits = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.hits + 1 END,
            reset_at = CASE WHEN r.reset_at <= now() THEN now() + make_interval(secs => $2::double precision / 1000) ELSE r.reset_at END
       RETURNING hits, reset_at`,
      [this.name(key), this.windowMs],
    )
    return { totalHits: rows[0].hits, resetTime: new Date(rows[0].reset_at) }
  }

  async decrement(key) {
    await this.run(`UPDATE ${t('rate_limits')} SET hits = GREATEST(hits - 1, 0) WHERE key = $1`, [this.name(key)])
  }

  async resetKey(key) {
    await this.run(`DELETE FROM ${t('rate_limits')} WHERE key = $1`, [this.name(key)])
  }
}

let sweeping = false
/** Drops rows whose window ended more than an hour ago. Started once, never keeps the process alive. */
function sweep(run) {
  if (sweeping) return
  sweeping = true
  const clean = () => run(`DELETE FROM ${t('rate_limits')} WHERE reset_at < now() - interval '1 hour'`).catch(() => {})
  setInterval(clean, 30 * 60 * 1000).unref()
}
