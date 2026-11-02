import { getSession, hasMinRole } from '@/lib/auth';
import { purgeExpired } from '@/lib/retention';
import { forbidden, ok, unauthorized } from '@/lib/http';

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const result = await purgeExpired(session.workspaceId);
  return ok(result);
}
