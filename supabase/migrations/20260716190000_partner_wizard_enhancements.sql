-- Update budget field to free-text input and enrich question help text

UPDATE public.partner_questions
SET
  question_type = 'text',
  label = 'Estimated Budget',
  placeholder = 'e.g. ₹8,00,000 or $25,000 USD',
  help_text = 'Enter the client budget in any currency — amount or range',
  options = '[]'::jsonb
WHERE question_key = 'budget_range';

UPDATE public.partner_questions
SET help_text = 'Legal or trading name of your client''s company'
WHERE question_key = 'company_name' AND (help_text IS NULL OR help_text = '');

UPDATE public.partner_questions
SET help_text = 'What problems is the client trying to solve with this project?'
WHERE question_key = 'pain_points' AND (help_text IS NULL OR help_text = '');

UPDATE public.partner_questions
SET help_text = 'Business outcomes and measurable goals for the next 6–12 months'
WHERE question_key = 'goals' AND (help_text IS NULL OR help_text = '');

-- Website functional question labels
UPDATE public.partner_questions q
SET label = 'How many pages does the website need?', help_text = 'Approximate total pages including home, about, services, contact, etc.'
FROM public.partner_question_templates t
WHERE q.template_id = t.id AND t.slug = 'website-discovery' AND q.question_key = 'num_pages';

UPDATE public.partner_questions q
SET label = 'Does the client need a Content Management System (CMS)?', help_text = 'Allows the client to edit text, images, and pages without developer help'
FROM public.partner_question_templates t
WHERE q.template_id = t.id AND t.slug = 'website-discovery' AND q.question_key = 'need_cms';

UPDATE public.partner_questions q
SET label = 'Does the client need a blog or news section?', help_text = 'For content marketing, announcements, and SEO'
FROM public.partner_question_templates t
WHERE q.template_id = t.id AND t.slug = 'website-discovery' AND q.question_key = 'need_blog';

UPDATE public.partner_questions q
SET label = 'What level of SEO setup is required?', help_text = 'On-page SEO, meta tags, sitemap, and search engine readiness at launch'
FROM public.partner_question_templates t
WHERE q.template_id = t.id AND t.slug = 'website-discovery' AND q.question_key = 'need_seo';
