-- Owner Google login for Maps / GBP analytics (refresh token stored encrypted).

CREATE TABLE IF NOT EXISTS public.gbp_oauth_connections (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  client_id TEXT,
  encrypted_client_secret TEXT,
  encrypted_refresh_token TEXT,
  google_email TEXT,
  location_id TEXT,
  location_title TEXT,
  account_name TEXT,
  maps_uri TEXT,
  connected_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID
);

INSERT INTO public.gbp_oauth_connections (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.gbp_oauth_connections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.gbp_oauth_connections FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.gbp_oauth_connections TO service_role;

DROP TRIGGER IF EXISTS gbp_oauth_connections_updated_at ON public.gbp_oauth_connections;
CREATE TRIGGER gbp_oauth_connections_updated_at
  BEFORE UPDATE ON public.gbp_oauth_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
