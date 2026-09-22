import { NextResponse } from 'next/server';
import { ingestWebhook, verifyProviderWebhook } from '@/lib/whatsapp-provider/services/webhooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = verifyProviderWebhook(url.searchParams.get('hub.mode'), url.searchParams.get('hub.verify_token'), url.searchParams.get('hub.challenge'));
  if (challenge) return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await ingestWebhook(rawBody, request.headers.get('x-hub-signature-256'));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true, duplicate: Boolean(result.duplicate) });
}
