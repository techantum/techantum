-- Partner Portal: partners, users, invites, requirements scaffold

-- ─── Partners ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    partner_type TEXT NOT NULL DEFAULT 'sales'
        CHECK (partner_type IN ('sales', 'marketing', 'business_development')),
    tier TEXT NOT NULL DEFAULT 'silver'
        CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended', 'archived')),
    country TEXT,
    notes TEXT,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners(email);

-- ─── Partner Users (links auth.users → partners) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'partner_user'
        CHECK (role IN ('partner_admin', 'partner_user')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'suspended')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_users_partner ON public.partner_users(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_users_user ON public.partner_users(user_id);

-- ─── Partner Invites (password setup onboarding) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    partner_user_id UUID NOT NULL REFERENCES public.partner_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_invites_token ON public.partner_invites(token) WHERE used_at IS NULL;

-- ─── Activity Logs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    partner_user_id UUID REFERENCES public.partner_users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_activity_partner ON public.partner_activity_logs(partner_id, created_at DESC);

-- ─── Service Categories (CMS-driven packages) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.partner_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.partner_service_categories(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    best_for TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_highlighted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(category_id, slug)
);

CREATE TABLE IF NOT EXISTS public.partner_package_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.partner_packages(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    feature_label TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '—',
    display_order INT DEFAULT 0,
    UNIQUE(package_id, feature_key)
);

-- ─── Question Templates (CMS-driven questionnaires) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_question_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.partner_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.partner_question_templates(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    label TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'text'
        CHECK (question_type IN (
            'text', 'textarea', 'number', 'date', 'dropdown',
            'radio', 'checkbox', 'multi_select'
        )),
    options JSONB DEFAULT '[]',
    placeholder TEXT,
    help_text TEXT,
    default_value TEXT,
    is_required BOOLEAN DEFAULT false,
    display_order INT DEFAULT 0,
    wizard_step INT DEFAULT 1,
    validation_rules JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, question_key)
);

CREATE TABLE IF NOT EXISTS public.partner_question_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.partner_questions(id) ON DELETE CASCADE,
    depends_on_question_key TEXT NOT NULL,
    operator TEXT NOT NULL DEFAULT 'equals'
        CHECK (operator IN ('equals', 'not_equals', 'contains', 'in')),
    expected_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Requirement Submissions ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id TEXT NOT NULL UNIQUE,
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    partner_user_id UUID NOT NULL REFERENCES public.partner_users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'submitted', 'under_review', 'need_clarification',
            'proposal_sent', 'approved', 'rejected', 'won', 'lost', 'archived'
        )),
    project_name TEXT,
    service_category_id UUID REFERENCES public.partner_service_categories(id),
    package_id UUID REFERENCES public.partner_packages(id),
    industry TEXT,
    country TEXT,
    budget_range TEXT,
    timeline TEXT,
    priority TEXT,
    business_data JSONB DEFAULT '{}',
    project_data JSONB DEFAULT '{}',
    modules_data JSONB DEFAULT '[]',
    features_data JSONB DEFAULT '[]',
    partner_notes TEXT,
    internal_notes TEXT,
    ai_summary JSONB,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_partner_requirements_partner ON public.partner_requirements(partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_requirements_status ON public.partner_requirements(status);
CREATE INDEX IF NOT EXISTS idx_partner_requirements_ref ON public.partner_requirements(reference_id);

CREATE TABLE IF NOT EXISTS public.partner_requirement_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.partner_requirements(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    answer_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requirement_id, question_key)
);

CREATE TABLE IF NOT EXISTS public.partner_generated_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.partner_requirements(id) ON DELETE CASCADE,
    prompt_text TEXT NOT NULL,
    questionnaire_json JSONB NOT NULL DEFAULT '{}',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.partner_generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.partner_requirements(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL DEFAULT 'sow'
        CHECK (doc_type IN ('sow', 'summary', 'prompt')),
    format TEXT NOT NULL DEFAULT 'markdown'
        CHECK (format IN ('markdown', 'html', 'pdf', 'docx')),
    content TEXT,
    file_url TEXT,
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.partner_requirement_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID NOT NULL REFERENCES public.partner_requirements(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.partner_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    requirement_id UUID REFERENCES public.partner_requirements(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Partner code sequence ──────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS partner_code_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_partner_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    seq_val INT;
BEGIN
    seq_val := nextval('partner_code_seq');
    RETURN 'PART-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD(seq_val::TEXT, 5, '0');
END;
$$;

-- ─── updated_at triggers ────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS partners_updated_at ON public.partners;
CREATE TRIGGER partners_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

DROP TRIGGER IF EXISTS partner_users_updated_at ON public.partner_users;
CREATE TRIGGER partner_users_updated_at
BEFORE UPDATE ON public.partner_users
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

DROP TRIGGER IF EXISTS partner_requirements_updated_at ON public.partner_requirements;
CREATE TRIGGER partner_requirements_updated_at
BEFORE UPDATE ON public.partner_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_cms_timestamp();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_question_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_question_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requirement_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_generated_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requirement_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_email_logs ENABLE ROW LEVEL SECURITY;

-- Admin full access (matches existing admin_users pattern)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'partners', 'partner_users', 'partner_invites', 'partner_activity_logs',
        'partner_service_categories', 'partner_packages', 'partner_package_features',
        'partner_question_templates', 'partner_questions', 'partner_question_conditions',
        'partner_requirements', 'partner_requirement_answers', 'partner_generated_prompts',
        'partner_generated_documents', 'partner_requirement_status_history', 'partner_email_logs'
    ] LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON public.%I', tbl, tbl);
        EXECUTE format(
            'CREATE POLICY %I_admin_all ON public.%I FOR ALL USING (
                EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
            )',
            tbl, tbl
        );
    END LOOP;
END $$;

-- Partners read own org data
CREATE POLICY partners_self_read ON public.partners
    FOR SELECT USING (
        id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active')
    );

CREATE POLICY partner_users_self_read ON public.partner_users
    FOR SELECT USING (user_id = auth.uid());

-- Partners read/write own requirements
CREATE POLICY partner_requirements_own ON public.partner_requirements
    FOR ALL USING (
        partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active')
    );

CREATE POLICY partner_requirement_answers_own ON public.partner_requirement_answers
    FOR ALL USING (
        requirement_id IN (
            SELECT id FROM public.partner_requirements
            WHERE partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active')
        )
    );

-- Public read for active packages (partner portal)
CREATE POLICY partner_service_categories_public_read ON public.partner_service_categories
    FOR SELECT USING (is_active = true);

CREATE POLICY partner_packages_public_read ON public.partner_packages
    FOR SELECT USING (is_active = true);

CREATE POLICY partner_package_features_public_read ON public.partner_package_features
    FOR SELECT USING (true);

CREATE POLICY partner_question_templates_public_read ON public.partner_question_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY partner_questions_public_read ON public.partner_questions
    FOR SELECT USING (true);

CREATE POLICY partner_question_conditions_public_read ON public.partner_question_conditions
    FOR SELECT USING (true);

-- Activity logs: partners read own
CREATE POLICY partner_activity_logs_own_read ON public.partner_activity_logs
    FOR SELECT USING (
        partner_id IN (SELECT partner_id FROM public.partner_users WHERE user_id = auth.uid() AND status = 'active')
    );
