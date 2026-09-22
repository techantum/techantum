-- WhatsApp Business Tech Provider console + admin role split.
-- SUPER_ADMIN sees WhatsApp Provider, WhatsApp AI, Recruitment, Partner Portal.
-- ADMIN does not.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'ADMIN';

ALTER TABLE public.admin_users
  DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('SUPER_ADMIN', 'ADMIN'));

CREATE OR REPLACE FUNCTION public.wa_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.wa_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  name TEXT NOT NULL,
  legal_name TEXT,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  meta_business_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ONBOARDING', 'ATTENTION', 'SUSPENDED', 'INACTIVE', 'ARCHIVED')),
  onboarding_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  platform_health TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (platform_health IN ('HEALTHY', 'ATTENTION', 'CRITICAL', 'DISCONNECTED', 'UNKNOWN')),
  platform_health_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  assigned_manager_id UUID REFERENCES public.admin_users(user_id) ON DELETE SET NULL,
  meta_connection_status TEXT NOT NULL DEFAULT 'DISCONNECTED',
  last_synced_at TIMESTAMPTZ,
  last_api_activity_at TIMESTAMPTZ,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_clients_status_idx ON public.wa_clients(status, onboarding_status);
CREATE INDEX IF NOT EXISTS wa_clients_meta_business_idx ON public.wa_clients(meta_business_id);
CREATE INDEX IF NOT EXISTS wa_clients_name_idx ON public.wa_clients(lower(name));

CREATE TABLE IF NOT EXISTS public.wa_client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'CLIENT_VIEWER' CHECK (role IN ('CLIENT_ADMIN', 'CLIENT_MARKETING', 'CLIENT_SUPPORT', 'CLIENT_VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INVITED', 'DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, email)
);

CREATE INDEX IF NOT EXISTS wa_client_users_user_idx ON public.wa_client_users(user_id);

CREATE TABLE IF NOT EXISTS public.wa_business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  meta_business_id TEXT,
  waba_id TEXT NOT NULL,
  name TEXT,
  currency TEXT,
  timezone TEXT,
  account_status TEXT,
  verification_status TEXT,
  platform_health TEXT NOT NULL DEFAULT 'UNKNOWN',
  webhook_subscribed BOOLEAN NOT NULL DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (waba_id)
);

CREATE INDEX IF NOT EXISTS wa_waba_client_idx ON public.wa_business_accounts(client_id);

CREATE TABLE IF NOT EXISTS public.wa_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  waba_account_id UUID REFERENCES public.wa_business_accounts(id) ON DELETE SET NULL,
  waba_id TEXT,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT,
  verified_name TEXT,
  registration_status TEXT,
  quality_rating TEXT,
  messaging_status TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  last_synced_at TIMESTAMPTZ,
  last_successful_api_at TIMESTAMPTZ,
  webhook_health TEXT NOT NULL DEFAULT 'UNKNOWN',
  raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (phone_number_id)
);

CREATE INDEX IF NOT EXISTS wa_phones_client_idx ON public.wa_phone_numbers(client_id);
CREATE INDEX IF NOT EXISTS wa_phones_quality_idx ON public.wa_phone_numbers(quality_rating);
CREATE INDEX IF NOT EXISTS wa_phones_display_idx ON public.wa_phone_numbers(display_phone_number);

