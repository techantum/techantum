import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRoleWithAreas } from '@/lib/recruitment/service';
import { validateWeightages } from '@/lib/recruitment/scoring';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  try {
    const { id } = await params;
    const detail = await getRoleWithAreas(id);
    return NextResponse.json(detail);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Not found' }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown> & { areas?: Record<string, unknown>[] };
  const supabase = createAdminClient();

  const areas = Array.isArray(body.areas) ? body.areas : null;
  if (body.status === 'ACTIVE' && areas) {
    const check = validateWeightages(areas as { weightage: number; status?: string }[]);
    if (!check.valid) {
      return NextResponse.json({ error: `Assessment weightage must total 100% (currently ${check.sum}%).` }, { status: 400 });
    }
  }

  const { data: role, error } = await supabase
    .from('recruitment_job_roles')
    .update({
      title: body.title,
      department: body.department,
      experience_required: body.experience_required,
      employment_type: body.employment_type,
      work_location: body.work_location,
      job_description: body.job_description,
      key_responsibilities: body.key_responsibilities,
      required_skills: body.required_skills,
      preferred_skills: body.preferred_skills,
      minimum_qualification: body.minimum_qualification,
      minimum_screening_score: body.minimum_screening_score,
      score_thresholds: body.score_thresholds,
      status: body.status,
      updated_by: auth.user.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (areas) {
    await supabase.from('recruitment_assessment_areas').delete().eq('job_role_id', id);
    if (areas.length > 0) {
      const rows = areas.map((a, index) => ({
        job_role_id: id,
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
  }

  return NextResponse.json(role);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('recruitment_job_roles').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
