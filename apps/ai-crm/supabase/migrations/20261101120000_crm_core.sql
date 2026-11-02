-- AI Lead CRM schema. Isolated from other application tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS crm.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin','business_admin','sales_manager','sales_agent','document_reviewer')),
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, email)
);

CREATE TABLE IF NOT EXISTS crm.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (workspace_id, code)
);

CREATE TABLE IF NOT EXISTS crm.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  lead_code TEXT,
  full_name TEXT,
  phone TEXT,
  phone_normalized TEXT,
  email TEXT,
  email_normalized TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  campaign TEXT,
  external_source_lead_id TEXT,
  custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  assigned_user_id UUID REFERENCES crm.users(id) ON DELETE SET NULL,
  validity_status TEXT NOT NULL DEFAULT 'needs_review',
  qualification_status TEXT NOT NULL DEFAULT 'unqualified',
  lead_score INT NOT NULL DEFAULT 0,
  pipeline_stage_id UUID REFERENCES crm.pipeline_stages(id) ON DELETE SET NULL,
  whatsapp_status TEXT NOT NULL DEFAULT 'none',
  ai_calling_status TEXT NOT NULL DEFAULT 'none',
  consent_status TEXT NOT NULL DEFAULT 'unknown',
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  last_engagement_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_external_uidx
  ON crm.leads (workspace_id, source, external_source_lead_id)
  WHERE external_source_lead_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_phone_uidx
  ON crm.leads (workspace_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';

CREATE INDEX IF NOT EXISTS crm_leads_workspace_idx ON crm.leads (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS crm_leads_stage_idx ON crm.leads (workspace_id, pipeline_stage_id);

CREATE TABLE IF NOT EXISTS crm.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES crm.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  summary TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'open',
  mode TEXT NOT NULL DEFAULT 'AI',
  qualification JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES crm.conversations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  provider_message_id TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_messages_provider_uidx
  ON crm.messages (workspace_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm.voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'scheduled',
  provider TEXT NOT NULL DEFAULT 'sandbox',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  disposition TEXT,
  summary TEXT,
  transcript TEXT,
  recording_url TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES crm.workflows(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm.leads(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running',
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS crm.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES crm.leads(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES crm.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES crm.leads(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  storage_path TEXT,
  ocr_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sandbox',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, provider)
);

CREATE TABLE IF NOT EXISTS crm.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  event_key TEXT,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_webhook_events_uidx
  ON crm.webhook_events (provider, event_key)
  WHERE event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES crm.workspaces(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES crm.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  previous_value JSONB,
  new_value JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
