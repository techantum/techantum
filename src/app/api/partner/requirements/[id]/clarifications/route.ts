import { NextResponse } from 'next/server';
import { requirePartner } from '@/lib/partner/auth';
import { listClarifications, replyToClarification } from '@/lib/partner/clarifications';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const { data: req } = await createAdminClient()
    .from('partner_requirements')
    .select('id')
    .eq('id', id)
    .eq('partner_id', auth.partner.id)
    .maybeSingle();

  if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const clarifications = await listClarifications(id);
  return NextResponse.json(clarifications);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const message = String(body.message || '').trim();

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    await replyToClarification(
      id,
      message,
      auth.partner.id,
      auth.partnerUser.id,
      auth.partnerUser.full_name
    );
    const clarifications = await listClarifications(id);
    return NextResponse.json(clarifications);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send reply' },
      { status: 400 }
    );
  }
}
