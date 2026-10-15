import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { listMasterItems } from '@/lib/admin/master-data';
import { OPS_PROJECT_STATUSES, OPS_TICKET_STATUSES, OPS_TICKET_TYPES, OPS_PROJECT_TYPES, packagesByProjectType, packagesForProjectType } from '@/lib/ops/config';
import { todayISO } from '@/lib/ops/working-days';

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth && auth.error) return auth.error;
  const [types, packages, statuses, ticketStatuses, ticketTypes] = await Promise.all([
    listMasterItems('project_type', true).catch(() => []),
    listMasterItems('project_package', true).catch(() => []),
    listMasterItems('ops_project_status', true).catch(() => []),
    listMasterItems('ticket_status', true).catch(() => []),
    listMasterItems('ticket_type', true).catch(() => []),
  ]);
  const projectTypes = types.length ? types.map((item) => item.label) : [...OPS_PROJECT_TYPES];
  const packagesByType = packagesByProjectType();
  for (const type of projectTypes) {
    const extra = packages.filter((item) => item.parent_key === type).map((item) => item.label);
    const current = packagesByType[type] || packagesForProjectType(type);
    packagesByType[type] = [...new Set([...current, ...extra])];
  }
  return NextResponse.json({
    projectTypes,
    packagesByType,
    projectStatuses: statuses.length ? statuses.map((item) => item.item_key) : OPS_PROJECT_STATUSES,
    ticketStatuses: ticketStatuses.length ? ticketStatuses.map((item) => item.item_key) : OPS_TICKET_STATUSES,
    ticketTypes: ticketTypes.length ? ticketTypes.map((item) => item.item_key) : OPS_TICKET_TYPES,
    today: todayISO(),
    currency: 'INR',
  });
}
