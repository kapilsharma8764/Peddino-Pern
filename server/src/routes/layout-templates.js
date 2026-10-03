import { defaultTemplate, getTemplate, listTemplates, templateOutline } from '../repositories/layout-templates.js'
import { isSlug, readPaging, text } from '../validation.js'

/**
 * The widget-based layout templates.
 *
 *   GET /api/layout-templates?category=&search=&tag=&page=&limit=   light rows, paged
 *   GET /api/layout-templates/default?category=                     the starting template for a category
 *   GET /api/layout-templates/outline                               names and page names only (for "Page layout")
 *   GET /api/layout-templates/:slug                                 one, with its full section tree
 *
 * (`/api/templates` is the separate catalog of original HTML templates.)
 */
export function registerLayoutTemplateRoutes(app, { asyncRoute }) {
  const cached = (res) => res.set('Cache-Control', 'public, max-age=60, s-maxage=300')

  app.get('/api/layout-templates', asyncRoute(async (req, res) => {
    const { page, limit, offset } = readPaging(req.query)
    const category = req.query.category === undefined ? null : text(req.query.category, 40)
    const search = req.query.search === undefined ? null : text(req.query.search, 80)
    const tag = req.query.tag === undefined ? null : text(req.query.tag, 40)
    if (category === '' || (req.query.category !== undefined && !isSlug(category))) return res.status(400).json({ error: 'That category is not valid' })
    const { items, total } = await listTemplates({ category, search: search || null, tag: tag || null, limit, offset })
    cached(res).json({ items, page, pageSize: limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) })
  }))

  app.get('/api/layout-templates/default', asyncRoute(async (req, res) => {
    const category = req.query.category === undefined ? null : text(req.query.category, 40)
    if (category !== null && !isSlug(category)) return res.status(400).json({ error: 'That category is not valid' })
    // A category with no template of its own still gets one: a site is never built from nothing.
    const found = (category && (await defaultTemplate(category))) || (await defaultTemplate(null))
    if (!found) return res.status(404).json({ error: 'There are no templates yet' })
    cached(res).json(found)
  }))

  app.get('/api/layout-templates/outline', asyncRoute(async (_req, res) => {
    cached(res).json({ items: await templateOutline() })
  }))

  app.get('/api/layout-templates/:slug', asyncRoute(async (req, res) => {
    if (!isSlug(req.params.slug)) return res.status(400).json({ error: 'That template name is not valid' })
    const found = await getTemplate(req.params.slug)
    if (!found) return res.status(404).json({ error: 'No such template' })
    cached(res).json(found)
  }))
}
