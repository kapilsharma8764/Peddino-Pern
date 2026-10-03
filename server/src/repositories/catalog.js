import { query, t } from '../db.js'

/**
 * Product-managed content: marketing sections, pricing plans, website types,
 * starter designs and business presets. Reads only return active rows.
 * `upsert*` is what the seed script uses, keyed by slug (or page + section),
 * so running it twice changes nothing.
 */

// ── Marketing content ──────────────────────────────────────────────────────

const contentOut = (row) => ({
  pageKey: row.page_key,
  sectionKey: row.section_key,
  title: row.title,
  subtitle: row.subtitle,
  content: row.content_json,
  sortOrder: row.sort_order,
})

export async function contentForPage(pageKey) {
  const { rows } = await query(
    `SELECT * FROM ${t('site_content')} WHERE page_key = $1 AND is_active ORDER BY sort_order, id`,
    [pageKey],
  )
  return rows.map(contentOut)
}

export async function upsertContent({ pageKey, sectionKey, title = '', subtitle = '', content = {}, sortOrder = 0 }) {
  await query(
    `INSERT INTO ${t('site_content')} (page_key, section_key, title, subtitle, content_json, sort_order)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     ON CONFLICT (page_key, section_key) DO UPDATE
        SET title = EXCLUDED.title, subtitle = EXCLUDED.subtitle, content_json = EXCLUDED.content_json,
            sort_order = EXCLUDED.sort_order, updated_at = now()`,
    [pageKey, sectionKey, title, subtitle, JSON.stringify(content), sortOrder],
  )
}

// ── Pricing ────────────────────────────────────────────────────────────────

const planOut = (row) => ({
  slug: row.slug,
  name: row.name,
  price: row.price === null ? null : Number(row.price),
  currency: row.currency,
  priceLabel: row.price_label,
  billingPeriod: row.billing_period,
  description: row.description,
  note: row.note,
  features: row.features,
  ctaLabel: row.cta_label,
  ctaTo: row.cta_to,
  featured: row.featured,
  comingSoon: row.coming_soon,
  sortOrder: row.sort_order,
})

export async function listPlans() {
  const { rows } = await query(`SELECT * FROM ${t('pricing_plans')} WHERE is_active ORDER BY sort_order, id`)
  return rows.map(planOut)
}

export async function getPlan(slug) {
  const { rows } = await query(`SELECT * FROM ${t('pricing_plans')} WHERE slug = $1 AND is_active`, [slug])
  return rows[0] ? planOut(rows[0]) : null
}

export async function upsertPlan(plan) {
  await query(
    `INSERT INTO ${t('pricing_plans')}
        (slug, name, price, currency, price_label, billing_period, description, note, features, cta_label, cta_to, featured, coming_soon, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14)
     ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, price = EXCLUDED.price, currency = EXCLUDED.currency, price_label = EXCLUDED.price_label,
        billing_period = EXCLUDED.billing_period, description = EXCLUDED.description, note = EXCLUDED.note,
        features = EXCLUDED.features, cta_label = EXCLUDED.cta_label, cta_to = EXCLUDED.cta_to, featured = EXCLUDED.featured,
        coming_soon = EXCLUDED.coming_soon, sort_order = EXCLUDED.sort_order, updated_at = now()`,
    [
      plan.slug, plan.name, plan.price ?? null, plan.currency ?? 'INR', plan.priceLabel ?? '', plan.billingPeriod ?? null,
      plan.description ?? '', plan.note ?? '', JSON.stringify(plan.features ?? []), plan.ctaLabel ?? '', plan.ctaTo ?? '/start',
      Boolean(plan.featured), Boolean(plan.comingSoon), plan.sortOrder ?? 0,
    ],
  )
}

// ── Website types ──────────────────────────────────────────────────────────

const typeOut = (row) => ({
  slug: row.slug,
  name: row.name,
  description: row.description,
  icon: row.icon,
  category: row.category,
  websiteType: row.website_type,
  keywords: row.keywords,
  pages: row.pages,
  designs: row.designs,
  sortOrder: row.sort_order,
})

export async function listWebsiteTypes() {
  const { rows } = await query(`SELECT * FROM ${t('website_types')} WHERE is_active ORDER BY sort_order, id`)
  return rows.map(typeOut)
}

export async function getWebsiteType(slug) {
  const { rows } = await query(`SELECT * FROM ${t('website_types')} WHERE slug = $1 AND is_active`, [slug])
  return rows[0] ? typeOut(rows[0]) : null
}

