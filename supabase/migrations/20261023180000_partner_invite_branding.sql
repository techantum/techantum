-- Partner brand color for white-label emails, and hashed invitation tokens.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS primary_color TEXT;

ALTER TABLE public.partner_invites
  ADD COLUMN IF NOT EXISTS token_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_invites_token_hash
  ON public.partner_invites(token_hash)
  WHERE token_hash IS NOT NULL;

COMMENT ON COLUMN public.partners.primary_color IS 'Optional #RRGGBB color used on partner-branded emails.';
COMMENT ON COLUMN public.partner_invites.token_hash IS 'SHA-256 of the invitation secret. New invites do not store the raw token.';
