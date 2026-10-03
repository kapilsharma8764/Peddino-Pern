import { deletePreference, getBrief, getOnboarding, listPreferences, saveBrief, saveOnboarding, savePreference } from '../repositories/user-data.js'
import { readBrief, readOnboarding, readPreference } from '../validation.js'

/**
 * The signed-in user's own data. Every handler works on `req.user.id`, which
 * `requireUser` read from the session; nothing here accepts a user id from the
 * request, so there is no way to ask for somebody else's rows.
 *
 *   GET  /api/me/business-brief          { brief } (null when none yet)
 *   POST /api/me/business-brief          create (201) or replace (200)
 *   PUT  /api/me/business-brief          replace
 *   GET  /api/me/onboarding              { onboarding } (null when none yet)
 *   PUT  /api/me/onboarding              save progress
 *   GET  /api/me/preferences             { preferences: { key: value } }
 *   PUT  /api/me/preferences/:key        { value }
 *   DELETE /api/me/preferences/:key
 *
 * Personal AI keys are deliberately not stored: the preference and onboarding
 * writers refuse anything that looks like a key, token or password.
 */
export function registerMeRoutes(app, { requireUser }) {
  app.get('/api/me/business-brief', requireUser(async (req, res) => {
    res.set('Cache-Control', 'no-store').json({ brief: await getBrief(req.user.id) })
  }))

  const writeBrief = (okStatus) => requireUser(async (req, res) => {
    const read = readBrief(req.body)
    if (read.error) return res.status(400).json({ error: read.error })
    const { brief, created } = await saveBrief(req.user.id, read.value)
    res.status(okStatus === 201 && created ? 201 : 200).json({ brief })
  })
  app.post('/api/me/business-brief', writeBrief(201))
  app.put('/api/me/business-brief', writeBrief(200))

  app.get('/api/me/onboarding', requireUser(async (req, res) => {
    res.set('Cache-Control', 'no-store').json({ onboarding: await getOnboarding(req.user.id) })
  }))

  app.put('/api/me/onboarding', requireUser(async (req, res) => {
    const read = readOnboarding(req.body)
    if (read.error) return res.status(400).json({ error: read.error })
    res.json({ onboarding: await saveOnboarding(req.user.id, read.value) })
  }))

  app.get('/api/me/preferences', requireUser(async (req, res) => {
    res.set('Cache-Control', 'no-store').json({ preferences: await listPreferences(req.user.id) })
  }))

  app.put('/api/me/preferences/:key', requireUser(async (req, res) => {
    const read = readPreference(req.params.key, req.body)
    if (read.error) return res.status(400).json({ error: read.error })
    await savePreference(req.user.id, req.params.key, read.value)
    res.json({ key: req.params.key, value: read.value })
  }))

  app.delete('/api/me/preferences/:key', requireUser(async (req, res) => {
    const read = readPreference(req.params.key, { value: null })
    if (read.error) return res.status(400).json({ error: read.error })
    if (!(await deletePreference(req.user.id, req.params.key))) return res.status(404).json({ error: 'No such preference' })
    res.status(204).end()
  }))
}
