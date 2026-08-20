import { NextResponse } from 'next/server';
import { applyWhatsAppStatusUpdate } from '@/lib/ops/whatsapp';
import { applyWhatsAppMessageStatusUpdate, verifyWebhookSignature } from '@/lib/whatsapp/meta';
import { parseInboundMessages, parseStatusUpdates, processInboundWhatsAppMessage } from '@/lib/whatsapp/processor';
import { getWhatsAppAiConfig } from '@/lib/whatsapp/config';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const { verifyToken } = getWhatsAppAiConfig();
  const expected = verifyToken || process.env.WHATSAPP_VERIFY_TOKEN?.trim();
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
  const rawBody = await request.text();
  console.info('[whatsapp webhook] POST bytes=', rawBody.length);
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('[whatsapp webhook] invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const inboundMessages = parseInboundMessages(payload);
  console.info('[whatsapp webhook] inbound count=', inboundMessages.length);
  for (const message of inboundMessages) {
    try {
      if (!message.text && message.type === 'text') continue;
      if (message.type !== 'text' && !message.text) {
        message.text =
          "I received your attachment. Our team may need to review it. Could you briefly tell me what you'd like help with?";
      }
      await processInboundWhatsAppMessage(message);
    } catch (err) {
      console.error('[whatsapp webhook] inbound processing failed', err);
    }
  }

  const statuses = parseStatusUpdates(payload) as StatusRow[];
  for (const row of statuses) {
    if (!row.id || !row.status) continue;
    const firstError = row.errors?.[0];
    const errorMessage =
      [firstError?.title, firstError?.message, firstError?.error_data?.details].filter(Boolean).join(' — ') || null;
    await applyWhatsAppStatusUpdate({
      provider_message_id: row.id,
      status: row.status,
      error_message: errorMessage,
    }).catch(() => undefined);
    await applyWhatsAppMessageStatusUpdate({
      provider_message_id: row.id,
      status: row.status,
      error_message: errorMessage,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
