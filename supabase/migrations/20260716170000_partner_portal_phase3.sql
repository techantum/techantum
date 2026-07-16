-- Partner Portal Phase 3: OTP login, proposals, team support

-- ─── Login OTP verification ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_login_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_user_id UUID NOT NULL REFERENCES public.partner_users(id) ON DELETE CASCADE,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_login_otps_user ON public.partner_login_otps(partner_user_id, created_at DESC);

ALTER TABLE public.partner_users
    ADD COLUMN IF NOT EXISTS last_otp_verified_at TIMESTAMPTZ;

-- ─── Proposal workflow fields ─────────────────────────────────────────────────

ALTER TABLE public.partner_requirements
    ADD COLUMN IF NOT EXISTS proposal_summary TEXT,
    ADD COLUMN IF NOT EXISTS proposal_amount TEXT,
    ADD COLUMN IF NOT EXISTS proposal_timeline TEXT,
    ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ;

-- Allow multiple partner users per partner (team members)
-- partner_users already supports this; ensure email unique per partner user row only
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_users_email ON public.partner_users(email);
