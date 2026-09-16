import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const url = new URL(request.url);
  const ids = (url.searchParams.get('ids') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length < 2) return NextResponse.json({ error: 'Provide at least two candidate ids' }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('recruitment_candidates')
    .select('id, name, overall_fit_percent, final_score, total_experience, relevant_experience, status, recruitment_job_roles(title)')
    .in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}
