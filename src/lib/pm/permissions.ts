export const PM_PERMISSIONS = [
  'project.dashboard.view',
  'project.create',
  'project.view',
  'project.edit',
  'project.archive',
  'project.daily_update.add',
  'project.daily_update.edit',
  'project.manager_remarks.edit',
  'project.onboarding.manage',
  'project.team.manage',
  'project.team.view',
  'project.daily.view',
  'project.daily.manage',
  'project.onboarding.view',
  'project.ticket.view',
  'project.ticket.create',
  'project.ticket.assign',
  'project.ticket.update',
  'project.ticket.close',
  'project.requirement.view',
  'project.requirement.create',
  'project.requirement.update',
  'project.requirement.approve',
  'project.report.view',
  'project.report.export',
  'process.dashboard.view',
  'process.asset.view',
  'process.asset.manage',
  'process.access.view',
  'process.access.manage',
  'process.access.approve',
  'process.server.view',
  'process.server.manage',
  'process.supplier.view',
  'process.supplier.manage',
  'process.software.view',
  'process.software.manage',
  'process.backup.view',
  'process.backup.manage',
  'process.incident.view',
  'process.incident.manage',
  'process.vulnerability.view',
  'process.vulnerability.manage',
  'process.training.view',
  'process.training.manage',
  'process.joiner_leaver.view',
  'process.joiner_leaver.manage',
  'process.change.view',
  'process.change.manage',
  'process.change.approve',
  'process.risk.view',
  'process.risk.manage',
  'process.corrective_action.view',
  'process.corrective_action.manage',
  'process.corrective_action.verify',
  'process.control.view',
  'process.control.manage',
  'process.report.export',
] as const;

export type PmPermission = (typeof PM_PERMISSIONS)[number];

const ROLE_GRANTS: Record<string, PmPermission[] | '*'> = {
  SUPER_ADMIN: '*',
};

export function grantedPermissions(role?: string | null): PmPermission[] {
  const grant = ROLE_GRANTS[role || ''];
  if (grant === '*') return [...PM_PERMISSIONS];
  return grant || [];
}

export function hasPmPermission(role: string | null | undefined, key: PmPermission): boolean {
  return grantedPermissions(role).includes(key);
}
