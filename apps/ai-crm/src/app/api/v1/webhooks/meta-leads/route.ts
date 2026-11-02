import { createHmac, timingSafeEqual } from 'node:crypto';
import { ingestLead, parseMetaLead } from '@/lib/ingest';
import { query } from '@/lib/db';
import { fail, ok } from '@/lib/http';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.CRM_WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected) {
    return new Response(challenge || '', { status: 200 });
  }
  return fail('Verification failed', 403);
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const secret = process.env.CRM_META_APP_SECRET || process.env.META_APP_SECRET;
    const sig = req.headers.get('x-hub-signature-256');
    if (secret && sig) {
      const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) return fail('Invalid signature', 401);
    }

    const body = JSON.parse(raw);
    const parsed = parseMetaLead(body);
    const ws = await query(`SELECT id FROM crm.workspaces ORDER BY created_at ASC LIMIT 1`);
    if (!ws.rows[0]) return fail('No workspace', 500);
    const result = await ingestLead({
      workspaceId: ws.rows[0].id,
      source: 'meta_leads',
      ...parsed,
      consentStatus: 'granted',
      raw: body,
      eventKey: parsed.externalSourceLeadId || undefined,
    });
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Webhook failed', 500);
  }
}
