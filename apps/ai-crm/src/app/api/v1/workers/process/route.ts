import { getSession, hasMinRole } from '@/lib/auth';
import { processOnce } from '@/lib/worker-runner';
import { forbidden, ok, unauthorized } from '@/lib/http';

export async function POST() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!hasMinRole(session, 'business_admin')) return forbidden();
  const results = await processOnce(20);
  return ok({ processed: results.length, results });
}
