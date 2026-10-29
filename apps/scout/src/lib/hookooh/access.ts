import { isPlatformAdmin, isSuperAdmin, isSubscriberAdmin, isSubscriberUser } from '@/lib/admin/roles';

export function canUseHookooh(role?: string | null) {
  return isSuperAdmin(role) || isPlatformAdmin(role) || isSubscriberAdmin(role) || isSubscriberUser(role);
}

export function canManageHookoohKnowledge(role?: string | null) {
  return isSuperAdmin(role) || isSubscriberAdmin(role);
}

export function canManageHookoohSettings(role?: string | null) {
  return isSuperAdmin(role);
}
