export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export const SUPER_ADMIN_ONLY_NAV_GROUPS = ['whatsapp-provider', 'whatsapp-ai', 'recruitment', 'partners', 'meta-ads'] as const;

export const SUPER_ADMIN_ONLY_PATH_PREFIXES = [
  '/admin/wa-provider',
  '/admin/whatsapp',
  '/admin/ai',
  '/admin/recruitment',
  '/admin/partners',
  '/admin/partner-catalog',
  '/admin/partner-requirements',
  '/admin/meta-ads',
];

export const SUPER_ADMIN_ONLY_API_PREFIXES = [
  '/api/admin/wa-provider',
  '/api/admin/whatsapp',
  '/api/admin/ai',
  '/api/admin/recruitment',
  '/api/admin/partners',
  '/api/admin/partner-catalog',
  '/api/admin/partner-requirements',
  '/api/admin/meta-ads',
];

export function isSuperAdmin(role?: string | null): boolean {
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

export function filterNavGroups<T extends { id: string }>(groups: T[], role: string | null | undefined) {
  const allowed = isSuperAdmin(role)
    ? groups
    : groups.filter((group) => !SUPER_ADMIN_ONLY_NAV_GROUPS.includes(group.id as (typeof SUPER_ADMIN_ONLY_NAV_GROUPS)[number]));
  if (canAccessFinance(role)) return allowed;
  return allowed.filter((group) => group.id !== 'finance');
}
