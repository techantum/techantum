-- Workspace settings, AI agents, knowledge docs, source sync logs (crm schema only).

CREATE TABLE IF NOT EXISTS crm.workspace_settings (
  workspace_id UUID PRIMARY KEY REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL DEFAULT 'AI Lead CRM',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency TEXT NOT NULL DEFAULT 'INR',
  calling_policy JSONB NOT NULL DEFAULT '{
    "allowedHours":"09:00-19:00",
    "days":"Mon-Sat",
    "maxConcurrency":5,
    "maxRetries":2,
    "retryIntervalHours":4,
    "maxDurationMinutes":6
  }'::jsonb,
  qualification_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_type TEXT NOT NULL DEFAULT 'whatsapp_qualification',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  description TEXT,
  instructions TEXT NOT NULL DEFAULT '',
  languages TEXT[] NOT NULL DEFAULT ARRAY['en'],
  scoring_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  voice_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'published',
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_ai_agents_workspace_channel_uidx
  ON crm.ai_agents (workspace_id, channel)
  WHERE status <> 'archived';

CREATE TABLE IF NOT EXISTS crm.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES crm.ai_agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'faq',
  content TEXT NOT NULL DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'indexed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.agent_test_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES crm.ai_agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO crm.workspace_settings (workspace_id, business_name)
SELECT id, name FROM crm.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

INSERT INTO crm.ai_agents (workspace_id, name, agent_type, channel, description, instructions, languages, scoring_rules, status)
SELECT
  w.id,
  'Lead Qualification Agent',
  'whatsapp_qualification',
  'whatsapp',
  'Qualify inbound leads after customer response.',
  'You are the business sales assistant. Qualify only after the customer replies. Ask about need, timeline, budget and location. Respect STOP/opt-out immediately. Do not invent facts. Escalate uncertain cases to a human.',
  ARRAY['en','hi'],
  '[{"signal":"timeline","rule":"within 30 days","score":15},{"signal":"budget","rule":"numeric budget","score":10},{"signal":"intent","rule":"ready/quote","score":20}]'::jsonb,
  'published'
FROM crm.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM crm.ai_agents a WHERE a.workspace_id = w.id AND a.channel = 'whatsapp' AND a.status <> 'archived'
);

-- Ensure integrations rows exist for all known sources
INSERT INTO crm.integrations (workspace_id, provider, status, config)
SELECT w.id, p.provider, 'configured', '{}'::jsonb
FROM crm.workspaces w
CROSS JOIN (
  VALUES
    ('google_ads'),
    ('meta_leads'),
    ('website'),
    ('whatsapp'),
    ('csv'),
    ('webhook'),
    ('api'),
    ('manual'),
    ('llm'),
    ('telephony'),
    ('ingest_api')
) AS p(provider)
ON CONFLICT (workspace_id, provider) DO NOTHING;
