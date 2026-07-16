import { NextResponse } from 'next/server';
import { requirePartner } from '@/lib/partner/auth';
import { getRequirementDocuments } from '@/lib/partner/requirements';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const { id: requirementId } = await params;

  const { data: req } = await createAdminClient()
    .from('partner_requirements')
    .select('id')
    .eq('id', requirementId)
    .eq('partner_id', auth.partner.id)
    .maybeSingle();

  if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const documents = await getRequirementDocuments(requirementId);
  return NextResponse.json(documents);
}
