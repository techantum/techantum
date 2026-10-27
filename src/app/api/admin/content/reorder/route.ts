import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { invalidateCmsRuntimeCache } from '@/lib/cms';

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const body = await request.json();
  const orders = Array.isArray(body.orders) ? body.orders : [];
  const supabase = createAdminClient();
  for (const item of orders) {
    const entryKey = String(item.entry_key || '');
    if (!entryKey) continue;
    await supabase
      .from('cms_content')
      .update({ sort_order: Number(item.sort_order) || 0 })
      .eq('entry_key', entryKey);
  }
  invalidateCmsRuntimeCache();
  return NextResponse.json({ ok: true });
}
