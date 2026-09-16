import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateWeightages } from '@/lib/recruitment/scoring';
import { DEFAULT_THRESHOLDS } from '@/lib/recruitment/config';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('recruitment_job_roles').select('*').order('updated_at', { ascending: false });
  if (error) {
    const missing = /does not exist|schema cache/i.test(error.message);
    return NextResponse.json(
      {
        error: missing
          ? 'Recruitment tables are missing. Apply supabase/migrations/20260916120000_recruitment_ai_screening.sql and 20260916123000_recruitment_bdm_template.sql in Supabase, then reload.'
          : error.message,
      },
      { status: 500 },
    );
  }
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const body = (await request.json()) as Record<string, unknown> & { areas?: Record<string, unknown>[] };
  const supabase = createAdminClient();

  const areas = Array.isArray(body.areas) ? body.areas : [];
  if (body.status === 'ACTIVE' && areas.length > 0) {
    const check = validateWeightages(areas as { weightage: number; status?: string }[]);
    if (!check.valid) {
      return NextResponse.json({ error: `Assessment weightage must total 100% (currently ${check.sum}%).` }, { status: 400 });
    }
  }

  const { data: codeRow } = await supabase.rpc('recruitment_next_role_code');
  const roleCode = typeof codeRow === 'string' ? codeRow : null;

  const { data: role, error } = await supabase
    .from('recruitment_job_roles')
    .insert({
      role_code: roleCode,
      title: String(body.title || '').trim(),
      department: String(body.department || '').trim(),
      experience_required: body.experience_required || null,
      employment_type: body.employment_type || 'Full-time',
      work_location: body.work_location || null,
      job_description: body.job_description || null,
      key_responsibilities: body.key_responsibilities || null,
      required_skills: body.required_skills || null,
      preferred_skills: body.preferred_skills || null,
      minimum_qualification: body.minimum_qualification || null,
      minimum_screening_score: Number(body.minimum_screening_score ?? 70),
      score_thresholds: body.score_thresholds || DEFAULT_THRESHOLDS,
      status: body.status || 'DRAFT',
      created_by: auth.user.id,
      updated_by: auth.user.id,
    })
    .select('*')
    .single();

  if (error || !role) return NextResponse.json({ error: error?.message || 'Create failed' }, { status: 500 });

  if (areas.length > 0) {
    const rows = areas.map((a, index) => ({
      job_role_id: role.id,
      name: String(a.name || '').trim(),
      description: String(a.description || '').trim(),
      weightage: Number(a.weightage || 0),
      rating_scale_max: Number(a.rating_scale_max || 5),
      mandatory: Boolean(a.mandatory),
      minimum_required_score: a.minimum_required_score != null ? Number(a.minimum_required_score) : null,
      ai_instructions: a.ai_instructions || null,
      display_order: Number(a.display_order ?? index),
      status: a.status || 'ACTIVE',
    }));
    await supabase.from('recruitment_assessment_areas').insert(rows);
  }

  return NextResponse.json(role);
}
