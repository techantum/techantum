import { NextResponse } from 'next/server';
import { runWhatsAppFollowups } from '@/lib/whatsapp/followup';

function authorized(request: Request): boolean {
  const secret = process.env.WHATSAPP_CRON_SECRET || process.env.CRON_SECRET || '';
  const header = request.headers.get('authorization') || '';
  if (secret) return header === `Bearer ${secret}`;
  const host = request.headers.get('host') || '';
  return host.startsWith('127.0.0.1') || host.startsWith('localhost');
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runWhatsAppFollowups();
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
