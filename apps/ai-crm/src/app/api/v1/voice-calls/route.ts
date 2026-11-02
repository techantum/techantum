import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { scheduleCall } from '@/lib/voice';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const { rows } = await query(
    `SELECT v.*, l.full_name, l.phone FROM crm.voice_calls v
     JOIN crm.leads l ON l.id=v.lead_id
     WHERE v.workspace_id=$1
     ORDER BY v.created_at DESC LIMIT 100`,
    [session.workspaceId],
  );
  return ok(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_manager')) return forbidden();
  try {
    const body = await req.json();
    if (!body.leadId) return fail('leadId required');
    const call = await scheduleCall(session.workspaceId, body.leadId, { requestedBy: session.id });
    return created({ call });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Schedule failed', 500);
  }
}
