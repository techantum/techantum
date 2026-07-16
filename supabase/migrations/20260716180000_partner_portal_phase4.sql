-- Partner Portal Phase 4: notifications, clarifications, RLS hardening

-- ─── In-app notifications ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    partner_user_id UUID REFERENCES public.partner_users(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES public.partner_requirements(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL DEFAULT 'general'
        CHECK (notification_type IN (
            'status_change', 'clarification', 'proposal', 'requirement_submitted', 'general'
        )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_notifications_partner ON public.partner_notifications(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_notifications_unread ON public.partner_notifications(partner_id) WHERE read_at IS NULL;

-- ─── Requirement clarification thread ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_requirement_clarifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.partner_requirements(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('admin', 'partner')),
    author_id UUID,
    author_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_clarifications_req ON public.partner_requirement_clarifications(requirement_id, created_at);

-- ─── RLS: new tables ────────────────────────────────────────────────────────

ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requirement_clarifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_login_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partner_notifications_admin_all ON public.partner_notifications;
CREATE POLICY partner_notifications_admin_all ON public.partner_notifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS partner_notifications_own ON public.partner_notifications;
CREATE POLICY partner_notifications_own ON public.partner_notifications
    FOR ALL USING (
        partner_id IN (
            SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active'
        )
        AND (partner_user_id IS NULL OR partner_user_id IN (
            SELECT id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active'
        ))
    );

DROP POLICY IF EXISTS partner_clarifications_admin_all ON public.partner_requirement_clarifications;
CREATE POLICY partner_clarifications_admin_all ON public.partner_requirement_clarifications
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS partner_clarifications_own ON public.partner_requirement_clarifications;
CREATE POLICY partner_clarifications_own ON public.partner_requirement_clarifications
    FOR ALL USING (
        requirement_id IN (
            SELECT id FROM public.partner_requirements
            WHERE partner_id IN (
                SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

DROP POLICY IF EXISTS partner_login_otps_admin_all ON public.partner_login_otps;
CREATE POLICY partner_login_otps_admin_all ON public.partner_login_otps
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    );

-- ─── RLS: partner read access for documents & status history ────────────────

DROP POLICY IF EXISTS partner_generated_documents_own_read ON public.partner_generated_documents;
CREATE POLICY partner_generated_documents_own_read ON public.partner_generated_documents
    FOR SELECT USING (
        requirement_id IN (
            SELECT id FROM public.partner_requirements
            WHERE partner_id IN (
                SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

DROP POLICY IF EXISTS partner_status_history_own_read ON public.partner_requirement_status_history;
CREATE POLICY partner_status_history_own_read ON public.partner_requirement_status_history
    FOR SELECT USING (
        requirement_id IN (
            SELECT id FROM public.partner_requirements
            WHERE partner_id IN (
                SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );

DROP POLICY IF EXISTS partner_generated_prompts_own_read ON public.partner_generated_prompts;
CREATE POLICY partner_generated_prompts_own_read ON public.partner_generated_prompts
    FOR SELECT USING (
        requirement_id IN (
            SELECT id FROM public.partner_requirements
            WHERE partner_id IN (
                SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active'
            )
        )
    );
