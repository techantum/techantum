CREATE TABLE IF NOT EXISTS public.saas_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sidebar_label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Squares2X2Icon',
  route TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  limit_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saas_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  description_html TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'CubeIcon',
  highlight BOOLEAN NOT NULL DEFAULT FALSE,
  seats INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.saas_package_features (
  package_id UUID NOT NULL REFERENCES public.saas_packages(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.saas_features(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, feature_id)
);

CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.saas_accounts(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.saas_packages(id),
  price_monthly INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing', 'active', 'pending_downgrade', 'canceled', 'expired')),
  current_period_end TIMESTAMPTZ,
  pending_package_id UUID REFERENCES public.saas_packages(id),
  pending_change_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS saas_subscriptions_one_current
  ON public.saas_subscriptions (account_id)
  WHERE status IN ('trialing', 'active', 'pending_downgrade');

CREATE TABLE IF NOT EXISTS public.saas_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.saas_subscriptions(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES public.saas_accounts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_package_id UUID REFERENCES public.saas_packages(id),
  to_package_id UUID REFERENCES public.saas_packages(id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.saas_accounts
  ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES public.saas_packages(id),
  ADD COLUMN IF NOT EXISTS contracted_price_monthly INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

INSERT INTO public.saas_features (feature_key, name, sidebar_label, description, icon, route, sort_order)
VALUES
  ('youtube_research', 'YouTube Research', 'YouTube Research', 'Research channels, videos, and competitors', 'PlayCircleIcon', '/youtube', 10),
  ('lead_discovery', 'Lead Discovery', 'Lead Discovery', 'Discover businesses and manage leads', 'MapPinIcon', '/leads', 20),
  ('team_management', 'Team', 'Team', 'Invite users and manage workspace access', 'UsersIcon', '/team', 30)
ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  sidebar_label = EXCLUDED.sidebar_label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO public.saas_packages (slug, name, price_monthly, price_yearly, billing_cycle, status, description_html, icon, highlight, seats, sort_order)
VALUES
  (
    'starter',
    'Starter',
    999,
    9990,
    'monthly',
    'active',
    '<ul><li>Start your competitor research journey with essential insights.</li></ul>',
    'RocketLaunchIcon',
    FALSE,
    1,
    10
  ),
  (
    'growth',
    'Growth',
    2499,
    24990,
    'monthly',
    'active',
    '<ul><li>Everything you need to find opportunities and grow faster.</li><li>Collaborate with your team.</li></ul>',
    'ChartBarIcon',
    TRUE,
    5,
    20
  ),
  (
    'business',
    'Business',
    4999,
    49990,
    'monthly',
    'active',
    '<ul><li>Advanced tools and team collaboration for serious growth.</li></ul>',
    'SparklesIcon',
    FALSE,
    20,
    30
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  description_html = EXCLUDED.description_html,
  icon = EXCLUDED.icon,
  highlight = EXCLUDED.highlight,
  seats = EXCLUDED.seats,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO public.saas_package_features (package_id, feature_id)
SELECT p.id, f.id
FROM public.saas_packages p
JOIN public.saas_features f ON (
  (p.slug = 'starter' AND f.feature_key = 'youtube_research')
  OR (p.slug IN ('growth', 'business') AND f.feature_key IN ('youtube_research', 'lead_discovery', 'team_management'))
)
ON CONFLICT DO NOTHING;

UPDATE public.saas_accounts a
SET package_id = p.id,
    contracted_price_monthly = COALESCE(a.contracted_price_monthly, p.price_monthly),
    plan = p.slug
FROM public.saas_packages p
WHERE a.package_id IS NULL
  AND p.slug = CASE a.plan WHEN 'scale' THEN 'business' ELSE a.plan END;

INSERT INTO public.saas_subscriptions (account_id, package_id, price_monthly, billing_cycle, status, current_period_end)
SELECT a.id, a.package_id, COALESCE(a.contracted_price_monthly, p.price_monthly), 'monthly',
       CASE WHEN a.status = 'trialing' THEN 'trialing' WHEN a.status = 'canceled' THEN 'canceled' ELSE 'active' END,
       a.current_period_end
FROM public.saas_accounts a
JOIN public.saas_packages p ON p.id = a.package_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.saas_subscriptions s WHERE s.account_id = a.id AND s.status IN ('trialing', 'active', 'pending_downgrade')
)
AND a.package_id IS NOT NULL;
