-- Client requirement collection system
-- Public clients access requirements by secure token; admins manage everything.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.requirement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  project_type TEXT NOT NULL,
  package_name TEXT,
  description TEXT,
  welcome_message TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.requirement_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.requirement_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_repeatable BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, slug)
);

CREATE TABLE IF NOT EXISTS public.requirement_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.requirement_sections(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  field_type TEXT NOT NULL DEFAULT 'text',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(section_id, question_key)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_code TEXT NOT NULL UNIQUE DEFAULT ('PRJ-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  project_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  primary_contact_person TEXT,
  email TEXT NOT NULL,
  mobile_number TEXT,
  project_type TEXT NOT NULL,
  package_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  template_id UUID REFERENCES public.requirement_templates(id) ON DELETE SET NULL,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  token_generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMPTZ,
  optional_password_hash TEXT,
  allow_multiple_submissions BOOLEAN NOT NULL DEFAULT false,
  allow_save_draft BOOLEAN NOT NULL DEFAULT true,
  share_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.requirement_templates(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending', 'reviewed', 'approved', 'need_clarification')),
  submission_number INTEGER NOT NULL DEFAULT 1,
  current_section_slug TEXT,
  completion_percent INTEGER NOT NULL DEFAULT 0,
  last_saved_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  confirmed_accuracy BOOLEAN NOT NULL DEFAULT false,
  clarification_sections TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_requirement_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.requirement_sections(id) ON DELETE SET NULL,
  section_slug TEXT NOT NULL,
  question_key TEXT NOT NULL,
  answer_value JSONB NOT NULL DEFAULT 'null'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requirement_id, section_slug, question_key)
);

CREATE TABLE IF NOT EXISTS public.project_requirement_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  service_name TEXT,
  overview TEXT,
  how_it_works TEXT,
  features TEXT,
  benefits TEXT,
  industries_served TEXT,
  types TEXT,
  execution_process TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_requirement_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  project_name TEXT,
  location TEXT,
  category TEXT,
  description TEXT,
  highlights TEXT,
  completion_year TEXT,
  client_name TEXT,
  status TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_requirement_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  client_name TEXT,
  designation TEXT,
  company TEXT,
  testimonial TEXT,
  photo_url TEXT,
  logo_url TEXT,
  awards TEXT,
  certifications TEXT,
  case_studies TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_requirement_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  title TEXT,
  notes TEXT,
  attachment_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  section_slug TEXT,
  field_key TEXT,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_requirement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  section_slug TEXT,
  author_type TEXT NOT NULL CHECK (author_type IN ('admin', 'client', 'system')),
  author_id UUID,
  comment TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.project_requirement_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(requirement_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.project_requirements(id) ON DELETE CASCADE,
  audience TEXT NOT NULL CHECK (audience IN ('admin', 'client')),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  requirement_id UUID REFERENCES public.project_requirements(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id UUID,
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_public_token ON public.projects(public_token);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_requirements_project ON public.project_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirement_answers_requirement ON public.project_requirement_answers(requirement_id);
CREATE INDEX IF NOT EXISTS idx_attachments_requirement ON public.attachments(requirement_id);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'requirement_templates', 'requirement_sections', 'requirement_questions',
    'projects', 'project_requirements', 'project_requirement_answers',
    'project_requirement_services', 'project_requirement_projects',
    'project_requirement_testimonials', 'project_requirement_assets'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', tbl, tbl);
  END LOOP;
END $$;

ALTER TABLE public.requirement_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirement_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirement_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirement_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirement_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirement_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requirement_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'requirement_templates', 'requirement_sections', 'requirement_questions',
    'projects', 'project_requirements', 'project_requirement_answers',
    'project_requirement_services', 'project_requirement_projects',
    'project_requirement_testimonials', 'project_requirement_assets',
    'project_requirement_comments', 'project_requirement_versions',
    'attachments', 'notifications', 'activity_logs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY %I_admin_all ON public.%I FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
      )',
      tbl, tbl
    );
  END LOOP;
END $$;

CREATE POLICY requirement_templates_public_read ON public.requirement_templates
  FOR SELECT USING (is_active = true);
CREATE POLICY requirement_sections_public_read ON public.requirement_sections
  FOR SELECT USING (
    template_id IN (SELECT id FROM public.requirement_templates WHERE is_active = true)
  );
CREATE POLICY requirement_questions_public_read ON public.requirement_questions
  FOR SELECT USING (true);

WITH template AS (
  INSERT INTO public.requirement_templates (name, slug, project_type, package_name, description, welcome_message)
  VALUES (
    'CMS Website - Launch',
    'cms-website-launch',
    'CMS Website',
    'Launch Plan',
    'Complete requirement gathering template for CMS website launch projects.',
    'Welcome. Please complete each section with as much detail as possible. You can save your progress and return before final submission.'
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    project_type = EXCLUDED.project_type,
    package_name = EXCLUDED.package_name,
    description = EXCLUDED.description,
    welcome_message = EXCLUDED.welcome_message
  RETURNING id
),
sections AS (
  INSERT INTO public.requirement_sections (template_id, title, slug, sort_order, is_repeatable, config)
  SELECT id, title, slug, sort_order, is_repeatable, config
  FROM template,
  (VALUES
    ('Company Overview', 'company-overview', 1, false, '{"upload":true}'::jsonb),
    ('Services', 'services', 2, true, '{"prefill":true}'::jsonb),
    ('USP', 'usp', 3, false, '{}'::jsonb),
    ('Projects', 'projects', 4, true, '{}'::jsonb),
    ('Industries', 'industries', 5, false, '{}'::jsonb),
    ('Testimonials', 'testimonials', 6, true, '{}'::jsonb),
    ('Contact Information', 'contact-information', 7, false, '{}'::jsonb),
    ('Branding', 'branding', 8, false, '{"upload":true}'::jsonb),
    ('Website Goals', 'website-goals', 9, false, '{}'::jsonb),
    ('SEO', 'seo', 10, false, '{}'::jsonb),
    ('Lead Management', 'lead-management', 11, false, '{}'::jsonb),
    ('Marketing Assets', 'marketing-assets', 12, false, '{"upload":true}'::jsonb)
  ) AS s(title, slug, sort_order, is_repeatable, config)
  ON CONFLICT (template_id, slug) DO UPDATE SET
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order,
    is_repeatable = EXCLUDED.is_repeatable,
    config = EXCLUDED.config
  RETURNING id, slug
)
INSERT INTO public.requirement_questions (section_id, question_key, label, field_type, options, sort_order, is_required)
SELECT sections.id, q.question_key, q.label, q.field_type, q.options, q.sort_order, q.is_required
FROM sections
JOIN (VALUES
  ('company-overview', 'company_introduction', 'Company Introduction', 'textarea', '[]'::jsonb, 1, true),
  ('company-overview', 'vision', 'Vision', 'textarea', '[]'::jsonb, 2, false),
  ('company-overview', 'mission', 'Mission', 'textarea', '[]'::jsonb, 3, false),
  ('company-overview', 'core_values', 'Core Values', 'textarea', '[]'::jsonb, 4, false),
  ('company-overview', 'company_history', 'Company History', 'textarea', '[]'::jsonb, 5, false),
  ('services', 'services_list', 'Services', 'services', '[]'::jsonb, 1, false),
  ('usp', 'why_choose_us', 'Why Choose Us', 'textarea', '[]'::jsonb, 1, false),
  ('usp', 'competitive_advantages', 'Competitive Advantages', 'textarea', '[]'::jsonb, 2, false),
  ('usp', 'industry_experience', 'Industry Experience', 'textarea', '[]'::jsonb, 3, false),
  ('usp', 'quality_standards', 'Quality Standards', 'textarea', '[]'::jsonb, 4, false),
  ('usp', 'certifications', 'Certifications', 'textarea', '[]'::jsonb, 5, false),
  ('usp', 'construction_technologies', 'Construction Technologies', 'textarea', '[]'::jsonb, 6, false),
  ('usp', 'achievements', 'Achievements', 'textarea', '[]'::jsonb, 7, false),
  ('usp', 'milestones', 'Milestones', 'textarea', '[]'::jsonb, 8, false),
  ('usp', 'major_clients', 'Major Clients', 'textarea', '[]'::jsonb, 9, false),
  ('usp', 'landmark_projects', 'Landmark Projects', 'textarea', '[]'::jsonb, 10, false),
  ('projects', 'projects_list', 'Projects', 'projects', '[]'::jsonb, 1, false),
  ('industries', 'industries_served', 'Industries Served', 'multiselect', '["Manufacturing","Logistics","Agriculture","Food Processing","Cold Storage","Commercial","Others"]'::jsonb, 1, false),
  ('testimonials', 'testimonials_list', 'Testimonials', 'testimonials', '[]'::jsonb, 1, false),
  ('contact-information', 'corporate_address', 'Corporate Address', 'textarea', '[]'::jsonb, 1, false),
  ('contact-information', 'branch_offices', 'Branch Offices', 'textarea', '[]'::jsonb, 2, false),
  ('contact-information', 'phone_numbers', 'Phone Numbers', 'text', '[]'::jsonb, 3, false),
  ('contact-information', 'emails', 'Emails', 'text', '[]'::jsonb, 4, false),
  ('contact-information', 'google_maps_url', 'Google Maps URL', 'url', '[]'::jsonb, 5, false),
  ('contact-information', 'working_hours', 'Working Hours', 'text', '[]'::jsonb, 6, false),
  ('contact-information', 'social_links', 'Social Links', 'textarea', '[]'::jsonb, 7, false),
  ('branding', 'logo_notes', 'Logo / Brand Notes', 'textarea', '[]'::jsonb, 1, false),
  ('branding', 'brand_guidelines', 'Brand Guidelines', 'textarea', '[]'::jsonb, 2, false),
  ('branding', 'brand_colors', 'Brand Colors', 'text', '[]'::jsonb, 3, false),
  ('branding', 'fonts', 'Fonts', 'text', '[]'::jsonb, 4, false),
  ('branding', 'tagline', 'Tagline', 'text', '[]'::jsonb, 5, false),
  ('branding', 'additional_branding_notes', 'Additional Branding Notes', 'textarea', '[]'::jsonb, 6, false),
  ('website-goals', 'primary_objective', 'Primary Objective', 'textarea', '[]'::jsonb, 1, false),
  ('website-goals', 'target_audience', 'Target Audience', 'textarea', '[]'::jsonb, 2, false),
  ('website-goals', 'regions_served', 'Regions Served', 'text', '[]'::jsonb, 3, false),
  ('website-goals', 'business_goals', 'Business Goals', 'textarea', '[]'::jsonb, 4, false),
  ('website-goals', 'expected_user_actions', 'Expected User Actions', 'textarea', '[]'::jsonb, 5, false),
  ('website-goals', 'desired_website_features', 'Desired Website Features', 'textarea', '[]'::jsonb, 6, false),
  ('seo', 'target_keywords', 'Target Keywords', 'textarea', '[]'::jsonb, 1, false),
  ('seo', 'target_cities', 'Target Cities', 'text', '[]'::jsonb, 2, false),
  ('seo', 'target_states', 'Target States', 'text', '[]'::jsonb, 3, false),
  ('seo', 'competitor_websites', 'Competitor Websites', 'textarea', '[]'::jsonb, 4, false),
  ('seo', 'existing_website', 'Existing Website', 'url', '[]'::jsonb, 5, false),
  ('seo', 'google_business_profile', 'Google Business Profile', 'url', '[]'::jsonb, 6, false),
  ('seo', 'google_analytics', 'Google Analytics', 'text', '[]'::jsonb, 7, false),
  ('seo', 'search_console', 'Search Console', 'text', '[]'::jsonb, 8, false),
  ('lead-management', 'preferred_form_fields', 'Preferred Form Fields', 'textarea', '[]'::jsonb, 1, false),
  ('lead-management', 'mandatory_fields', 'Mandatory Fields', 'textarea', '[]'::jsonb, 2, false),
  ('lead-management', 'notification_emails', 'Notification Emails', 'text', '[]'::jsonb, 3, false),
  ('lead-management', 'departments', 'Departments', 'textarea', '[]'::jsonb, 4, false),
  ('lead-management', 'lead_workflow', 'Lead Workflow', 'textarea', '[]'::jsonb, 5, false),
  ('lead-management', 'additional_notes', 'Additional Notes', 'textarea', '[]'::jsonb, 6, false),
  ('marketing-assets', 'reference_websites', 'Reference Websites', 'textarea', '[]'::jsonb, 1, false),
  ('marketing-assets', 'additional_notes', 'Additional Notes', 'textarea', '[]'::jsonb, 2, false)
) AS q(section_slug, question_key, label, field_type, options, sort_order, is_required)
ON sections.slug = q.section_slug
ON CONFLICT (section_id, question_key) DO UPDATE SET
  label = EXCLUDED.label,
  field_type = EXCLUDED.field_type,
  options = EXCLUDED.options,
  sort_order = EXCLUDED.sort_order,
  is_required = EXCLUDED.is_required;
