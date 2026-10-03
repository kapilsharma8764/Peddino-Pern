import { query, t } from '../db.js'

/**
 * A signed-in user's own brief, setup progress and preferences. Every function
 * takes the user id the server read from the session; none of them accepts one
 * from a request, so one account cannot reach another's rows.
 */

const briefOut = (row) => ({
  description: row.description,
  businessType: row.business_type,
  selectedPreset: row.selected_preset,
  recommendedPages: row.recommended_pages,
  recommendedFeatures: row.recommended_features,
  suggestedTemplateCategory: row.suggested_template_category,
  themeDirection: row.theme_direction,
  direction: row.direction,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export async function getBrief(userId) {
  const { rows } = await query(`SELECT * FROM ${t('user_business_briefs')} WHERE user_id = $1`, [userId])
  return rows[0] ? briefOut(rows[0]) : null
}

/** Creates the user's brief or replaces it. `created` tells the route whether to answer 201 or 200. */
export async function saveBrief(userId, brief) {
  const { rows } = await query(
    `INSERT INTO ${t('user_business_briefs')} AS b
        (user_id, description, business_type, selected_preset, recommended_pages, recommended_features,
         suggested_template_category, theme_direction, direction)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET
        description = EXCLUDED.description, business_type = EXCLUDED.business_type, selected_preset = EXCLUDED.selected_preset,
        recommended_pages = EXCLUDED.recommended_pages, recommended_features = EXCLUDED.recommended_features,
        suggested_template_category = EXCLUDED.suggested_template_category, theme_direction = EXCLUDED.theme_direction,
        direction = EXCLUDED.direction, updated_at = now()
     RETURNING *, (xmax = 0) AS created`,
    [
      userId, brief.description, brief.businessType, brief.selectedPreset, JSON.stringify(brief.recommendedPages),
      JSON.stringify(brief.recommendedFeatures), brief.suggestedTemplateCategory,
      brief.themeDirection === null ? null : JSON.stringify(brief.themeDirection),
      brief.direction === null ? null : JSON.stringify(brief.direction),
    ],
  )
  return { brief: briefOut(rows[0]), created: rows[0].created }
}

const onboardingOut = (row) => ({
  currentStep: row.current_step,
  completedSteps: row.completed_steps,
  onboardingData: row.onboarding_data,
  updatedAt: row.updated_at,
})

export async function getOnboarding(userId) {
  const { rows } = await query(`SELECT * FROM ${t('user_onboarding')} WHERE user_id = $1`, [userId])
  return rows[0] ? onboardingOut(rows[0]) : null
}

export async function saveOnboarding(userId, progress) {
  const { rows } = await query(
    `INSERT INTO ${t('user_onboarding')} (user_id, current_step, completed_steps, onboarding_data)
          VALUES ($1, $2, $3::jsonb, $4::jsonb)
     ON CONFLICT (user_id) DO UPDATE SET
        current_step = EXCLUDED.current_step, completed_steps = EXCLUDED.completed_steps,
        onboarding_data = EXCLUDED.onboarding_data, updated_at = now()
     RETURNING *`,
    [userId, progress.currentStep, JSON.stringify(progress.completedSteps), JSON.stringify(progress.onboardingData)],
  )
  return onboardingOut(rows[0])
}

export async function listPreferences(userId) {
  const { rows } = await query(`SELECT preference_key, preference_value FROM ${t('user_preferences')} WHERE user_id = $1 ORDER BY preference_key`, [userId])
  return Object.fromEntries(rows.map((row) => [row.preference_key, row.preference_value]))
}

export async function savePreference(userId, key, value) {
  await query(
    `INSERT INTO ${t('user_preferences')} (user_id, preference_key, preference_value) VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (user_id, preference_key) DO UPDATE SET preference_value = EXCLUDED.preference_value, updated_at = now()`,
    [userId, key, JSON.stringify(value)],
  )
}

export async function deletePreference(userId, key) {
  const result = await query(`DELETE FROM ${t('user_preferences')} WHERE user_id = $1 AND preference_key = $2`, [userId, key])
  return result.rowCount > 0
}
