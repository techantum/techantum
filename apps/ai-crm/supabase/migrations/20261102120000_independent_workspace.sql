-- Give the bootstrap workspace an independent product identity.

UPDATE crm.workspaces
SET name = 'AI Lead CRM',
    slug = 'ai-crm'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE crm.workspace_settings
SET business_name = 'AI Lead CRM',
    updated_at = NOW()
WHERE workspace_id = '11111111-1111-1111-1111-111111111111';

UPDATE crm.users
SET email = 'admin@aicrm.local',
    full_name = 'Workspace Admin',
    updated_at = NOW()
WHERE id = '22222222-2222-2222-2222-222222222222';

ALTER TABLE crm.workspace_settings
  ALTER COLUMN business_name SET DEFAULT 'AI Lead CRM';
