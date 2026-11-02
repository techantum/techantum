import { query } from '@/lib/db';
import { handleIvrWebhook } from '@/lib/telephony-ivr';
import { fail, ok } from '@/lib/http';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ws = await query(`SELECT id FROM crm.workspaces ORDER BY created_at ASC LIMIT 1`);
    if (!ws.rows[0]) return fail('No workspace', 500);
    const result = await handleIvrWebhook(ws.rows[0].id, body);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Telephony webhook failed', 500);
  }
}
