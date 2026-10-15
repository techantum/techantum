-- Keep a single super admin. Extra super admins become developer admins (ADMIN).

WITH ranked AS (
  SELECT user_id, row_number() OVER (ORDER BY created_at, user_id) AS n
  FROM public.admin_users
  WHERE role = 'SUPER_ADMIN'
)
UPDATE public.admin_users AS admin
SET role = 'ADMIN'
FROM ranked
WHERE admin.user_id = ranked.user_id
  AND ranked.n > 1;

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_one_super_admin
  ON public.admin_users ((true))
  WHERE role = 'SUPER_ADMIN';
