import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listAuditLogs } from '@/lib/admin/rbac';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAdmin({ feature: 'audit-logs', level: 'READ' });
  if ('error' in auth && auth.error) return auth.error;
  return NextResponse.json({ logs: await listAuditLogs() });
}
