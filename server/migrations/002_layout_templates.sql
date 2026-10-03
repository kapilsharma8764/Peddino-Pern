-- The widget-based layout templates that used to be bundled in the client as
-- code (client/src/templates/library/imported/*.ts). The gallery lists the
-- light columns; template_data is read only when one is opened or used.
-- Original HTML templates stay in template_catalog / template_assets.

CREATE TABLE IF NOT EXISTS __SCHEMA__.templates (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  category        text NOT NULL DEFAULT 'other',
  description     text NOT NULL DEFAULT '',
  thumbnail       text,
  preview_image   text,
  template_data   jsonb NOT NULL,
  preview_data    jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags            jsonb NOT NULL DEFAULT '[]'::jsonb,
  source          text NOT NULL DEFAULT '',
  page_count      integer NOT NULL DEFAULT 1,
  image_status    text NOT NULL DEFAULT 'ok',
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS templates_category_idx ON __SCHEMA__.templates (category, is_active);
CREATE INDEX IF NOT EXISTS templates_active_order_idx ON __SCHEMA__.templates (is_active, sort_order);
