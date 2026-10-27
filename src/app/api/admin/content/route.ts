import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergeCmsEntries } from '@/lib/cms/merge-entries';
import { seedMissingCmsEntries } from '@/lib/cms';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  await seedMissingCmsEntries().catch((err) => console.error('Auto-seed failed:', err));

  const supabase = createAdminClient();
  let { data, error } = await supabase
    .from('cms_content')
    .select('entry_key, entry_group, label, content, updated_at, is_enabled, sort_order')
    .order('entry_key');
  if (error && /is_enabled|sort_order/i.test(error.message)) {
    ({ data } = await supabase.from('cms_content').select('entry_key, entry_group, label, content, updated_at').order('entry_key'));
  }

  return NextResponse.json(mergeCmsEntries(data));
}
