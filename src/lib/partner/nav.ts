import type { Partner, PartnerUser, PartnerUserRole } from './types';

export const PARTNER_NAV_ITEMS = [
  { key: 'dashboard', href: '/partner/dashboard', label: 'Dashboard', icon: 'Squares2X2Icon' },
  {
    key: 'lead-discovery',
    href: '/partner/lead-discovery',
    label: 'Lead Discovery',
    icon: 'MagnifyingGlassCircleIcon',
    requiresLeadDiscovery: true,
  },
  { key: 'packages', href: '/partner/packages', label: 'Service Packages', icon: 'CubeIcon' },
  { key: 'new-requirement', href: '/partner/requirements/new', label: 'New Requirement', icon: 'PlusCircleIcon' },
  { key: 'requirements', href: '/partner/requirements', label: 'My Requirements', icon: 'ClipboardDocumentListIcon' },
  { key: 'documents', href: '/partner/documents', label: 'Documents', icon: 'DocumentTextIcon' },
  { key: 'team', href: '/partner/team', label: 'Team', icon: 'UsersIcon' },
  { key: 'support', href: '/partner/support', label: 'Partner Support', icon: 'LifebuoyIcon' },
] as const;

export type PartnerNavKey = (typeof PARTNER_NAV_ITEMS)[number]['key'];
export type PartnerNavAccess = Record<PartnerNavKey, boolean>;

const ALWAYS_ALLOWED_PREFIXES = ['/partner/profile', '/partner/notifications', '/partner/login'];

export function defaultPartnerNavAccess(role: PartnerUserRole): PartnerNavAccess {
  const access = {} as PartnerNavAccess;
  for (const item of PARTNER_NAV_ITEMS) {
    access[item.key] = role === 'partner_admin' ? true : item.key !== 'team';
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
    if (typeof raw[item.key] === 'boolean') {
      result[item.key] = raw[item.key];
    }
  }
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
  const allowed = PARTNER_NAV_ITEMS.find((item) => partnerHasNavAccess(partnerUser, item.key, partner));
  return allowed?.href ?? '/partner/profile';
}

export function visiblePartnerNavItems(
  partnerUser: Pick<PartnerUser, 'role' | 'nav_access'>,
  partner?: Pick<Partner, 'lead_discovery_enabled'> | null
) {
  return PARTNER_NAV_ITEMS.filter((item) => partnerHasNavAccess(partnerUser, item.key, partner));
}
