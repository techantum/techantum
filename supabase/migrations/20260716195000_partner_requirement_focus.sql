-- Refocus partner portal on landing pages, website revamp, and existing application changes

-- Update service categories to focused engagement types
UPDATE public.partner_service_categories
SET
  slug = 'landing-page',
  name = 'Marketing Landing Pages',
  description = 'Campaign-focused landing pages to capture leads and drive conversions.',
  display_order = 1
WHERE slug = 'website';

UPDATE public.partner_service_categories
SET
  slug = 'website-revamp',
  name = 'Website Revamp',
  description = 'Redesign and modernize an existing website — improve UX, performance, and conversions.',
  display_order = 2
WHERE slug = 'web-application';

UPDATE public.partner_service_categories
SET
  slug = 'app-changes',
  name = 'Existing Application Changes',
  description = 'Enhancements, fixes, and new features for an existing web or mobile application.',
  display_order = 3
WHERE slug = 'mobile-application';

-- Update question templates to match new service types
UPDATE public.partner_question_templates
SET
  slug = 'landing-page-discovery',
  name = 'Landing Page Discovery',
  service_type = 'landing-page',
  description = 'Minimal questionnaire for marketing landing page projects'
WHERE slug = 'website-discovery';

UPDATE public.partner_question_templates
SET
  slug = 'website-revamp-discovery',
  name = 'Website Revamp Discovery',
  service_type = 'website-revamp',
  description = 'Minimal questionnaire for website revamp projects'
WHERE slug = 'web-app-discovery';

UPDATE public.partner_question_templates
SET
  slug = 'app-changes-discovery',
  name = 'Application Changes Discovery',
  service_type = 'app-changes',
  description = 'Minimal questionnaire for existing application change projects'
WHERE slug = 'mobile-discovery';

-- Update package names and descriptions for landing pages
UPDATE public.partner_packages p
SET
  name = CASE p.slug
    WHEN 'launch' THEN 'Starter Landing'
    WHEN 'growth' THEN 'Growth Landing'
    WHEN 'enterprise' THEN 'Campaign Suite'
    ELSE p.name
  END,
  tagline = CASE p.slug
    WHEN 'launch' THEN 'Single campaign page'
    WHEN 'growth' THEN 'Multi-page campaign site'
    WHEN 'enterprise' THEN 'Full campaign platform'
    ELSE p.tagline
  END,
  best_for = CASE p.slug
    WHEN 'launch' THEN 'Single campaigns'
    WHEN 'growth' THEN 'Lead generation'
    WHEN 'enterprise' THEN 'Enterprise campaigns'
    ELSE p.best_for
  END,
  description = CASE p.slug
    WHEN 'launch' THEN '1–3 landing pages with forms and basic analytics.'
    WHEN 'growth' THEN 'Up to 8 pages with CRM integration and conversion tracking.'
    WHEN 'enterprise' THEN 'Unlimited pages with advanced integrations and A/B testing support.'
    ELSE p.description
  END
FROM public.partner_service_categories c
WHERE p.category_id = c.id AND c.slug = 'landing-page';

-- Update package names for website revamp
UPDATE public.partner_packages p
SET
  name = CASE p.slug
    WHEN 'accelerate' THEN 'Essential Revamp'
    WHEN 'scale' THEN 'Full Revamp'
    WHEN 'transform' THEN 'Enterprise Revamp'
    ELSE p.name
  END,
  tagline = CASE p.slug
    WHEN 'accelerate' THEN 'Visual refresh'
    WHEN 'scale' THEN 'Complete redesign'
    WHEN 'transform' THEN 'Digital transformation'
    ELSE p.tagline
  END,
  best_for = CASE p.slug
    WHEN 'accelerate' THEN 'Small business sites'
    WHEN 'scale' THEN 'Growing companies'
    WHEN 'transform' THEN 'Large organizations'
    ELSE p.best_for
  END,
  description = CASE p.slug
    WHEN 'accelerate' THEN 'Homepage + 5 key pages redesign with mobile optimization.'
    WHEN 'scale' THEN 'Full site revamp with CMS, SEO, and content migration.'
    WHEN 'transform' THEN 'Enterprise revamp with integrations, multilingual, and advanced CMS.'
    ELSE p.description
  END
FROM public.partner_service_categories c
WHERE p.category_id = c.id AND c.slug = 'website-revamp';

-- Update package names for app changes
UPDATE public.partner_packages p
SET
  name = CASE p.slug
    WHEN 'launch' THEN 'Minor Changes'
    WHEN 'growth' THEN 'Feature Updates'
    WHEN 'enterprise' THEN 'Major Enhancement'
    ELSE p.name
  END,
  tagline = CASE p.slug
    WHEN 'launch' THEN 'Bug fixes & tweaks'
    WHEN 'growth' THEN 'New features & integrations'
    WHEN 'enterprise' THEN 'Platform evolution'
    ELSE p.tagline
  END,
  best_for = CASE p.slug
    WHEN 'launch' THEN 'Quick fixes'
    WHEN 'growth' THEN 'Feature additions'
    WHEN 'enterprise' THEN 'Major overhauls'
    ELSE p.best_for
  END,
  description = CASE p.slug
    WHEN 'launch' THEN 'Bug fixes, UI tweaks, and minor feature adjustments.'
    WHEN 'growth' THEN 'New modules, API integrations, and workflow improvements.'
    WHEN 'enterprise' THEN 'Major feature development, architecture changes, and scaling.'
    ELSE p.description
  END
FROM public.partner_service_categories c
WHERE p.category_id = c.id AND c.slug = 'app-changes';

-- Add forms feature to landing page packages for module mapping
INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, 'forms', 'Lead Forms', '✓', 7
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
WHERE c.slug = 'landing-page'
ON CONFLICT (package_id, feature_key) DO NOTHING;

INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, 'analytics', 'Conversion Tracking', '✓', 8
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
WHERE c.slug = 'landing-page'
ON CONFLICT (package_id, feature_key) DO NOTHING;
