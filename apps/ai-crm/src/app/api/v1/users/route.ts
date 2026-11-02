import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/crypto';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';
import { writeAudit } from '@/lib/audit';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'sales_manager')) return forbidden();
  const { rows } = await query(
    `SELECT id, email, full_name, role, status, last_login_at, created_at
     FROM crm.users WHERE workspace_id=$1 ORDER BY created_at ASC`,
    [session.workspaceId],
  );
  return ok(rows);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  try {
    const body = await req.json();
    if (!body.email || !body.fullName || !body.role || !body.password) {
      return fail('email, fullName, role, password required');
    }
    const { rows } = await query(
      `INSERT INTO crm.users (workspace_id, email, password_hash, full_name, role, status)
       VALUES ($1,$2,$3,$4,$5,'active') RETURNING id, email, full_name, role, status`,
      [session.workspaceId, String(body.email).toLowerCase(), hashPassword(String(body.password)), body.fullName, body.role],
    );
    await writeAudit({
      workspaceId: session.workspaceId,
      actorUserId: session.id,
      action: 'user.created',
      targetType: 'user',
      targetId: rows[0].id,
      newValue: { email: rows[0].email, role: rows[0].role },
    });
    return created({ user: rows[0] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
