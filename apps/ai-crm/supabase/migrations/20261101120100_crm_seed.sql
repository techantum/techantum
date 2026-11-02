INSERT INTO crm.workspaces (id, name, slug, settings)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'AI Lead CRM',
  'ai-crm',
  '{"timezone":"Asia/Kolkata","qualification":{"instructions":"Qualify software project leads."}}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO crm.pipeline_stages (workspace_id, code, label, sort_order, is_won, is_lost)
SELECT w.id, s.code, s.label, s.sort_order, s.is_won, s.is_lost
FROM crm.workspaces w
CROSS JOIN (
  VALUES
    ('NEW', 'New Lead', 10, false, false),
    ('IN_DISCUSSION', 'In Discussion', 20, false, false),
    ('QUALIFIED', 'Qualified', 30, false, false),
    ('APPOINTMENT_BOOKED', 'Appointment Booked', 40, false, false),
    ('CONVERTED', 'Converted', 50, true, false),
    ('LOST', 'Lost', 60, false, true)
) AS s(code, label, sort_order, is_won, is_lost)
WHERE w.slug = 'ai-crm'
ON CONFLICT (workspace_id, code) DO NOTHING;

-- password: Admin@12345  (scrypt hash generated at seed time by migrate helper if missing)
INSERT INTO crm.users (id, workspace_id, email, password_hash, full_name, role, status)
SELECT
  '22222222-2222-2222-2222-222222222222',
  w.id,
  'admin@aicrm.local',
  '$scrypt$N=16384,r=8,p=1$c2FsdC1haS1jcm0tZGVtbw$ZXhhbXBsZS1wbGFjZWhvbGRlci1ub3QtdXNlZA',
  'Workspace Admin',
  'super_admin',
  'active'
FROM crm.workspaces w
WHERE w.slug = 'ai-crm'
ON CONFLICT (workspace_id, email) DO NOTHING;

INSERT INTO crm.integrations (workspace_id, provider, status, config)
SELECT w.id, p.provider, 'sandbox', '{}'::jsonb
FROM crm.workspaces w
CROSS JOIN (VALUES ('whatsapp'), ('google_ads'), ('meta_leads'), ('telephony'), ('llm')) AS p(provider)
WHERE w.slug = 'ai-crm'
ON CONFLICT (workspace_id, provider) DO NOTHING;

INSERT INTO crm.workflows (workspace_id, name, trigger_type, definition, status)
SELECT w.id,
  'New Lead WhatsApp Qualification',
  'lead.created',
  '{"steps":[{"type":"validate_consent"},{"type":"send_whatsapp_template","template":"welcome"},{"type":"wait_for_reply"},{"type":"start_ai_qualification"},{"type":"evaluate_lead"},{"type":"schedule_ai_call_if_qualified"}]}'::jsonb,
  'published'
FROM crm.workspaces w
WHERE w.slug = 'ai-crm'
AND NOT EXISTS (
  SELECT 1 FROM crm.workflows wf WHERE wf.workspace_id = w.id AND wf.name = 'New Lead WhatsApp Qualification'
);
