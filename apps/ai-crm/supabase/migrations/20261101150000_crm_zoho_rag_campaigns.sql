-- Zoho sync, campaigns, RAG chunks, document verification details

CREATE TABLE IF NOT EXISTS crm.zoho_connections (
  workspace_id UUID PRIMARY KEY REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  client_id TEXT,
  client_secret_ref TEXT,
  refresh_token_ref TEXT,
  api_domain TEXT DEFAULT 'https://www.zohoapis.in',
  accounts_domain TEXT DEFAULT 'https://accounts.zoho.in',
  status TEXT NOT NULL DEFAULT 'not_connected',
  field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.zoho_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.call_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  agent_id UUID REFERENCES crm.ai_agents(id) ON DELETE SET NULL,
  concurrency_limit INT NOT NULL DEFAULT 5,
  daily_cap INT NOT NULL DEFAULT 200,
  retry_max INT NOT NULL DEFAULT 2,
  retry_interval_hours INT NOT NULL DEFAULT 4,
  languages TEXT[] NOT NULL DEFAULT ARRAY['en','hi'],
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  document_id UUID REFERENCES crm.knowledge_documents(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES crm.ai_agents(id) ON DELETE SET NULL,
  chunk_index INT NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding JSONB,
  token_estimate INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_knowledge_chunks_workspace_idx
  ON crm.knowledge_chunks (workspace_id, agent_id);

ALTER TABLE crm.documents
  ADD COLUMN IF NOT EXISTS verification JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS zoho_id TEXT;
ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS document_status TEXT DEFAULT 'none';

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_zoho_uidx
  ON crm.leads (workspace_id, zoho_id)
  WHERE zoho_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS crm.cost_assumptions (
  workspace_id UUID PRIMARY KEY REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  assumptions JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO crm.cost_assumptions (workspace_id, assumptions)
SELECT id, '{
  "voiceBlendedPerMin": 2.5,
  "whatsappMarketing": 0.78,
  "whatsappUtility": 0.115,
  "ocrPerPage": 1.5,
  "storagePerGb": 2.5,
  "platformMonthly": 75000,
  "maxConcurrency": 5,
  "avgCallMinutes": 3.5
}'::jsonb
FROM crm.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO crm.zoho_connections (workspace_id, status)
SELECT id, 'not_connected' FROM crm.workspaces
ON CONFLICT (workspace_id) DO NOTHING;
