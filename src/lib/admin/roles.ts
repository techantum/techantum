export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export const SUPER_ADMIN_ONLY_NAV_GROUPS = [
  'recruitment',
  'sales',
  'hr',
  'account',
  'project-management',
  'website-audit',
  'youtube-research-settings',
  'rbac',
] as const;

export const SUPER_ADMIN_ONLY_PATH_PREFIXES = [
  '/admin/recruitment',
  '/admin/lead-discovery',
  '/admin/hr',
  '/admin/pm',
  '/admin/website-audit',
  '/admin/profile',
  '/admin/youtube-research/settings',
  '/admin/users',
  '/admin/roles',
  '/admin/audit-logs',
];

export const SUPER_ADMIN_ONLY_API_PREFIXES = [
  '/api/admin/recruitment',
  '/api/admin/lead-discovery',
  '/api/admin/developer-admins',
  '/api/admin/profile',
  '/api/admin/hr',
  '/api/admin/pm',
  '/api/admin/website-audit',
  '/api/admin/rbac',
];

export function isSuperAdmin(role?: string | null | { role?: string | null; isSuperAdmin?: boolean }): boolean {
  if (role && typeof role === 'object') return role.isSuperAdmin === true || role.role === 'SUPER_ADMIN';
  return role === 'SUPER_ADMIN';
}

/** Super Admin now. Finance Admin / Accountant can be granted later without changing route maps. */
export function canAccessFinance(role?: string | null): boolean {
  return role === 'SUPER_ADMIN' || role === 'FINANCE_ADMIN' || role === 'ACCOUNTANT';
}

export function canAccessAdminPath(role: string | null | undefined, pathname: string) {
  if (pathname === '/admin/finance' || pathname.startsWith('/admin/finance/')) {
    return canAccessFinance(role);
  }
  if (isSuperAdmin(role)) return true;
  return !SUPER_ADMIN_ONLY_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isSuperAdminOnlyNavGroup(id: string) {
  return (
    SUPER_ADMIN_ONLY_NAV_GROUPS.includes(id as (typeof SUPER_ADMIN_ONLY_NAV_GROUPS)[number]) ||
    id === 'rbac' ||
    id.startsWith('rbac-')
  );
}

export function filterNavGroups<T extends { id: string }>(groups: T[], role: string | null | undefined) {
  const allowed = isSuperAdmin(role)
    ? groups
    : groups.filter((group) => !isSuperAdminOnlyNavGroup(group.id));
  if (canAccessFinance(role)) return allowed;
  return allowed.filter((group) => group.id !== 'finance');
}
