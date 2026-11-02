import { ingestLead, parseGoogleLeadForm } from '@/lib/ingest';
import { query } from '@/lib/db';
import { fail, ok } from '@/lib/http';

export async function POST(req: Request) {
  try {
    const key = req.headers.get('x-goog-channel-token') || new URL(req.url).searchParams.get('key');
    const expected = process.env.CRM_GOOGLE_LEAD_WEBHOOK_KEY;
    if (expected && key !== expected) return fail('Invalid webhook key', 401);

    const body = await req.json();
    const parsed = parseGoogleLeadForm(body);
    const ws = await query(`SELECT id FROM crm.workspaces ORDER BY created_at ASC LIMIT 1`);
    if (!ws.rows[0]) return fail('No workspace', 500);

    const result = await ingestLead({
      workspaceId: ws.rows[0].id,
      source: 'google_ads',
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
