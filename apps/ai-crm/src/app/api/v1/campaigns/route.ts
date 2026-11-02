import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { telephonyConfig } from '@/lib/telephony-ivr';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const { rows } = await query(
    `SELECT * FROM crm.call_campaigns WHERE workspace_id=$1 ORDER BY created_at DESC`,
    [session.workspaceId],
  );
  return ok({ campaigns: rows, telephony: telephonyConfig() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_manager')) return forbidden();
  try {
    const body = await req.json();
    if (!body.name) return fail('name required');
    const { rows } = await query(
      `INSERT INTO crm.call_campaigns
        (workspace_id, name, status, concurrency_limit, daily_cap, retry_max, retry_interval_hours, languages, filters)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb) RETURNING *`,
      [
        session.workspaceId,
        body.name,
        body.status || 'active',
        body.concurrencyLimit || telephonyConfig().maxConcurrency || 5,
        body.dailyCap || 200,
        body.retryMax || 2,
        body.retryIntervalHours || 4,
        body.languages || ['en', 'hi'],
        JSON.stringify(body.filters || {}),
      ],
    );
    return created({ campaign: rows[0] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
