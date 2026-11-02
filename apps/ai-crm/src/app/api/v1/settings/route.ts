import { getSession, hasMinRole } from '@/lib/auth';
import { getWorkspace, getWorkspaceSettings, updateWorkspaceSettings } from '@/lib/settings';
import { fail, forbidden, ok, unauthorized } from '@/lib/http';

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  const [workspace, settings] = await Promise.all([
    getWorkspace(session.workspaceId),
    getWorkspaceSettings(session.workspaceId),
  ]);
  return ok({ workspace, settings });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  try {
    const body = await req.json();
    const settings = await updateWorkspaceSettings(session.workspaceId, body);
    return ok({ settings });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Update failed', 500);
  }
}
