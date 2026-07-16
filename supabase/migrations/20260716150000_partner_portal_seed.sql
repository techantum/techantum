-- Seed partner portal packages and question templates (CMS-driven defaults)

-- ─── Service Categories ─────────────────────────────────────────────────────

INSERT INTO public.partner_service_categories (slug, name, description, display_order)
VALUES
  ('website', 'Website Development', 'Professional websites that convert visitors into customers.', 1),
  ('web-application', 'Web Application Development', 'Custom web apps for automation, dashboards, and scale.', 2),
  ('mobile-application', 'Mobile Application Development', 'Native and cross-platform mobile apps.', 3)
ON CONFLICT (slug) DO NOTHING;

-- ─── Website Packages ───────────────────────────────────────────────────────

INSERT INTO public.partner_packages (category_id, slug, name, tagline, best_for, description, display_order, is_highlighted)
SELECT c.id, v.slug, v.name, v.tagline, v.best_for, v.description, v.display_order, v.is_highlighted
FROM public.partner_service_categories c
CROSS JOIN (VALUES
  ('launch', 'Launch', 'Establish your online presence', 'Startups', 'Up to 5 CMS pages with essential features.', 1, false),
  ('growth', 'Growth', 'Generate leads and grow online', 'SMEs', 'Up to 10 CMS pages with blog, SEO, and integrations.', 2, true),
  ('enterprise', 'Enterprise', 'Scalable digital platforms', 'Large Enterprises', 'Unlimited pages with enterprise SEO and CRM.', 3, false)
) AS v(slug, name, tagline, best_for, description, display_order, is_highlighted)
WHERE c.slug = 'website'
ON CONFLICT (category_id, slug) DO NOTHING;

-- ─── Web App Packages ───────────────────────────────────────────────────────

INSERT INTO public.partner_packages (category_id, slug, name, tagline, best_for, description, display_order, is_highlighted)
SELECT c.id, v.slug, v.name, v.tagline, v.best_for, v.description, v.display_order, v.is_highlighted
FROM public.partner_service_categories c
CROSS JOIN (VALUES
  ('accelerate', 'Accelerate', 'Build fast and validate ideas', 'MVP / Startup', 'Core auth, dashboard, and basic automation.', 1, false),
  ('scale', 'Scale', 'Automate multiple departments', 'SMEs', 'Advanced workflows, payments, and integrations.', 2, true),
  ('transform', 'Transform', 'Enterprise-grade platforms', 'Enterprise', 'Unlimited roles, APIs, and enterprise security.', 3, false)
) AS v(slug, name, tagline, best_for, description, display_order, is_highlighted)
WHERE c.slug = 'web-application'
ON CONFLICT (category_id, slug) DO NOTHING;

-- ─── Mobile Packages ────────────────────────────────────────────────────────

INSERT INTO public.partner_packages (category_id, slug, name, tagline, best_for, description, display_order, is_highlighted)
SELECT c.id, v.slug, v.name, v.tagline, v.best_for, v.description, v.display_order, v.is_highlighted
FROM public.partner_service_categories c
CROSS JOIN (VALUES
  ('launch', 'Launch Mobile', 'MVP mobile apps', 'MVP', 'Android or iOS MVP with core features.', 1, false),
  ('growth', 'Growth Mobile', 'Cross-platform business apps', 'Business Apps', 'Android + iOS with offline and payments.', 2, true),
  ('enterprise', 'Enterprise Mobile', 'Enterprise mobility', 'Enterprise Mobility', 'Full enterprise mobility suite.', 3, false)
) AS v(slug, name, tagline, best_for, description, display_order, is_highlighted)
WHERE c.slug = 'mobile-application'
ON CONFLICT (category_id, slug) DO NOTHING;

-- ─── Website Package Features (comparison rows) ─────────────────────────────

INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('cms_pages', 'CMS Pages', 'Up to 5', 1),
  ('seo', 'SEO Setup', 'Basic', 2),
  ('cms', 'CMS', '✓', 3),
  ('blog', 'Blog Management', '—', 4),
  ('crm', 'CRM Integration', '—', 5),
  ('support', 'Support', '30 Days', 6)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'website' AND p.slug = 'launch'
ON CONFLICT (package_id, feature_key) DO NOTHING;

INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('cms_pages', 'CMS Pages', 'Up to 10', 1),
  ('seo', 'SEO Setup', 'Advanced', 2),
  ('cms', 'CMS', '✓', 3),
  ('blog', 'Blog Management', '✓', 4),
  ('crm', 'CRM Integration', 'Optional', 5),
  ('support', 'Support', '60 Days', 6)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'website' AND p.slug = 'growth'
ON CONFLICT (package_id, feature_key) DO NOTHING;

