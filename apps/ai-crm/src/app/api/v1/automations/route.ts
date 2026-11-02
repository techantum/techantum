import { getSession, hasMinRole } from '@/lib/auth';
import { query } from '@/lib/db';
import { created, fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const workflows = await query(
    `SELECT * FROM crm.workflows WHERE workspace_id=$1 ORDER BY created_at DESC`,
    [session.workspaceId],
  );
  const executions = await query(
    `SELECT * FROM crm.workflow_executions WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 50`,
    [session.workspaceId],
  );
  return ok({ workflows: workflows.rows, executions: executions.rows });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  try {
    const body = await req.json();
    if (!body.name || !body.triggerType) return fail('name and triggerType required');
    const { rows } = await query(
      `INSERT INTO crm.workflows (workspace_id, name, trigger_type, definition, status)
       VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING *`,
      [
        session.workspaceId,
        body.name,
        body.triggerType,
        JSON.stringify(body.definition || { steps: [] }),
        body.status || 'published',
      ],
    );
    return created({ workflow: rows[0] });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Create failed', 500);
  }
}
