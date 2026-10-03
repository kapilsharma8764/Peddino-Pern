-- Rate-limit counters kept in PostgreSQL so a restart (or another serverless
-- instance) does not reset them. One row per limiter and client; the row is
-- reused once its window has passed.

CREATE TABLE IF NOT EXISTS __SCHEMA__.rate_limits (
  key        text PRIMARY KEY,
  hits       integer NOT NULL,
  reset_at   timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON __SCHEMA__.rate_limits (reset_at);
