CREATE TABLE IF NOT EXISTS public.revealeo_site_branding (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'revealeo',
  tagline TEXT NOT NULL DEFAULT 'Uncover your competitors’ marketing secrets',
  logo_url TEXT,
  footer_logo_url TEXT,
  favicon_url TEXT,
  og_image_url TEXT,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  phone_href TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  facebook_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  youtube_url TEXT NOT NULL DEFAULT '',
  twitter_url TEXT NOT NULL DEFAULT '',
  footer_description TEXT NOT NULL DEFAULT 'Turn public data into actionable insights. Uncover your competitors’ secrets and grow faster.',
  copyright_text TEXT NOT NULL DEFAULT 'Revealeo. All rights reserved.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.revealeo_site_branding (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.revealeo_cms_content (
  entry_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
