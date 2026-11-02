ALTER TABLE crm.leads ADD COLUMN IF NOT EXISTS calling_consent TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE crm.workspace_settings ADD COLUMN IF NOT EXISTS retention_policy JSONB NOT NULL DEFAULT '{
  "messageDays": 180,
  "recordingDays": 90,
  "documentDays": 365,
  "autoDeleteLeads": false
}'::jsonb;

ALTER TABLE crm.workspace_settings ADD COLUMN IF NOT EXISTS ops_profile JSONB NOT NULL DEFAULT '{
  "serviceOwner": "",
  "incidentContact": "",
  "alertWebhookUrl": "",
  "loadTargets": {"healthP95Ms": 800, "concurrentRequests": 20}
}'::jsonb;

CREATE TABLE IF NOT EXISTS crm.deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  lead_id UUID,
  requested_by UUID,
  status TEXT NOT NULL DEFAULT 'completed',
  scope TEXT NOT NULL DEFAULT 'lead_erasure',
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES crm.workspaces(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE crm.ai_agents
SET languages = ARRAY['en','hi','bn','ta','te','mr'],
    updated_at = NOW()
WHERE workspace_id = '11111111-1111-1111-1111-111111111111';

INSERT INTO crm.users (id, workspace_id, email, password_hash, full_name, role, status)
VALUES
  ('33333333-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','sales.manager@aicrm.local','$scrypt$N=16384,r=8,p=1$aicrm-role-seed-salt$fd552c0d73515d86e589a8a1a6303d146ed7901472c6a57aee93ba881aab6a1610d663556eec521ea1ba62c21cc64eccb082b2c3276d7f649cfd681bc2a91aa5','Sales Manager','sales_manager','active'),
  ('44444444-4444-4444-4444-444444444444','11111111-1111-1111-1111-111111111111','sales.agent@aicrm.local','$scrypt$N=16384,r=8,p=1$aicrm-role-seed-salt$fd552c0d73515d86e589a8a1a6303d146ed7901472c6a57aee93ba881aab6a1610d663556eec521ea1ba62c21cc64eccb082b2c3276d7f649cfd681bc2a91aa5','Sales Agent','sales_agent','active'),
  ('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','reviewer@aicrm.local','$scrypt$N=16384,r=8,p=1$aicrm-role-seed-salt$fd552c0d73515d86e589a8a1a6303d146ed7901472c6a57aee93ba881aab6a1610d663556eec521ea1ba62c21cc64eccb082b2c3276d7f649cfd681bc2a91aa5','Document Reviewer','document_reviewer','active')
ON CONFLICT (workspace_id, email) DO NOTHING;

INSERT INTO crm.leads (
  id, workspace_id, full_name, phone, phone_normalized, source, consent_status, calling_consent,
  qualification_status, validity_status, lead_score, whatsapp_status
)
SELECT * FROM (VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,'11111111-1111-1111-1111-111111111111'::uuid,'Sample Hot Lead','919000000001','919000000001','sample','granted','granted','hot','valid',82,'responded'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid,'11111111-1111-1111-1111-111111111111'::uuid,'Sample Warm Lead','919000000002','919000000002','sample','granted','granted','warm','valid',60,'responded'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid,'11111111-1111-1111-1111-111111111111'::uuid,'Sample Cold Lead','919000000003','919000000003','sample','granted','denied','cold','valid',40,'responded')
) AS v(id, workspace_id, full_name, phone, phone_normalized, source, consent_status, calling_consent, qualification_status, validity_status, lead_score, whatsapp_status)
WHERE NOT EXISTS (
  SELECT 1 FROM crm.leads l
  WHERE l.workspace_id = v.workspace_id AND l.phone_normalized = v.phone_normalized
);

INSERT INTO crm.knowledge_documents (id, workspace_id, agent_id, title, doc_type, content, status)
SELECT
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  w.id,
  a.id,
  'Sample qualification FAQ',
  'faq',
  E'Qualification FAQ (sample, not a customer recording).\n\nAsk for need, city, timeline, and budget.\nHot: ready to buy within 30 days and shares a budget.\nWarm: interested but timeline is beyond 30 days.\nCold: browsing only or refuses budget and timeline.\nIf the customer says STOP, end the conversation and do not call.\nDo not promise a price that is not in this document.\nSupported languages: English, Hindi, Bengali, Tamil, Telugu, Marathi.',
  'indexed'
FROM crm.workspaces w
JOIN crm.ai_agents a ON a.workspace_id = w.id
WHERE w.id = '11111111-1111-1111-1111-111111111111'
ON CONFLICT (id) DO NOTHING;
