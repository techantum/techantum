import { NextResponse } from 'next/server';
import { applyWhatsAppStatusUpdate } from '@/lib/ops/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
  if (mode === 'subscribe' && expected && token === expected && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

type StatusRow = {
  id?: string;
  status?: string;
  errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[];
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    entry?: {
      changes?: {
        value?: { statuses?: StatusRow[] };
      }[];
    }[];
  } | null;

  const statuses =
    payload?.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.statuses || []) || []) || [];

  for (const row of statuses) {
    if (!row.id || !row.status) continue;
    const firstError = row.errors?.[0];
    const errorMessage = [firstError?.title, firstError?.message, firstError?.error_data?.details]
      .filter(Boolean)
      .join(' — ') || null;
    await applyWhatsAppStatusUpdate({
      provider_message_id: row.id,
      status: row.status,
      error_message: errorMessage,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
