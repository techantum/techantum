import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { OPS_PROJECT_STATUSES, OPS_TICKET_STATUSES, OPS_TICKET_TYPES, OPS_PROJECT_TYPES, packagesByProjectType } from '@/lib/ops/config';
import { todayISO } from '@/lib/ops/working-days';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  return NextResponse.json({
    projectTypes: OPS_PROJECT_TYPES,
    packagesByType: packagesByProjectType(),
    projectStatuses: OPS_PROJECT_STATUSES,
    ticketStatuses: OPS_TICKET_STATUSES,
    ticketTypes: OPS_TICKET_TYPES,
    today: todayISO(),
    currency: 'INR',
  });
}
