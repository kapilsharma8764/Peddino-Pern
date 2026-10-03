/** Readiness includes the database used by accounts and saved sites. */
export function registerHealthRoute(app, checkDatabase) {
  app.get('/api/health', async (_req, res) => {
    try {
      await checkDatabase()
      res.json({ ok: true, database: 'ready' })
    } catch {
      res.status(503).json({ ok: false, database: 'unavailable' })
    }
  })
}
