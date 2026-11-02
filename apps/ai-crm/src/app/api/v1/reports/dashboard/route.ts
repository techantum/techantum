import { getSession } from '@/lib/auth';
import { dashboardMetrics } from '@/lib/reports';
import { ok, unauthorized } from '@/lib/http';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  const days = Number(new URL(req.url).searchParams.get('days') || 30);
  const metrics = await dashboardMetrics(session.workspaceId, days);
  return ok(metrics);
}
