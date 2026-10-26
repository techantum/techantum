CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_role_chk CHECK (role IN ('SUPER_ADMIN', 'ADMIN'))
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'admin_users_one_super_admin'
  ) THEN
    CREATE UNIQUE INDEX admin_users_one_super_admin
      ON public.admin_users ((true))
      WHERE role = 'SUPER_ADMIN';
  END IF;
END $$;

UPDATE public.saas_memberships
SET role = 'subscriber_admin'
WHERE role IN ('owner', 'admin');

UPDATE public.saas_memberships
SET role = 'subscriber_user'
WHERE role IN ('member', 'user');

ALTER TABLE public.saas_memberships
  DROP CONSTRAINT IF EXISTS saas_memberships_role_chk;

ALTER TABLE public.saas_memberships
  ADD CONSTRAINT saas_memberships_role_chk
  CHECK (role IN ('subscriber_admin', 'subscriber_user', 'owner', 'member'));
