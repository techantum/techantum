-- Expand pipeline to match CRM UI mockup stages (idempotent).
INSERT INTO crm.pipeline_stages (workspace_id, code, label, sort_order, is_won, is_lost)
SELECT w.id, s.code, s.label, s.sort_order, s.is_won, s.is_lost
FROM crm.workspaces w
CROSS JOIN (
  VALUES
    ('NEW', 'New Lead', 10, false, false),
    ('CONTACT_INITIATED', 'Contact Initiated', 20, false, false),
    ('CUSTOMER_RESPONDED', 'Customer Responded', 30, false, false),
    ('AI_QUALIFYING', 'AI Qualifying', 40, false, false),
    ('QUALIFIED', 'Qualified', 50, false, false),
    ('AI_CALL_COMPLETED', 'AI Call Completed', 60, false, false),
    ('SALES_FOLLOWUP', 'Sales Follow-up', 70, false, false),
    ('PROPOSAL', 'Proposal / Negotiation', 80, false, false),
    ('CONVERTED', 'Won', 90, true, false),
    ('LOST', 'Lost', 100, false, true)
) AS s(code, label, sort_order, is_won, is_lost)
WHERE w.slug = 'ai-crm'
ON CONFLICT (workspace_id, code) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;
