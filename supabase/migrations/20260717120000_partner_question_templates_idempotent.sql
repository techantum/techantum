-- Fix duplicate slug errors when both division and engagement templates exist.
-- Safe to re-run: uses INSERT … ON CONFLICT only (no slug renames).

INSERT INTO public.partner_question_templates (slug, name, service_type, description)
VALUES
  ('website-discovery', 'Website Requirement Discovery', 'website', 'Questionnaire for website package projects'),
  ('web-app-discovery', 'Web Application Discovery', 'web-application', 'Questionnaire for web application package projects'),
  ('mobile-discovery', 'Mobile Application Discovery', 'mobile-application', 'Questionnaire for mobile application package projects'),
  ('landing-page-discovery', 'Marketing Landing Pages', 'landing-page', 'Questionnaire for marketing landing page requirements'),
  ('website-revamp-discovery', 'Website Revamp', 'website-revamp', 'Questionnaire for website revamp requirements'),
  ('app-changes-discovery', 'Application Changes', 'app-changes', 'Questionnaire for existing application change requirements')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  service_type = EXCLUDED.service_type,
  description = EXCLUDED.description;

ALTER TABLE public.partner_requirements
  ADD COLUMN IF NOT EXISTS division_slug TEXT,
  ADD COLUMN IF NOT EXISTS plan_slug TEXT,
  ADD COLUMN IF NOT EXISTS engagement_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_requirements_engagement_type_check'
  ) THEN
    ALTER TABLE public.partner_requirements
      ADD CONSTRAINT partner_requirements_engagement_type_check
      CHECK (engagement_type IS NULL OR engagement_type IN ('landing-page', 'website-revamp', 'app-changes'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_requirements_division ON public.partner_requirements(division_slug);
