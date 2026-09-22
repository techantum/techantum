export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export const SUPER_ADMIN_ONLY_NAV_GROUPS = ['whatsapp-provider', 'whatsapp-ai', 'recruitment', 'partners'] as const;

export const SUPER_ADMIN_ONLY_PATH_PREFIXES = [
  '/admin/wa-provider',
  '/admin/whatsapp',
  '/admin/ai',
  '/admin/recruitment',
  '/admin/partners',
  '/admin/partner-catalog',
  '/admin/partner-requirements',
];

export const SUPER_ADMIN_ONLY_API_PREFIXES = [
  '/api/admin/wa-provider',
  '/api/admin/whatsapp',
  '/api/admin/ai',
  '/api/admin/recruitment',
  '/api/admin/partners',
  '/api/admin/partner-catalog',
  '/api/admin/partner-requirements',
];

export function isSuperAdmin(role?: string | null): boolean {
  return role === 'SUPER_ADMIN';
}

export function canAccessAdminPath(role: string | null | undefined, pathname: string) {
  if (isSuperAdmin(role)) return true;
  return !SUPER_ADMIN_ONLY_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function filterNavGroups<T extends { id: string }>(groups: T[], role: string | null | undefined) {
  if (isSuperAdmin(role)) return groups;
  return groups.filter((group) => !SUPER_ADMIN_ONLY_NAV_GROUPS.includes(group.id as (typeof SUPER_ADMIN_ONLY_NAV_GROUPS)[number]));
}
