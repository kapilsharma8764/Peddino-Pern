/**
 * Counts visits to published sites without a database write per visit.
 * Hits are added up in memory and written in one batch every `intervalMs`; a failed write keeps its
 * numbers for the next try, so a database hiccup loses nothing.
 */
export function createViewCounter(write, { intervalMs = 30_000, setTimer = setInterval } = {}) {
  const pending = new Map()
  let flushing = null

  const flush = async () => {
    if (flushing) return flushing
    const batch = [...pending]
    pending.clear()
    flushing = Promise.all(
      batch.map(async ([id, count]) => {
        try { await write(id, count) } catch { pending.set(id, (pending.get(id) ?? 0) + count) }
      }),
    ).finally(() => { flushing = null })
    return flushing
  }

  const timer = setTimer(() => { void flush() }, intervalMs)
  timer.unref?.()

  return {
    hit(id) { if (id) pending.set(id, (pending.get(id) ?? 0) + 1) },
    flush,
    stop() { clearInterval(timer) },
  }
}
