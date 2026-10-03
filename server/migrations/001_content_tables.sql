-- Product-managed content: marketing copy, pricing, website types, business
-- presets and starter designs. __SCHEMA__ is replaced with the schema the
-- server runs in (tests use a throwaway one).

CREATE TABLE IF NOT EXISTS __SCHEMA__.site_content (
  id            bigserial PRIMARY KEY,
  page_key      text NOT NULL,
  section_key   text NOT NULL,
  title         text NOT NULL DEFAULT '',
  subtitle      text NOT NULL DEFAULT '',
  content_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_content_page_section_key UNIQUE (page_key, section_key)
);
CREATE INDEX IF NOT EXISTS site_content_page_idx ON __SCHEMA__.site_content (page_key, is_active, sort_order);

CREATE TABLE IF NOT EXISTS __SCHEMA__.pricing_plans (
  id              bigserial PRIMARY KEY,
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  price           numeric(10,2),
  currency        text NOT NULL DEFAULT 'INR',
  price_label     text NOT NULL DEFAULT '',
  billing_period  text,
  description     text NOT NULL DEFAULT '',
  note            text NOT NULL DEFAULT '',
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  cta_label       text NOT NULL DEFAULT '',
  cta_to          text NOT NULL DEFAULT '/start',
  featured        boolean NOT NULL DEFAULT false,
  coming_soon     boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pricing_plans_active_idx ON __SCHEMA__.pricing_plans (is_active, sort_order);

CREATE TABLE IF NOT EXISTS __SCHEMA__.website_types (
  id            bigserial PRIMARY KEY,
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text NOT NULL DEFAULT '',
  icon          text NOT NULL DEFAULT 'LayoutGrid',
  category      text NOT NULL DEFAULT 'other',
  website_type  text,
  keywords      jsonb NOT NULL DEFAULT '[]'::jsonb,
  pages         jsonb NOT NULL DEFAULT '[]'::jsonb,
  designs       jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS website_types_active_idx ON __SCHEMA__.website_types (is_active, sort_order);

CREATE TABLE IF NOT EXISTS __SCHEMA__.business_presets (
  id                          bigserial PRIMARY KEY,
  name                        text NOT NULL,
  slug                        text NOT NULL UNIQUE,
  description                 text NOT NULL DEFAULT '',
  business_type               text NOT NULL,
  example_prompt              text NOT NULL DEFAULT '',
  website_type_slug           text NOT NULL DEFAULT 'business',
  keywords                    jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_pages           jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_sections        jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_template_category text NOT NULL DEFAULT '',
  theme_direction             jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview                     jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_chip                     boolean NOT NULL DEFAULT true,
  is_active                   boolean NOT NULL DEFAULT true,
  sort_order                  integer NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS business_presets_active_idx ON __SCHEMA__.business_presets (is_active, sort_order);

CREATE TABLE IF NOT EXISTS __SCHEMA__.starter_designs (
  id            bigserial PRIMARY KEY,
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text NOT NULL DEFAULT '',
  category      text NOT NULL DEFAULT 'general',
  thumbnail     text,
  config        jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS starter_designs_active_idx ON __SCHEMA__.starter_designs (is_active, sort_order);
