import { NextResponse } from 'next/server';
import { requirePartner } from '@/lib/partner/auth';
import {
  getRequirement,
  getRequirementAnswers,
  getRequirementDocuments,
  saveRequirementDraft,
  submitRequirement,
  duplicateRequirement,
} from '@/lib/partner/requirements';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const requirement = await getRequirement(id, auth.partner.id);
  if (!requirement) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [answers, documents, history] = await Promise.all([
    getRequirementAnswers(id),
    getRequirementDocuments(id),
    createAdminClient()
      .from('partner_generated_prompts')
      .select('*')
      .eq('requirement_id', id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  return NextResponse.json({
    requirement,
    answers: Object.fromEntries(answers.map((a) => [a.question_key, a.answer_value])),
    documents,
    prompt: history.data?.[0] ?? null,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();

  try {
    if (body.action === 'submit') {
      const submitted = await submitRequirement(id, auth.partner.id, auth.partnerUser.id);
      return NextResponse.json(submitted);
    }

    if (body.action === 'duplicate') {
      const dup = await duplicateRequirement(id, auth.partner.id, auth.partnerUser.id);
      return NextResponse.json(dup);
    }

    const requirement = await saveRequirementDraft({
      id,
      partnerId: auth.partner.id,
      partnerUserId: auth.partnerUser.id,
      ...body,
    });
    return NextResponse.json(requirement);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}
