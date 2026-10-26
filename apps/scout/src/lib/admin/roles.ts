export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';
export type SubscriberRole = 'subscriber_admin' | 'subscriber_user';
export type PlatformRole = AdminRole | SubscriberRole | 'owner' | 'member';

export function isSuperAdmin(role?: string | null): boolean {
  return role === 'SUPER_ADMIN';
}

export function isSubscriberAdmin(role?: string | null): boolean {
  return role === 'subscriber_admin' || role === 'owner';
}

export function isSubscriberUser(role?: string | null): boolean {
  return role === 'subscriber_user' || role === 'member';
}

export function normalizeSubscriberRole(role?: string | null): SubscriberRole {
  return isSubscriberAdmin(role) ? 'subscriber_admin' : 'subscriber_user';
}

export function canManageBilling(role?: string | null): boolean {
  return isSubscriberAdmin(role);
}

export function canManageTeam(role?: string | null): boolean {
  return isSubscriberAdmin(role) || isSuperAdmin(role);
}

export function roleLabel(role?: string | null): string {
  if (isSuperAdmin(role)) return 'Super Admin';
  if (isSubscriberAdmin(role)) return 'Subscriber Admin';
  if (isSubscriberUser(role)) return 'Subscriber User';
  return role || 'User';
}
