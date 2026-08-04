-- Streamline client onboarding template: fewer fields, richer input types.

UPDATE public.requirement_templates
SET
  welcome_message = 'Welcome! Complete each section at your pace — your progress saves automatically. Skip anything you''re unsure about; we can refine details together later.',
  description = 'Streamlined website onboarding questionnaire for client requirement collection.'
WHERE slug = 'cms-website-launch';

DELETE FROM public.requirement_questions
WHERE section_id IN (
  SELECT rs.id
  FROM public.requirement_sections rs
  JOIN public.requirement_templates rt ON rt.id = rs.template_id
  WHERE rt.slug = 'cms-website-launch'
);

INSERT INTO public.requirement_questions (section_id, question_key, label, help_text, field_type, options, sort_order, is_required)
SELECT rs.id, q.question_key, q.label, q.help_text, q.field_type, q.options::jsonb, q.sort_order, q.is_required
FROM public.requirement_sections rs
JOIN public.requirement_templates rt ON rt.id = rs.template_id
JOIN (VALUES
  ('company-overview', 'company_introduction', 'About your company', 'Brief introduction — who you are and what you do.', 'richtext', '[]', 1, true),
  ('company-overview', 'vision_mission', 'Vision, mission & values', 'Share your vision, mission, and core values in one place.', 'richtext', '[]', 2, false),
  ('company-overview', 'company_history', 'History & milestones', 'Key milestones, founding story, or growth highlights.', 'richtext', '[]', 3, false),

  ('services', 'services_list', 'Your services', 'Add each service you want featured on the website.', 'services', '[]', 1, false),

  ('usp', 'why_choose_us', 'Why clients choose you', 'USP, competitive advantages, quality standards, and credentials.', 'richtext', '[]', 1, false),
  ('usp', 'achievements', 'Achievements & landmark work', 'Major clients, certifications, awards, or landmark projects.', 'richtext', '[]', 2, false),

  ('projects', 'projects_list', 'Featured projects', 'Showcase projects you want on the portfolio.', 'projects', '[]', 1, false),

  ('industries', 'industries_served', 'Industries you serve', 'Select all that apply.', 'multiselect', '["Manufacturing","Logistics","Agriculture","Food Processing","Cold Storage","Commercial","Industrial","Others"]', 1, false),
  ('industries', 'industries_notes', 'Industry notes', 'Any additional context about sectors or niches.', 'textarea', '[]', 2, false),

  ('testimonials', 'testimonials_list', 'Client testimonials', 'Add testimonials you want published.', 'testimonials', '[]', 1, false),

  ('contact-information', 'corporate_address', 'Head office address', NULL, 'textarea', '[]', 1, false),
  ('contact-information', 'contact_details', 'Phone, email & hours', 'List phone numbers, emails, working hours, and branch offices.', 'richtext', '[]', 2, false),
  ('contact-information', 'google_maps_url', 'Google Maps link', 'Paste your Google Maps or location URL.', 'url', '[]', 3, false),
  ('contact-information', 'social_links', 'Social media links', 'LinkedIn, Instagram, Facebook, YouTube, etc.', 'textarea', '[]', 4, false),

  ('branding', 'logo_upload', 'Logo files', 'Upload primary and alternate logo files.', 'image', '[]', 1, false),
  ('branding', 'brand_overview', 'Brand guidelines', 'Colors, fonts, tagline, and any brand notes.', 'richtext', '[]', 2, false),
  ('branding', 'brand_pdf', 'Brand guideline PDF', 'Optional brand book or style guide.', 'pdf', '[]', 3, false),

  ('website-goals', 'primary_objective', 'Website goals', 'Primary objective, target audience, and expected user actions.', 'richtext', '[]', 1, false),
  ('website-goals', 'desired_features', 'Features & pages needed', 'Pages, integrations, or functionality you expect.', 'textarea', '[]', 2, false),

  ('seo', 'seo_overview', 'SEO & discoverability', 'Target keywords, cities/states, competitors, and existing digital presence.', 'richtext', '[]', 1, false),

  ('lead-management', 'lead_preferences', 'Lead capture preferences', 'Form fields, notification emails, departments, and workflow notes.', 'richtext', '[]', 1, false),

  ('marketing-assets', 'reference_websites', 'Reference websites', 'Sites you like for design, structure, or content inspiration.', 'textarea', '[]', 1, false),
  ('marketing-assets', 'marketing_notes', 'Additional notes', 'Brochures, videos, or anything else we should know.', 'textarea', '[]', 2, false)
) AS q(section_slug, question_key, label, help_text, field_type, options, sort_order, is_required)
ON rs.slug = q.section_slug
WHERE rt.slug = 'cms-website-launch'
ON CONFLICT (section_id, question_key) DO UPDATE SET
  label = EXCLUDED.label,
  help_text = EXCLUDED.help_text,
  field_type = EXCLUDED.field_type,
  options = EXCLUDED.options,
  sort_order = EXCLUDED.sort_order,
  is_required = EXCLUDED.is_required;

UPDATE public.requirement_sections rs
SET description = CASE rs.slug
  WHEN 'company-overview' THEN 'Help us understand your business story.'
  WHEN 'services' THEN 'List the services to highlight on your site.'
  WHEN 'usp' THEN 'What makes you stand out from competitors?'
  WHEN 'projects' THEN 'Portfolio projects you want showcased.'
  WHEN 'industries' THEN 'Sectors and markets you serve.'
  WHEN 'testimonials' THEN 'Social proof from happy clients.'
  WHEN 'contact-information' THEN 'How customers can reach you.'
  WHEN 'branding' THEN 'Visual identity and brand assets.'
  WHEN 'website-goals' THEN 'What success looks like for this website.'
  WHEN 'seo' THEN 'How you want to be found online.'
  WHEN 'lead-management' THEN 'How incoming enquiries should work.'
  WHEN 'marketing-assets' THEN 'References and supporting material.'
  ELSE rs.description
END
FROM public.requirement_templates rt
WHERE rs.template_id = rt.id AND rt.slug = 'cms-website-launch';