export async function upsertWebsiteType(type) {
  await query(
    `INSERT INTO ${t('website_types')} (slug, name, description, icon, category, website_type, keywords, pages, designs, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10)
     ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, category = EXCLUDED.category,
        website_type = EXCLUDED.website_type, keywords = EXCLUDED.keywords, pages = EXCLUDED.pages,
        designs = EXCLUDED.designs, sort_order = EXCLUDED.sort_order, updated_at = now()`,
    [
      type.slug, type.name, type.description ?? '', type.icon ?? 'LayoutGrid', type.category ?? 'other', type.websiteType ?? null,
      JSON.stringify(type.keywords ?? []), JSON.stringify(type.pages ?? []), JSON.stringify(type.designs ?? []), type.sortOrder ?? 0,
    ],
  )
}

// ── Starter designs ────────────────────────────────────────────────────────

const designOut = (row) => ({
  slug: row.slug,
  name: row.name,
  description: row.description,
  category: row.category,
  thumbnail: row.thumbnail,
  config: row.config,
  sortOrder: row.sort_order,
})

export async function listStarterDesigns() {
  const { rows } = await query(`SELECT * FROM ${t('starter_designs')} WHERE is_active ORDER BY sort_order, id`)
  return rows.map(designOut)
}

/** The designs a website type lists, in the order it lists them. Null when the type does not exist. */
export async function starterDesignsForType(typeSlug) {
  const type = await getWebsiteType(typeSlug)
  if (!type) return null
  const all = await listStarterDesigns()
  const bySlug = new Map(all.map((design) => [design.slug, design]))
  return type.designs.map((slug) => bySlug.get(slug)).filter(Boolean)
}

export async function upsertStarterDesign(design) {
  await query(
    `INSERT INTO ${t('starter_designs')} (slug, name, description, category, thumbnail, config, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
        thumbnail = EXCLUDED.thumbnail, config = EXCLUDED.config, sort_order = EXCLUDED.sort_order, updated_at = now()`,
    [design.slug, design.name, design.description ?? '', design.category ?? 'general', design.thumbnail ?? null, JSON.stringify(design.config ?? {}), design.sortOrder ?? 0],
  )
}

// ── Business presets ───────────────────────────────────────────────────────

const presetOut = (row) => ({
  slug: row.slug,
  name: row.name,
  description: row.description,
  businessType: row.business_type,
  examplePrompt: row.example_prompt,
  websiteTypeSlug: row.website_type_slug,
  keywords: row.keywords,
  recommendedPages: row.recommended_pages,
  recommendedFeatures: row.recommended_features,
  recommendedSections: row.recommended_sections,
  suggestedTemplateCategory: row.suggested_template_category,
  themeDirection: row.theme_direction,
  preview: row.preview,
  isChip: row.is_chip,
  sortOrder: row.sort_order,
})

export async function listPresets() {
  const { rows } = await query(`SELECT * FROM ${t('business_presets')} WHERE is_active ORDER BY sort_order, id`)
  return rows.map(presetOut)
}

export async function getPreset(slug) {
  const { rows } = await query(`SELECT * FROM ${t('business_presets')} WHERE slug = $1 AND is_active`, [slug])
  return rows[0] ? presetOut(rows[0]) : null
}

export async function upsertPreset(preset) {
  await query(
    `INSERT INTO ${t('business_presets')}
        (slug, name, description, business_type, example_prompt, website_type_slug, keywords, recommended_pages, recommended_features,
         recommended_sections, suggested_template_category, theme_direction, preview, is_chip, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12::jsonb, $13::jsonb, $14, $15)
     ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, business_type = EXCLUDED.business_type,
        example_prompt = EXCLUDED.example_prompt, website_type_slug = EXCLUDED.website_type_slug, keywords = EXCLUDED.keywords,
        recommended_pages = EXCLUDED.recommended_pages, recommended_features = EXCLUDED.recommended_features,
        recommended_sections = EXCLUDED.recommended_sections, suggested_template_category = EXCLUDED.suggested_template_category,
        theme_direction = EXCLUDED.theme_direction, preview = EXCLUDED.preview, is_chip = EXCLUDED.is_chip,
        sort_order = EXCLUDED.sort_order, updated_at = now()`,
    [
      preset.slug, preset.name, preset.description ?? '', preset.businessType, preset.examplePrompt ?? '', preset.websiteTypeSlug ?? 'business',
      JSON.stringify(preset.keywords ?? []), JSON.stringify(preset.recommendedPages ?? []), JSON.stringify(preset.recommendedFeatures ?? []),
      JSON.stringify(preset.recommendedSections ?? []), preset.suggestedTemplateCategory ?? '', JSON.stringify(preset.themeDirection ?? {}),
      JSON.stringify(preset.preview ?? {}), preset.isChip !== false, preset.sortOrder ?? 0,
    ],
  )
}
