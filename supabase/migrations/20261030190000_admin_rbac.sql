-- Admin RBAC: roles, feature access, invitations, audit. Extends admin_users.

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_status_chk'
  ) THEN
    ALTER TABLE public.admin_users
      ADD CONSTRAINT admin_users_status_chk CHECK (status IN ('invited', 'active', 'inactive', 'suspended'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code),
  UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key TEXT NOT NULL UNIQUE,
  module TEXT NOT NULL,
  feature TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  action TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS admin_permissions_feature_idx ON public.admin_permissions (feature_key);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('NONE', 'READ', 'FULL')),
  PRIMARY KEY (role_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
  user_id UUID NOT NULL REFERENCES public.admin_users(user_id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.admin_users(user_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by UUID,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS admin_invitations_email_idx ON public.admin_invitations (lower(email));
CREATE INDEX IF NOT EXISTS admin_invitations_user_idx ON public.admin_invitations (user_id);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_role_id UUID,
  target_email TEXT,
  previous_value JSONB,
  new_value JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_logs_created_idx ON public.admin_audit_logs (created_at DESC);

INSERT INTO public.admin_roles (name, code, description, is_system, status)
VALUES
  ('Super Admin', 'SUPER_ADMIN', 'Unrestricted access to every module, user, and role.', TRUE, 'active'),
  ('Viewer', 'VIEWER', 'Read-only access to assigned modules.', FALSE, 'active'),
  ('Project Manager', 'PROJECT_MANAGER', 'Full access to Project Management.', FALSE, 'active'),
  ('HR Admin', 'HR_ADMIN', 'Full access to HR.', FALSE, 'active'),
  ('Finance Admin', 'FINANCE_ADMIN', 'Full access to Finance.', FALSE, 'active')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_user_roles (user_id, role_id)
SELECT a.user_id, r.id
FROM public.admin_users a
JOIN public.admin_roles r ON r.code = 'SUPER_ADMIN'
WHERE a.role = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
