import type { Partner, PartnerUser, PartnerUserRole } from './types';

export const PARTNER_NAV_ITEMS = [
  { key: 'dashboard', href: '/partner/dashboard', label: 'Dashboard', icon: 'Squares2X2Icon', area: 'sidebar' },
  {
    key: 'lead-discovery',
    href: '/partner/lead-discovery',
    label: 'Lead Discovery',
    icon: 'MagnifyingGlassCircleIcon',
    area: 'sidebar',
    requiresLeadDiscovery: true,
  },
  {
    key: 'youtube-research',
    href: '/partner/youtube-research',
    label: 'YouTube Research',
    icon: 'PlayCircleIcon',
    area: 'sidebar',
  },
  { key: 'packages', href: '/partner/packages', label: 'Service Packages', icon: 'CubeIcon', area: 'hidden' },
  { key: 'requirements', href: '/partner/requirements', label: 'Requirements', icon: 'ClipboardDocumentListIcon', area: 'sidebar' },
  { key: 'documents', href: '/partner/documents', label: 'Documents', icon: 'DocumentTextIcon', area: 'sidebar' },
  { key: 'team', href: '/partner/team', label: 'User management', icon: 'UsersIcon', area: 'sidebar' },
  { key: 'profile', href: '/partner/profile', label: 'Profile', icon: 'UserCircleIcon', area: 'account' },
  { key: 'support', href: '/partner/support', label: 'Partner Support', icon: 'LifebuoyIcon', area: 'account' },
] as const;

export const PARTNER_YOUTUBE_NAV = [
  { href: '/partner/youtube-research', label: 'Dashboard', exact: true },
] as const;

export type PartnerNavKey = (typeof PARTNER_NAV_ITEMS)[number]['key'];
export type PartnerNavAccess = Record<PartnerNavKey, boolean>;

const ALWAYS_ALLOWED_PREFIXES = ['/partner/profile', '/partner/notifications', '/partner/login', '/partner/support'];

export function defaultPartnerNavAccess(role: PartnerUserRole): PartnerNavAccess {
  const access = {} as PartnerNavAccess;
  for (const item of PARTNER_NAV_ITEMS) {
    if (item.area === 'account') {
      access[item.key] = true;
      continue;
    }
    if (role === 'partner_admin') {
      access[item.key] = true;
      continue;
    }
    access[item.key] = item.key !== 'team' && item.key !== 'youtube-research';
  }
  return access;
}

export function sanitizePartnerNavAccess(input: unknown, role: PartnerUserRole): PartnerNavAccess {
  const defaults = defaultPartnerNavAccess(role);
  if (role === 'partner_admin') return defaults;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return defaults;

  const raw = input as Record<string, unknown>;
  const result = { ...defaults };
  for (const item of PARTNER_NAV_ITEMS) {
    if (item.area === 'account') continue;
    if (typeof raw[item.key] === 'boolean') {
      result[item.key] = raw[item.key];
    }
  }
  if (raw['new-requirement'] === true) result.requirements = true;
  result.profile = true;
  result.support = true;
  return result;
}

export function normalizePartnerNavAccess(
  role: PartnerUserRole,
  stored?: Record<string, boolean> | null
): PartnerNavAccess {
  return sanitizePartnerNavAccess(stored, role);
}

export function partnerHasNavAccess(
  partnerUser: Pick<PartnerUser, 'role' | 'nav_access'>,
  key: PartnerNavKey,
  partner?: Pick<Partner, 'lead_discovery_enabled'> | null
): boolean {
  const access = normalizePartnerNavAccess(partnerUser.role, partnerUser.nav_access);
  if (key === 'lead-discovery' && !partner?.lead_discovery_enabled) return false;
  return access[key] === true;
}

export function canManagePartnerTeam(partnerUser: Pick<PartnerUser, 'role' | 'nav_access'>): boolean {
  if (partnerUser.role === 'partner_admin') return true;
  return partnerHasNavAccess(partnerUser, 'team');
}

export function partnerNavKeyForPath(pathname: string): PartnerNavKey | null {
  const path = pathname.split('?')[0];
  const matches = PARTNER_NAV_ITEMS.filter(
    (item) => path === item.href || path.startsWith(`${item.href}/`)
  ).sort((a, b) => b.href.length - a.href.length);
  return matches[0]?.key ?? null;
}

export function isPartnerPathAlwaysAllowed(pathname: string): boolean {
  const path = pathname.split('?')[0];
  if (path === '/partner' || path === '/partner/') return true;
  return ALWAYS_ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function firstAllowedPartnerHref(
  partnerUser: Pick<PartnerUser, 'role' | 'nav_access'>,
  partner?: Pick<Partner, 'lead_discovery_enabled'> | null
): string {
  const allowed = PARTNER_NAV_ITEMS.find(
    (item) => item.area === 'sidebar' && partnerHasNavAccess(partnerUser, item.key, partner)
  );
  return allowed?.href ?? '/partner/profile';
}

export function visiblePartnerNavItems(
  partnerUser: Pick<PartnerUser, 'role' | 'nav_access'>,
  partner?: Pick<Partner, 'lead_discovery_enabled'> | null
) {
  return PARTNER_NAV_ITEMS.filter(
    (item) => item.area === 'sidebar' && partnerHasNavAccess(partnerUser, item.key, partner)
  );
}