INSERT INTO public.partner_package_features (package_id, feature_key, feature_label, value, display_order)
SELECT p.id, f.feature_key, f.feature_label, f.value, f.display_order
FROM public.partner_packages p
JOIN public.partner_service_categories c ON c.id = p.category_id
CROSS JOIN (VALUES
  ('cms_pages', 'CMS Pages', 'Unlimited', 1),
  ('seo', 'SEO Setup', 'Enterprise', 2),
  ('cms', 'CMS', '✓', 3),
  ('blog', 'Blog Management', '✓', 4),
  ('crm', 'CRM Integration', '✓', 5),
  ('support', 'Support', '90 Days', 6)
) AS f(feature_key, feature_label, value, display_order)
WHERE c.slug = 'website' AND p.slug = 'enterprise'
ON CONFLICT (package_id, feature_key) DO NOTHING;

-- ─── Question Templates ─────────────────────────────────────────────────────

INSERT INTO public.partner_question_templates (slug, name, service_type, description)
VALUES
  ('website-discovery', 'Website Requirement Discovery', 'website', 'Questionnaire for website projects'),
  ('web-app-discovery', 'Web Application Discovery', 'web-application', 'Questionnaire for web application projects'),
  ('mobile-discovery', 'Mobile Application Discovery', 'mobile-application', 'Questionnaire for mobile app projects')
ON CONFLICT (slug) DO NOTHING;

-- Requirement reference sequence
CREATE SEQUENCE IF NOT EXISTS requirement_ref_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_requirement_ref()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    seq_val INT;
BEGIN
    seq_val := nextval('requirement_ref_seq');
    RETURN 'REQ-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

-- Shared business & project questions (all templates)
INSERT INTO public.partner_questions (template_id, question_key, label, question_type, options, placeholder, help_text, is_required, display_order, wizard_step)
SELECT t.id, q.question_key, q.label, q.question_type, q.options::jsonb, q.placeholder, q.help_text, q.is_required, q.display_order, q.wizard_step
FROM public.partner_question_templates t
CROSS JOIN (VALUES
  ('company_name', 'Client Company Name', 'text', '[]', 'Acme Corp', NULL, true, 1, 1),
  ('client_website', 'Client Website (if any)', 'text', '[]', 'https://', NULL, false, 2, 1),
  ('industry', 'Industry', 'dropdown', '["Technology","Healthcare","Education","Real Estate","Manufacturing","Retail","Finance","Other"]', NULL, NULL, true, 3, 1),
  ('country', 'Country', 'text', '[]', 'India', NULL, true, 4, 1),
  ('business_size', 'Business Size', 'dropdown', '["Startup (1-10)","SME (11-100)","Mid-Market (101-500)","Enterprise (500+)"]', NULL, NULL, true, 5, 1),
  ('employees', 'Number of Employees', 'number', '[]', '50', NULL, false, 6, 1),
  ('pain_points', 'Pain Points', 'textarea', '[]', 'Describe current challenges...', NULL, true, 7, 1),
  ('goals', 'Business Goals', 'textarea', '[]', 'What does success look like?', NULL, true, 8, 1),
  ('project_name', 'Project Name', 'text', '[]', 'Client Portal Redesign', NULL, true, 1, 2),
  ('expected_launch', 'Expected Launch', 'date', '[]', NULL, NULL, false, 2, 2),
  ('budget_range', 'Budget Range', 'dropdown', '["Under ₹5L","₹5L - ₹15L","₹15L - ₹25L","₹25L - ₹50L","₹50L+","To be discussed"]', NULL, NULL, true, 3, 2),
  ('priority', 'Priority', 'dropdown', '["Low","Medium","High","Critical"]', NULL, NULL, true, 4, 2),
  ('target_audience', 'Target Audience', 'textarea', '[]', 'Who will use this?', NULL, false, 5, 2),
  ('languages', 'Languages Required', 'multi_select', '["English","Hindi","Telugu","Tamil","Other"]', NULL, NULL, false, 6, 2),
  ('modules', 'Required Modules', 'multi_select', '["CMS","Blog","Career","Forms","CRM","Chat","Payments","Booking","Marketplace","Analytics","Admin Panel","API Integration"]', NULL, 'Select all that apply', true, 1, 3)
) AS q(question_key, label, question_type, options, placeholder, help_text, is_required, display_order, wizard_step)
ON CONFLICT (template_id, question_key) DO NOTHING;

-- Website-specific functional questions (step 4)
INSERT INTO public.partner_questions (template_id, question_key, label, question_type, options, is_required, display_order, wizard_step)
SELECT t.id, q.question_key, q.label, q.question_type, q.options::jsonb, q.is_required, q.display_order, 4
FROM public.partner_question_templates t
CROSS JOIN (VALUES
  ('num_pages', 'Number of Pages', 'number', '[]', true, 1),
  ('need_cms', 'Need CMS?', 'radio', '["Yes","No"]', true, 2),
  ('need_blog', 'Need Blog?', 'radio', '["Yes","No"]', false, 3),
  ('need_seo', 'Need SEO Setup?', 'radio', '["Basic","Advanced","Enterprise","No"]', true, 4),
  ('need_analytics', 'Need Analytics?', 'radio', '["Yes","No"]', false, 5),
  ('need_payment', 'Need Payment Gateway?', 'radio', '["Yes","No"]', false, 6),
  ('need_login', 'Need User Login?', 'radio', '["Yes","No"]', false, 7),
  ('need_multilang', 'Need Multi-language?', 'radio', '["Yes","No"]', false, 8)
) AS q(question_key, label, question_type, options, is_required, display_order)
WHERE t.slug = 'website-discovery'
ON CONFLICT (template_id, question_key) DO NOTHING;

