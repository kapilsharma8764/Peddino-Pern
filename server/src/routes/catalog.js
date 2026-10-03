import { contentForPage, getPlan, getPreset, listPlans, listPresets, listStarterDesigns, listWebsiteTypes, starterDesignsForType } from '../repositories/catalog.js'
import { isSlug } from '../validation.js'

/**
 * Public, read-only endpoints for content the product manages: marketing copy,
 * pricing, website types, starter designs and business presets. They change
 * rarely, so the answers are cacheable for a minute in the browser and five at
 * the edge.
 */
export function registerCatalogRoutes(app, { asyncRoute }) {
  const cached = (res) => res.set('Cache-Control', 'public, max-age=60, s-maxage=300')
  const badSlug = (res) => res.status(400).json({ error: 'That name is not valid' })

  app.get('/api/content/:page', asyncRoute(async (req, res) => {
    if (!isSlug(req.params.page)) return badSlug(res)
    const sections = await contentForPage(req.params.page)
    if (sections.length === 0) return res.status(404).json({ error: 'No content for that page' })
    cached(res).json({ page: req.params.page, sections })
  }))

  app.get('/api/pricing', asyncRoute(async (_req, res) => {
    cached(res).json({ plans: await listPlans() })
  }))

  app.get('/api/pricing/:slug', asyncRoute(async (req, res) => {
    if (!isSlug(req.params.slug)) return badSlug(res)
    const plan = await getPlan(req.params.slug)
    if (!plan) return res.status(404).json({ error: 'No such plan' })
    cached(res).json(plan)
  }))

  app.get('/api/website-types', asyncRoute(async (_req, res) => {
    cached(res).json({ items: await listWebsiteTypes() })
  }))

  app.get('/api/starter-designs', asyncRoute(async (req, res) => {
    const type = req.query.type
    if (type === undefined) return cached(res).json({ items: await listStarterDesigns() })
    if (!isSlug(type)) return badSlug(res)
    const items = await starterDesignsForType(type)
    if (!items) return res.status(404).json({ error: 'No such website type' })
    cached(res).json({ items })
  }))

  app.get('/api/business-presets', asyncRoute(async (_req, res) => {
    cached(res).json({ items: await listPresets() })
  }))

  app.get('/api/business-presets/:slug', asyncRoute(async (req, res) => {
    if (!isSlug(req.params.slug)) return badSlug(res)
    const preset = await getPreset(req.params.slug)
    if (!preset) return res.status(404).json({ error: 'No such preset' })
    cached(res).json(preset)
  }))
}
