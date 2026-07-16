import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getRequirement,
  getRequirementAnswers,
  getRequirementDocuments,
  updateRequirementStatus,
  regenerateSow,
  sendRequirementProposal,
} from '@/lib/partner/requirements';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const requirement = await getRequirement(id);
  if (!requirement) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [answers, documents, prompts, history] = await Promise.all([
    getRequirementAnswers(id),
    getRequirementDocuments(id),
    createAdminClient().from('partner_generated_prompts').select('*').eq('requirement_id', id),
    createAdminClient().from('partner_requirement_status_history').select('*').eq('requirement_id', id).order('created_at'),
  ]);

  return NextResponse.json({
    requirement,
    answers: Object.fromEntries(answers.map((a) => [a.question_key, a.answer_value])),
    documents: documents,
    prompts: prompts.data ?? [],
    statusHistory: history.data ?? [],
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  if (body.status) {
    await updateRequirementStatus(id, body.status, body.note, auth.user.id);
  }

  if (body.internal_notes !== undefined) {
    await supabase
      .from('partner_requirements')
      .update({ internal_notes: body.internal_notes })
      .eq('id', id);
  }

  const requirement = await getRequirement(id);
  return NextResponse.json(requirement);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    if (body.action === 'send_proposal') {
      const requirement = await sendRequirementProposal(
        id,
        {
          proposalSummary: String(body.proposalSummary || ''),
          proposalAmount: String(body.proposalAmount || ''),
          proposalTimeline: String(body.proposalTimeline || ''),
        },
        auth.user.id
      );
      return NextResponse.json(requirement);
    }

    const result = await regenerateSow(id, auth.user.id);
    const documents = await getRequirementDocuments(id);
    return NextResponse.json({ ...result, documents });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 400 }
    );
  }
}
