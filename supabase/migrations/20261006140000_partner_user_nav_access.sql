-- Partner admins can enable/disable left-nav access for each team member.

ALTER TABLE public.partner_users
  ADD COLUMN IF NOT EXISTS nav_access JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.partner_users.nav_access IS
  'Map of partner portal nav keys to booleans. Empty object means default access (all menus except Team). Partner admins always have full access.';

NOTIFY pgrst, 'reload schema';
