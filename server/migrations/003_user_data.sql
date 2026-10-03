-- Per-user data that used to live only in one browser. Rows are always keyed by
-- the signed-in user's id taken from the session on the server, never from the
-- request body.

CREATE TABLE IF NOT EXISTS __SCHEMA__.user_business_briefs (
  id                          bigserial PRIMARY KEY,
  user_id                     text NOT NULL UNIQUE REFERENCES __SCHEMA__.users (id) ON DELETE CASCADE,
  description                 text NOT NULL DEFAULT '',
  business_type               text,
  selected_preset             text,
  recommended_pages           jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_template_category text,
  theme_direction             jsonb,
  direction                   jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.user_onboarding (
  id               bigserial PRIMARY KEY,
  user_id          text NOT NULL UNIQUE REFERENCES __SCHEMA__.users (id) ON DELETE CASCADE,
  current_step     text,
  completed_steps  jsonb NOT NULL DEFAULT '[]'::jsonb,
  onboarding_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS __SCHEMA__.user_preferences (
  id                bigserial PRIMARY KEY,
  user_id           text NOT NULL REFERENCES __SCHEMA__.users (id) ON DELETE CASCADE,
  preference_key    text NOT NULL,
  preference_value  jsonb NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_user_key UNIQUE (user_id, preference_key)
);
