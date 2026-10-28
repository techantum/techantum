ALTER TABLE public.revealeo_site_branding
  ALTER COLUMN company_name SET DEFAULT 'Hookooh',
  ALTER COLUMN copyright_text SET DEFAULT 'Hookooh. All rights reserved.';

UPDATE public.revealeo_site_branding
SET
  company_name = 'Hookooh',
  copyright_text = replace(copyright_text, 'Revealeo', 'Hookooh')
WHERE id = 1
  AND lower(company_name) IN ('revealeo', 'revealeo.');

UPDATE public.revealeo_cms_content
SET content = replace(content::text, 'Revealeo', 'Hookooh')::jsonb
WHERE content::text LIKE '%Revealeo%';

UPDATE public.youtube_ai_training
SET source_name = 'Hookooh YouTube Mastery Playbook v1.0'
WHERE source_name = 'Revealeo YouTube Mastery Playbook v1.0';

UPDATE public.saas_accounts
SET name = 'Hookooh Demo'
WHERE name = 'Revealeo Demo';
