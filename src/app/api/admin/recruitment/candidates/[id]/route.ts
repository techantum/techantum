import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: candidate, error } = await supabase
    .from('recruitment_candidates')
    .select('*, recruitment_job_roles(*)')
    .eq('id', id)
    .maybeSingle();
  if (error || !candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: assessments } = await supabase
    .from('recruitment_assessments')
    .select('*')
    .eq('candidate_id', id)
    .order('created_at', { ascending: false });

  const { data: history } = await supabase
    .from('recruitment_candidate_status_history')
    .select('*')
    .eq('candidate_id', id)
    .order('created_at', { ascending: false });

  let latestAreas = [];
  const latest = assessments?.[0];
  if (latest?.area_results) latestAreas = latest.area_results;

  return NextResponse.json({ candidate, assessments: assessments || [], history: history || [], areaResults: latestAreas });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const supabase = createAdminClient();

  const { data: existing } = await supabase.from('recruitment_candidates').select('status').eq('id', id).maybeSingle();
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const update: Record<string, unknown> = {
    name: body.name,
    email: body.email,
    phone: body.phone,
    location: body.location,
    current_ctc: body.current_ctc,
    expected_ctc: body.expected_ctc,
    notice_period: body.notice_period,
    hr_comments: body.hr_comments,
    manual_screening_score: body.manual_screening_score,
    final_score: body.final_score,
    updated_by: auth.user.id,
  };

  if (body.status && body.status !== existing.status) {
    update.status = body.status;
    const { recordStatusChange } = await import('@/lib/recruitment/service');
    await recordStatusChange(id, existing.status, String(body.status), auth.user.id, String(body.status_comment || ''));
  }

  const { data, error } = await supabase.from('recruitment_candidates').update(update).eq('id', id).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
