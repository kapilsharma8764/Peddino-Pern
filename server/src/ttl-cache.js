/**
 * Remembers the answer of an async loader for `ttlMs`, so a busy page does not ask the database every time.
 * Requests that arrive while the loader is running share that one call, and a failed load is never remembered.
 */
export function cachedFor(ttlMs, load, now = Date.now) {
  let value
  let expires = 0
  let pending = null
  const get = async () => {
    if (now() < expires) return value
    pending ??= load().then(
      (result) => { value = result; expires = now() + ttlMs; pending = null; return result },
      (error) => { pending = null; throw error },
    )
    return pending
  }
  get.clear = () => { expires = 0 }
  return get
}
