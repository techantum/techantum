-- WhatsApp AI Assistant: contacts, conversations, messages, knowledge base, leads, settings.

ALTER TABLE public.site_branding
  ADD COLUMN IF NOT EXISTS whatsapp_widget_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- Knowledge base
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_knowledge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ai_knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.ai_knowledge_categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  allow_ai BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_knowledge_entries_category_idx ON public.ai_knowledge_entries(category_id);
CREATE INDEX IF NOT EXISTS ai_knowledge_entries_status_idx ON public.ai_knowledge_entries(status) WHERE status = 'PUBLISHED';
CREATE INDEX IF NOT EXISTS ai_knowledge_entries_search_idx ON public.ai_knowledge_entries
  USING gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(keywords, '')));

-- ---------------------------------------------------------------------------
-- AI settings (singleton)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ai_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  default_mode TEXT NOT NULL DEFAULT 'AI' CHECK (default_mode IN ('AI', 'HYBRID', 'HUMAN')),
  auto_handoff BOOLEAN NOT NULL DEFAULT TRUE,
  auto_lead_creation BOOLEAN NOT NULL DEFAULT TRUE,
  auto_conversation_summary BOOLEAN NOT NULL DEFAULT TRUE,
  knowledge_retrieval_limit INTEGER NOT NULL DEFAULT 6,
  max_response_length INTEGER NOT NULL DEFAULT 800,
  fallback_message TEXT NOT NULL DEFAULT 'I don''t have that information confirmed right now. I can have our team help you with it.',
  out_of_scope_message TEXT NOT NULL DEFAULT 'I can help specifically with Techantum''s websites, web applications, mobile applications and custom software solutions. What are you looking to build?',
  business_hours JSONB NOT NULL DEFAULT '{"timezone":"Asia/Kolkata","days":["Mon","Tue","Wed","Thu","Fri"],"open":"09:30","close":"18:30"}'::jsonb,
  after_hours_message TEXT NOT NULL DEFAULT 'Sure. I''ve noted your request. Our team can follow up during business hours.',
  handoff_mode TEXT NOT NULL DEFAULT 'HUMAN' CHECK (handoff_mode IN ('HUMAN', 'HYBRID')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- WhatsApp contacts & conversations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  whatsapp_user_id TEXT,
  profile_name TEXT,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  email TEXT,
  location TEXT,
  lead_id UUID,
  client_id UUID REFERENCES public.ops_clients(id) ON DELETE SET NULL,
  first_contact_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_contact_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.whatsapp_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_code TEXT NOT NULL UNIQUE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  conversation_id UUID,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  company TEXT,
  location TEXT,
  source TEXT NOT NULL DEFAULT 'WHATSAPP',
  service TEXT,
  requirement TEXT,
  project_type TEXT,
  timeline TEXT,
  budget TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  lead_stage TEXT NOT NULL DEFAULT 'NEW',
  ai_summary TEXT,
  assigned_to UUID,
  ops_client_id UUID REFERENCES public.ops_clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE IF NOT EXISTS whatsapp_lead_code_seq START 1;

CREATE OR REPLACE FUNCTION public.whatsapp_next_lead_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  y INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  n INTEGER;
BEGIN
  n := nextval('whatsapp_lead_code_seq');
  RETURN 'TL-' || y::text || '-' || lpad(n::text, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
  mode TEXT NOT NULL DEFAULT 'AI' CHECK (mode IN ('AI', 'HYBRID', 'HUMAN')),
  assigned_user_id UUID,
  ai_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  conversation_summary TEXT,
  last_ai_response_id TEXT,
  lead_stage TEXT NOT NULL DEFAULT 'NEW',
  intent TEXT,
  handoff_required BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_reason TEXT,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_conversations_contact_idx ON public.whatsapp_conversations(contact_id);
CREATE INDEX IF NOT EXISTS whatsapp_conversations_status_idx ON public.whatsapp_conversations(status);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('CUSTOMER', 'AI', 'STAFF', 'SYSTEM')),
  message_type TEXT NOT NULL DEFAULT 'text',
  text_content TEXT,
  media_id TEXT,
  media_url TEXT,
  media_mime_type TEXT,
  reply_to_message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  delivery_status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (
    delivery_status IN ('RECEIVED', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED')
  ),
  raw_payload JSONB,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_conversation_idx ON public.whatsapp_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS whatsapp_messages_contact_idx ON public.whatsapp_messages(contact_id);

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_message_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.whatsapp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FK backfill for leads
ALTER TABLE public.whatsapp_contacts
  DROP CONSTRAINT IF EXISTS whatsapp_contacts_lead_id_fkey;
ALTER TABLE public.whatsapp_contacts
  ADD CONSTRAINT whatsapp_contacts_lead_id_fkey
  FOREIGN KEY (lead_id) REFERENCES public.whatsapp_leads(id) ON DELETE SET NULL;

ALTER TABLE public.whatsapp_leads
  DROP CONSTRAINT IF EXISTS whatsapp_leads_conversation_id_fkey;
ALTER TABLE public.whatsapp_leads
  ADD CONSTRAINT whatsapp_leads_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.ai_knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_audit_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_knowledge_categories',
    'ai_knowledge_entries',
    'ai_settings',
    'whatsapp_contacts',
    'whatsapp_leads',
    'whatsapp_conversations',
    'whatsapp_messages',
    'whatsapp_webhook_events',
    'whatsapp_audit_log'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_admin ON public.%I FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
      ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
      )',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ai_knowledge_categories',
    'ai_knowledge_entries',
    'ai_settings',
    'whatsapp_contacts',
    'whatsapp_leads',
    'whatsapp_conversations',
    'whatsapp_messages'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Seed knowledge categories
-- ---------------------------------------------------------------------------

INSERT INTO public.ai_knowledge_categories (name, slug, description, sort_order) VALUES
  ('Company Information', 'company', 'About Techantum, contact, hours', 1),
  ('Website Development', 'website-development', 'CMS websites and corporate sites', 2),
  ('Web Applications', 'web-applications', 'Custom web apps and portals', 3),
  ('Mobile Applications', 'mobile-applications', 'iOS and Android apps', 4),
  ('SaaS Development', 'saas', 'SaaS product development', 5),
  ('CRM Solutions', 'crm', 'CRM and business systems', 6),
  ('Custom Software', 'custom-software', 'Bespoke software solutions', 7),
  ('UI/UX', 'ui-ux', 'Design services', 8),
  ('Technologies', 'technologies', 'Tech stack and platforms', 9),
  ('Packages', 'packages', 'Service packages and offerings', 10),
  ('Development Process', 'process', 'How Techantum delivers projects', 11),
  ('Timelines', 'timelines', 'Delivery timelines', 12),
  ('Support & Maintenance', 'support', 'Post-launch support', 13),
  ('Policies', 'policies', 'Terms, payment, policies', 14),
  ('FAQs', 'faqs', 'Frequently asked questions', 15),
  ('Contact Information', 'contact', 'How to reach Techantum', 16)
ON CONFLICT (slug) DO NOTHING;

-- Starter published knowledge (safe defaults — edit in admin)
INSERT INTO public.ai_knowledge_entries (category_id, title, content, keywords, status, allow_ai)
SELECT c.id,
  'About Techantum Solutions',
  'Techantum Solutions is a digital solutions company helping businesses with websites, web applications, mobile applications, SaaS products, CRM systems and custom software. We focus on understanding business requirements first, then recommending the right solution.',
  'about, company, techantum, who are you',
  'PUBLISHED',
  TRUE
FROM public.ai_knowledge_categories c WHERE c.slug = 'company'
AND NOT EXISTS (SELECT 1 FROM public.ai_knowledge_entries e WHERE e.title = 'About Techantum Solutions');

INSERT INTO public.ai_knowledge_entries (category_id, title, content, keywords, status, allow_ai)
SELECT c.id,
  'Website Development Overview',
  'Techantum builds professional websites including corporate sites, CMS websites and lead-generation websites. Typical focus areas include clear service presentation, portfolio or project galleries, enquiry forms, mobile responsiveness and easy content updates.',
  'website, cms, corporate website, landing page',
  'PUBLISHED',
  TRUE
FROM public.ai_knowledge_categories c WHERE c.slug = 'website-development'
AND NOT EXISTS (SELECT 1 FROM public.ai_knowledge_entries e WHERE e.title = 'Website Development Overview');

INSERT INTO public.ai_knowledge_entries (category_id, title, content, keywords, status, allow_ai)
SELECT c.id,
  'Development Process',
  'Our process typically includes requirement understanding, solution recommendation, design/UI alignment, development, testing, deployment and handover with training where applicable.',
  'process, workflow, how it works, delivery',
  'PUBLISHED',
  TRUE
FROM public.ai_knowledge_categories c WHERE c.slug = 'process'
AND NOT EXISTS (SELECT 1 FROM public.ai_knowledge_entries e WHERE e.title = 'Development Process');

INSERT INTO public.ai_knowledge_entries (category_id, title, content, keywords, status, allow_ai)
SELECT c.id,
  'Contact Techantum',
  'Customers can reach Techantum through the website contact page, email, phone or WhatsApp. For custom estimates, proposals or detailed technical discussions, our team can follow up directly.',
  'contact, email, phone, whatsapp, reach',
  'PUBLISHED',
  TRUE
FROM public.ai_knowledge_categories c WHERE c.slug = 'contact'
AND NOT EXISTS (SELECT 1 FROM public.ai_knowledge_entries e WHERE e.title = 'Contact Techantum');
