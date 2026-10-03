CREATE TABLE IF NOT EXISTS __SCHEMA__.template_blobs (
  hash text PRIMARY KEY,
  data bytea NOT NULL
);

ALTER TABLE __SCHEMA__.template_assets ADD COLUMN IF NOT EXISTS blob_hash text
  REFERENCES __SCHEMA__.template_blobs(hash);
ALTER TABLE __SCHEMA__.template_assets ALTER COLUMN data DROP NOT NULL;
ALTER TABLE __SCHEMA__.template_assets ADD CONSTRAINT template_asset_has_data
  CHECK (data IS NOT NULL OR blob_hash IS NOT NULL);