CREATE TABLE IF NOT EXISTS public.wa_phone_quality_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id UUID NOT NULL REFERENCES public.wa_phone_numbers(id) ON DELETE CASCADE,
  previous_quality TEXT,
  new_quality TEXT NOT NULL,
  event TEXT,
  meta_event_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_phone_quality_phone_idx ON public.wa_phone_quality_history(phone_number_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  waba_account_id UUID REFERENCES public.wa_business_accounts(id) ON DELETE SET NULL,
  waba_id TEXT,
  meta_template_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  header_type TEXT,
  header_content TEXT,
  body TEXT,
  footer TEXT,
  components_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  buttons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  internal_status TEXT NOT NULL DEFAULT 'DRAFT',
  meta_status TEXT,
  quality_status TEXT,
  rejection_reason TEXT,
  library_source_id UUID,
  submitted_at TIMESTAMPTZ,
  meta_approved_at TIMESTAMPTZ,
  created_by UUID,
  submitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_templates_client_idx ON public.wa_templates(client_id, internal_status);
CREATE INDEX IF NOT EXISTS wa_templates_meta_idx ON public.wa_templates(meta_template_id);
CREATE INDEX IF NOT EXISTS wa_templates_name_idx ON public.wa_templates(lower(name));

CREATE TABLE IF NOT EXISTS public.wa_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.wa_templates(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL DEFAULT 1,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.wa_templates(id) ON DELETE CASCADE,
  reviewer_id UUID,
  decision TEXT NOT NULL,
  comments TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_template_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  header_type TEXT,
  header_content TEXT,
  body TEXT NOT NULL,
  footer TEXT,
  buttons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  country_code TEXT,
  name TEXT,
  email TEXT,
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT,
  opt_in_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  opt_in_source TEXT,
  opt_in_at TIMESTAMPTZ,
  opt_out_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id, phone)
);

CREATE INDEX IF NOT EXISTS wa_contacts_client_phone_idx ON public.wa_contacts(client_id, phone);

