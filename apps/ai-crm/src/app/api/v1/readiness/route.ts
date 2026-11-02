import { getSession, hasMinRole } from '@/lib/auth';
import { readinessReport } from '@/lib/readiness';
import { getWorkspaceSettings, updateWorkspaceSettings } from '@/lib/settings';
import { forbidden, ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  return ok(await readinessReport(session.workspaceId));
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const body = await req.json();
  const current = await getWorkspaceSettings(session.workspaceId);
  await updateWorkspaceSettings(session.workspaceId, {
    retentionPolicy: body.retentionPolicy || current.retention_policy,
    opsProfile: { ...(current.ops_profile || {}), ...(body.opsProfile || {}) },
    callingPolicy: body.callingPolicy || current.calling_policy,
  });
  return ok(await readinessReport(session.workspaceId));
}