-- Conditional: payment gateway (insert question first, then condition)
INSERT INTO public.partner_questions (template_id, question_key, label, question_type, options, is_required, display_order, wizard_step)
SELECT t.id, 'payment_gateway', 'Payment Gateway', 'dropdown', '["Razorpay","Stripe","PayPal","CCAvenue","Custom"]', false, 9, 4
FROM public.partner_question_templates t WHERE t.slug = 'website-discovery'
ON CONFLICT (template_id, question_key) DO NOTHING;

INSERT INTO public.partner_question_conditions (question_id, depends_on_question_key, operator, expected_value)
SELECT q.id, 'need_payment', 'equals', 'Yes'
FROM public.partner_questions q
JOIN public.partner_question_templates t ON t.id = q.template_id
WHERE t.slug = 'website-discovery' AND q.question_key = 'payment_gateway'
ON CONFLICT DO NOTHING;

-- Conditional: auth methods when login = Yes
INSERT INTO public.partner_questions (template_id, question_key, label, question_type, options, is_required, display_order, wizard_step)
SELECT t.id, 'auth_methods', 'Authentication Methods', 'multi_select', '["Email/Password","Google","OTP","Social Login","SSO","Active Directory"]', false, 10, 4
FROM public.partner_question_templates t WHERE t.slug = 'website-discovery'
ON CONFLICT (template_id, question_key) DO NOTHING;

INSERT INTO public.partner_question_conditions (question_id, depends_on_question_key, operator, expected_value)
SELECT q.id, 'need_login', 'equals', 'Yes'
FROM public.partner_questions q
JOIN public.partner_question_templates t ON t.id = q.template_id
WHERE t.slug = 'website-discovery' AND q.question_key = 'auth_methods'
ON CONFLICT DO NOTHING;

-- CMS follow-up when need_cms = Yes
INSERT INTO public.partner_questions (template_id, question_key, label, question_type, options, is_required, display_order, wizard_step)
SELECT t.id, 'cms_editable_pages', 'How many editable CMS pages?', 'number', '[]', false, 11, 4
FROM public.partner_question_templates t WHERE t.slug = 'website-discovery'
ON CONFLICT (template_id, question_key) DO NOTHING;

INSERT INTO public.partner_question_conditions (question_id, depends_on_question_key, operator, expected_value)
SELECT q.id, 'need_cms', 'equals', 'Yes'
FROM public.partner_questions q
JOIN public.partner_question_templates t ON t.id = q.template_id
WHERE t.slug = 'website-discovery' AND q.question_key = 'cms_editable_pages'
ON CONFLICT DO NOTHING;

-- Mobile-specific questions
INSERT INTO public.partner_questions (template_id, question_key, label, question_type, options, is_required, display_order, wizard_step)
SELECT t.id, q.question_key, q.label, q.question_type, q.options::jsonb, q.is_required, q.display_order, 4
FROM public.partner_question_templates t
CROSS JOIN (VALUES
  ('platforms', 'Platforms', 'multi_select', '["Android","iOS","Both"]', true, 1),
  ('offline_mode', 'Offline Mode?', 'radio', '["Yes","No"]', false, 2),
  ('push_notifications', 'Push Notifications?', 'radio', '["Yes","No"]', true, 3),
  ('maps_gps', 'Maps & GPS?', 'radio', '["Yes","No"]', false, 4),
  ('biometric', 'Biometric Login?', 'radio', '["Yes","No"]', false, 5)
) AS q(question_key, label, question_type, options, is_required, display_order)
WHERE t.slug = 'mobile-discovery'
ON CONFLICT (template_id, question_key) DO NOTHING;

-- Web app specific questions
INSERT INTO public.partner_questions (template_id, question_key, label, question_type, options, is_required, display_order, wizard_step)
SELECT t.id, q.question_key, q.label, q.question_type, q.options::jsonb, q.is_required, q.display_order, 4
FROM public.partner_question_templates t
CROSS JOIN (VALUES
  ('user_roles', 'Expected User Roles', 'number', '[]', true, 1),
  ('need_admin', 'Admin Panel?', 'radio', '["Yes","No"]', true, 2),
  ('workflow_automation', 'Workflow Automation', 'dropdown', '["Basic","Advanced","Enterprise"]', false, 3),
  ('api_integrations', 'API Integrations Needed', 'number', '[]', false, 4),
  ('erp_crm', 'ERP/CRM Integration?', 'radio', '["Yes","No","Optional"]', false, 5)
) AS q(question_key, label, question_type, options, is_required, display_order)
WHERE t.slug = 'web-app-discovery'
ON CONFLICT (template_id, question_key) DO NOTHING;
