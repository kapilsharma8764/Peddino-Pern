import { query, t } from '../db.js'
import { likePattern } from '../validation.js'

/**
 * The widget-based layout templates. The list reads only the light columns (plus
 * the small preview the gallery card draws); the full tree in `template_data` is
 * read by `getTemplate`, when one is opened or used.
 */

const LIGHT = 'slug, name, category, description, thumbnail, preview_image, tags, source, page_count, image_status, preview_data'

const listOut = (row) => ({
  slug: row.slug,
  name: row.name,
  category: row.category,
  description: row.description,
  thumbnail: row.thumbnail,
  previewImage: row.preview_image,
  tags: row.tags,
  source: row.source,
  pageCount: row.page_count,
  imageStatus: row.image_status,
  preview: row.preview_data,
})

/** Active templates, filtered and paged. `search` matches name, description, slug and tags. */
export async function listTemplates({ category, search, tag, limit, offset }) {
  const where = ['is_active']
  const values = []
  if (category) { values.push(category); where.push(`category = $${values.length}`) }
  if (tag) { values.push(JSON.stringify([tag])); where.push(`tags @> $${values.length}::jsonb`) }
  if (search) {
    values.push(likePattern(search))
    const n = values.length
    where.push(`(name ILIKE $${n} OR description ILIKE $${n} OR slug ILIKE $${n} OR tags::text ILIKE $${n})`)
  }
  const clause = where.join(' AND ')
  const total = (await query(`SELECT count(*)::int AS n FROM ${t('templates')} WHERE ${clause}`, values)).rows[0].n
  values.push(limit, offset)
  const { rows } = await query(
    `SELECT ${LIGHT} FROM ${t('templates')} WHERE ${clause} ORDER BY sort_order, id LIMIT $${values.length - 1} OFFSET $${values.length}`,
    values,
  )
  return { items: rows.map(listOut), total }
}

export async function getTemplate(slug) {
  const { rows } = await query(`SELECT ${LIGHT}, template_data FROM ${t('templates')} WHERE slug = $1 AND is_active`, [slug])
  return rows[0] ? { ...listOut(rows[0]), template: rows[0].template_data } : null
}

/** The first active template in a category (any category when null): the starting point when nobody chose one. */
export async function defaultTemplate(category) {
  const { rows } = await query(
    `SELECT slug FROM ${t('templates')} WHERE is_active ${category ? 'AND category = $1' : ''} ORDER BY sort_order, id LIMIT 1`,
    category ? [category] : [],
  )
  return rows[0] ? getTemplate(rows[0].slug) : null
}

/**
 * Every active template's name and the names of its pages, without the sections.
 * The editor's "Page layout" panel matches a page name against this, then reads one
 * template in full only when a layout is picked.
 */
export async function templateOutline() {
  const { rows } = await query(
    `SELECT slug, name, jsonb_array_length(template_data->'home') AS home_sections,
            (SELECT COALESCE(jsonb_agg(jsonb_build_object('name', p->>'name', 'path', p->>'path')), '[]'::jsonb)
               FROM jsonb_array_elements(template_data->'pages') AS p) AS pages
       FROM ${t('templates')} WHERE is_active ORDER BY sort_order, id`,
  )
  return rows.map((row) => ({ slug: row.slug, name: row.name, homeSections: row.home_sections, pages: row.pages }))
}

export async function upsertTemplate(row) {
  await query(
    `INSERT INTO ${t('templates')}
        (slug, name, category, description, thumbnail, preview_image, template_data, preview_data, tags, source, page_count, image_status, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11, $12, $13)
     ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, category = EXCLUDED.category, description = EXCLUDED.description, thumbnail = EXCLUDED.thumbnail,
        preview_image = EXCLUDED.preview_image, template_data = EXCLUDED.template_data, preview_data = EXCLUDED.preview_data,
        tags = EXCLUDED.tags, source = EXCLUDED.source, page_count = EXCLUDED.page_count, image_status = EXCLUDED.image_status,
        sort_order = EXCLUDED.sort_order, updated_at = now()`,
    [
      row.slug, row.name, row.category, row.description ?? '', row.thumbnail ?? null, row.previewImage ?? null,
      JSON.stringify(row.templateData), JSON.stringify(row.previewData ?? {}), JSON.stringify(row.tags ?? []),
      row.source ?? '', row.pageCount ?? 1, row.imageStatus ?? 'ok', row.sortOrder ?? 0,
    ],
  )
}
