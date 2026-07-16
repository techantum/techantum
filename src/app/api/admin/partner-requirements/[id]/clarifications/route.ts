import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listClarifications, requestClarification, sendAdminChatMessage } from '@/lib/partner/clarifications';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const clarifications = await listClarifications(id);
  return NextResponse.json(clarifications);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const message = String(body.message || '').trim();

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  try {
    const mode = body.mode === 'clarification' ? 'clarification' : 'chat';
    if (mode === 'clarification') {
      await requestClarification(id, message, auth.user.id);
    } else {
      await sendAdminChatMessage(id, message, auth.user.id);
    }
    const clarifications = await listClarifications(id);
    return NextResponse.json(clarifications);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to request clarification' },
      { status: 400 }
    );
  }
}
