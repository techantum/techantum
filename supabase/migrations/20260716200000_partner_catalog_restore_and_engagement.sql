-- Restore package divisions (Website / Web App / Mobile) aligned with public website
-- Add engagement_type for optional requirement flows (Landing Page / Revamp / App Changes)

UPDATE public.partner_service_categories
SET
  slug = 'website-development',
  name = 'Website Development',
  description = 'Professional websites that convert visitors into customers. Launch → Growth → Enterprise.',
  display_order = 1
WHERE slug IN ('website', 'landing-page');

UPDATE public.partner_service_categories
SET
  slug = 'web-application-development',
  name = 'Web Application Development',
  description = 'Custom web apps for automation, dashboards, and scale. Accelerate → Scale → Transform.',
  display_order = 2
WHERE slug IN ('web-application', 'website-revamp');

UPDATE public.partner_service_categories
SET
  slug = 'mobile-application-development',
  name = 'Mobile Application Development',
  description = 'Native and cross-platform mobile apps. Launch Mobile → Growth Mobile → Enterprise Mobile.',
  display_order = 3
WHERE slug IN ('mobile-application', 'app-changes');

UPDATE public.partner_packages p
SET
  name = CASE p.slug
    WHEN 'launch' THEN 'Launch'
    WHEN 'growth' THEN 'Growth'
    WHEN 'enterprise' THEN 'Enterprise'
    ELSE p.name
  END,
  tagline = CASE p.slug
    WHEN 'launch' THEN 'Establish your online presence'
    WHEN 'growth' THEN 'Generate leads and grow online'
    WHEN 'enterprise' THEN 'Scalable digital platforms'
    ELSE p.tagline
  END,
  best_for = CASE p.slug
    WHEN 'launch' THEN 'Startups'
    WHEN 'growth' THEN 'SMEs'
    WHEN 'enterprise' THEN 'Large Enterprises'
    ELSE p.best_for
  END
FROM public.partner_service_categories c
WHERE p.category_id = c.id AND c.slug = 'website-development'
  AND p.slug IN ('launch', 'growth', 'enterprise');

UPDATE public.partner_packages p
SET
  name = CASE p.slug
    WHEN 'accelerate' THEN 'Accelerate'
    WHEN 'scale' THEN 'Scale'
    WHEN 'transform' THEN 'Transform'
    ELSE p.name
  END
FROM public.partner_service_categories c
WHERE p.category_id = c.id AND c.slug = 'web-application-development'
  AND p.slug IN ('accelerate', 'scale', 'transform');

UPDATE public.partner_packages p
SET
  name = CASE p.slug
    WHEN 'launch' THEN 'Launch Mobile'
    WHEN 'growth' THEN 'Growth Mobile'
    WHEN 'enterprise' THEN 'Enterprise Mobile'
    ELSE p.name
  END
FROM public.partner_service_categories c
WHERE p.category_id = c.id AND c.slug = 'mobile-application-development'
  AND p.slug IN ('launch', 'growth', 'enterprise');

-- Division + engagement question templates (idempotent — never rename slugs in bulk)
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
  ADD COLUMN IF NOT EXISTS engagement_type TEXT
    CHECK (engagement_type IS NULL OR engagement_type IN ('landing-page', 'website-revamp', 'app-changes'));

CREATE INDEX IF NOT EXISTS idx_partner_requirements_division ON public.partner_requirements(division_slug);
