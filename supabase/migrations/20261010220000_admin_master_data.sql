CREATE TABLE IF NOT EXISTS public.admin_master_lists (
  list_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.admin_master_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_key TEXT NOT NULL REFERENCES public.admin_master_lists(list_key) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  parent_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (list_key, item_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_master_items_list ON public.admin_master_items (list_key, sort_order, label);

ALTER TABLE public.finance_invoices ADD COLUMN IF NOT EXISTS project_kind TEXT;

NOTIFY pgrst, 'reload schema';