CREATE TABLE IF NOT EXISTS public.wa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE SET NULL,
  phone_number_id UUID REFERENCES public.wa_phone_numbers(id) ON DELETE SET NULL,
  assigned_agent_id UUID,
  assigned_department TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PENDING', 'RESOLVED')),
  unread_count INTEGER NOT NULL DEFAULT 0,
  tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_conversations_client_idx ON public.wa_conversations(client_id, status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  waba_id TEXT,
  phone_number_id UUID REFERENCES public.wa_phone_numbers(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.wa_conversations(id) ON DELETE SET NULL,
  wamid TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  type TEXT NOT NULL DEFAULT 'text',
  template_id UUID REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  campaign_id UUID,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  cost_json JSONB,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_wamid_uidx ON public.wa_messages(wamid) WHERE wamid IS NOT NULL;
CREATE INDEX IF NOT EXISTS wa_messages_client_created_idx ON public.wa_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wa_messages_status_idx ON public.wa_messages(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_message_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.wa_messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  meta_timestamp TIMESTAMPTZ,
  payload_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  waba_account_id UUID REFERENCES public.wa_business_accounts(id) ON DELETE SET NULL,
  phone_number_id UUID REFERENCES public.wa_phone_numbers(id) ON DELETE SET NULL,
  template_id UUID REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  audience_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  variables_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_by UUID,
  sent_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  read_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.wa_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.wa_contacts(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.wa_messages(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.wa_messages
  DROP CONSTRAINT IF EXISTS wa_messages_campaign_id_fkey;
ALTER TABLE public.wa_messages
  ADD CONSTRAINT wa_messages_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES public.wa_campaigns(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.wa_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  conditions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.wa_automations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'STARTED',
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  log_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.wa_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  waba_account_id UUID REFERENCES public.wa_business_accounts(id) ON DELETE SET NULL,
  meta_flow_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  json_spec JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE SET NULL,
  waba_id TEXT,
  phone_number_id TEXT,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized_json JSONB,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status TEXT NOT NULL DEFAULT 'RECEIVED',
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_key)
);

CREATE INDEX IF NOT EXISTS wa_webhook_events_status_idx ON public.wa_webhook_events(processing_status, received_at DESC);
CREATE INDEX IF NOT EXISTS wa_webhook_events_client_idx ON public.wa_webhook_events(client_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  http_status INTEGER,
  meta_error_code TEXT,
  duration_ms INTEGER,
  correlation_id TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  retry_count INTEGER NOT NULL DEFAULT 0,
  sanitized_request JSONB,
  sanitized_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_api_logs_created_idx ON public.wa_api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS wa_api_logs_client_idx ON public.wa_api_logs(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  resource_type TEXT,
  resource_id UUID,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'INFORMATION')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'ASSIGNED', 'RESOLVED')),
  assigned_to UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_alerts_open_idx ON public.wa_alerts(status, severity, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_alert_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.wa_alerts(id) ON DELETE CASCADE,
  author_id UUID,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'META',
  status TEXT NOT NULL DEFAULT 'DISCONNECTED',
  permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'META',
  credential_type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  key_version TEXT NOT NULL DEFAULT 'v1',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_credentials_unique_idx
  ON public.wa_integration_credentials(client_id, provider, credential_type);

CREATE TABLE IF NOT EXISTS public.wa_billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'BASIC',
  setup_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
  additional_users INTEGER NOT NULL DEFAULT 0,
  addons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  renewal_date DATE,
  invoice_status TEXT NOT NULL DEFAULT 'CURRENT',
  outstanding_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit_line_attached BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (client_id)
);

CREATE TABLE IF NOT EXISTS public.wa_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  api_count INTEGER NOT NULL DEFAULT 0,
  extra_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  waba_id TEXT,
  phone_number_id UUID,
  subject TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_support_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.wa_support_tickets(id) ON DELETE CASCADE,
  author_id UUID,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE SET NULL,
  actor_user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS wa_audit_created_idx ON public.wa_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS wa_audit_client_idx ON public.wa_audit_logs(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wa_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  result_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.wa_onboarding_sessions(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  step INTEGER,
  event TEXT NOT NULL,
  status TEXT NOT NULL,
  detail_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  audience TEXT NOT NULL DEFAULT 'PROVIDER',
  user_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.wa_daily_message_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  read INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  inbound INTEGER NOT NULL DEFAULT 0,
  UNIQUE (client_id, stat_date)
);

CREATE TABLE IF NOT EXISTS public.wa_conversation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.wa_conversations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.wa_clients(id) ON DELETE CASCADE,
  author_id UUID,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wa_clients','wa_client_users','wa_business_accounts','wa_phone_numbers','wa_templates',
    'wa_template_library','wa_contacts','wa_conversations','wa_campaigns','wa_automations',
    'wa_flows','wa_integrations','wa_integration_credentials','wa_billing_accounts',
    'wa_support_tickets','wa_onboarding_sessions'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.wa_touch_updated_at()', t, t);
  END LOOP;
END $$;

INSERT INTO public.wa_template_library (name, category, language, body, footer, variables_json, examples_json)
SELECT * FROM (VALUES
  ('otp_verification', 'OTP', 'en', 'Your verification code is {{1}}. It expires in 10 minutes. Do not share this code.', 'Techantum', '["1"]'::jsonb, '{"1":"482193"}'::jsonb),
  ('registration_welcome', 'REGISTRATION', 'en', 'Welcome {{1}}. Your registration is complete. Reply HELP if you need assistance.', 'Techantum', '["1"]'::jsonb, '{"1":"Asha"}'::jsonb),
  ('welcome_message', 'WELCOME', 'en', 'Hi {{1}}, welcome to {{2}}. We are glad you connected with us on WhatsApp.', 'Techantum', '["1","2"]'::jsonb, '{"1":"Rahul","2":"ABC Hospitals"}'::jsonb),
  ('forgot_password', 'FORGOT_PASSWORD', 'en', 'Hi {{1}}, use code {{2}} to reset your password. The code expires in 15 minutes.', 'Techantum', '["1","2"]'::jsonb, '{"1":"Priya","2":"918273"}'::jsonb),
  ('appointment_confirm', 'APPOINTMENT', 'en', 'Hello {{1}}, your appointment is confirmed for {{2}}.', 'Techantum', '["1","2"]'::jsonb, '{"1":"Rahul","2":"24 Sep 10:30 AM"}'::jsonb),
  ('appointment_reminder', 'APPOINTMENT_REMINDER', 'en', 'Reminder: {{1}}, your appointment is tomorrow at {{2}}.', 'Techantum', '["1","2"]'::jsonb, '{"1":"Rahul","2":"10:30 AM"}'::jsonb),
  ('order_update', 'ORDER', 'en', 'Hi {{1}}, your order {{2}} is now {{3}}.', 'Techantum', '["1","2","3"]'::jsonb, '{"1":"Asha","2":"ORD-1024","3":"shipped"}'::jsonb),
  ('payment_confirmation', 'PAYMENT_CONFIRMATION', 'en', 'Payment of {{1}} for invoice {{2}} was received. Thank you.', 'Techantum', '["1","2"]'::jsonb, '{"1":"₹4,500","2":"INV-88"}'::jsonb),
  ('payment_reminder', 'PAYMENT_REMINDER', 'en', 'Hi {{1}}, invoice {{2}} of {{3}} is due on {{4}}.', 'Techantum', '["1","2","3","4"]'::jsonb, '{"1":"Rahul","2":"INV-88","3":"₹4,500","4":"30 Sep"}'::jsonb),
  ('invoice_ready', 'INVOICE', 'en', 'Hi {{1}}, invoice {{2}} is ready. Amount due: {{3}}.', 'Techantum', '["1","2","3"]'::jsonb, '{"1":"Asha","2":"INV-90","3":"₹12,000"}'::jsonb),
  ('enquiry_received', 'ENQUIRY', 'en', 'Thanks {{1}}. We received your enquiry about {{2}} and will respond shortly.', 'Techantum', '["1","2"]'::jsonb, '{"1":"Rahul","2":"website redesign"}'::jsonb),
  ('lead_followup', 'LEAD_FOLLOW_UP', 'en', 'Hi {{1}}, just checking in on your interest in {{2}}. Reply if you would like to continue.', 'Techantum', '["1","2"]'::jsonb, '{"1":"Priya","2":"CRM setup"}'::jsonb),
  ('service_notification', 'SERVICE_NOTIFICATION', 'en', 'Hi {{1}}, {{2}} is scheduled for {{3}}.', 'Techantum', '["1","2","3"]'::jsonb, '{"1":"Asha","2":"maintenance","3":"tonight 11 PM"}'::jsonb),
  ('feedback_request', 'FEEDBACK', 'en', 'Hi {{1}}, how was your experience with {{2}}? Reply with a rating from 1 to 5.', 'Techantum', '["1","2"]'::jsonb, '{"1":"Rahul","2":"onboarding"}'::jsonb),
  ('event_registration', 'EVENT_REGISTRATION', 'en', 'Hi {{1}}, you are registered for {{2}} on {{3}}.', 'Techantum', '["1","2","3"]'::jsonb, '{"1":"Priya","2":"Product webinar","3":"28 Sep 4 PM"}'::jsonb),
  ('delivery_update', 'DELIVERY_UPDATE', 'en', 'Hi {{1}}, shipment {{2}} is {{3}}. Expected {{4}}.', 'Techantum', '["1","2","3","4"]'::jsonb, '{"1":"Rahul","2":"TRK-441","3":"out for delivery","4":"today 6 PM"}'::jsonb)
) AS v(name, category, language, body, footer, variables_json, examples_json)
WHERE NOT EXISTS (SELECT 1 FROM public.wa_template_library LIMIT 1);

-- RLS: no public access. Service-role APIs only. Client portal also uses the admin client after tenant checks.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'wa_clients','wa_client_users','wa_business_accounts','wa_phone_numbers','wa_phone_quality_history',
    'wa_templates','wa_template_versions','wa_template_reviews','wa_template_library','wa_contacts',
    'wa_conversations','wa_messages','wa_message_status_history','wa_campaigns','wa_campaign_recipients',
    'wa_automations','wa_automation_runs','wa_flows','wa_webhook_events','wa_api_logs','wa_alerts',
    'wa_alert_notes','wa_integrations','wa_integration_credentials','wa_billing_accounts','wa_usage_records',
    'wa_support_tickets','wa_support_comments','wa_audit_logs','wa_sync_jobs','wa_onboarding_sessions',
    'wa_onboarding_events','wa_notifications','wa_daily_message_stats','wa_conversation_notes'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
