ALTER TABLE website_audits ADD COLUMN IF NOT EXISTS slug TEXT;

WITH ranked AS (
  SELECT
    id,
    CASE
      WHEN base = '' THEN 'audit'
      ELSE left(base, 80)
    END AS base,
    row_number() OVER (
      PARTITION BY CASE WHEN base = '' THEN 'audit' ELSE left(base, 80) END
      ORDER BY created_at DESC
    ) AS n
  FROM (
    SELECT
      id,
      created_at,
      trim(both '-' from regexp_replace(lower(audit_name), '[^a-z0-9]+', '-', 'g')) AS base
    FROM website_audits
  ) named
)
UPDATE website_audits AS audit
SET slug = CASE WHEN ranked.n = 1 THEN ranked.base ELSE ranked.base || '-' || ranked.n END
FROM ranked
WHERE audit.id = ranked.id
  AND (audit.slug IS NULL OR audit.slug = '');

CREATE UNIQUE INDEX IF NOT EXISTS website_audits_slug_idx ON website_audits (slug) WHERE slug IS NOT NULL;
