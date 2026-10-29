import { isPlatformAdmin, isSuperAdmin, isSubscriberAdmin, isSubscriberUser, type PlatformRole } from '@/lib/admin/roles';

export type AuthPortal = 'superadmin' | 'admin' | 'subscriber' | 'user';

export const AUTH_PORTALS: Record<AuthPortal, {
  login: string;
  home: string;
  label: string;
  hint: string;
  staff: boolean;
}> = {
  superadmin: {
    login: '/superadmin/login',
    home: '/superadmin',
    label: 'Super Admin',
    hint: 'Sign in to the Super Admin console.',
    staff: true,
  },
  admin: {
    login: '/admin/login',
    home: '/admin',
    label: 'Platform Admin',
    hint: 'Sign in to the Platform Admin console.',
    staff: true,
  },
  subscriber: {
    login: '/subscriber/login',
    home: '/subscriber',
    label: 'Subscriber Admin',
    hint: 'Sign in to manage your workspace.',
    staff: false,
  },
  user: {
    login: '/user/login',
    home: '/user',
    label: 'Subscriber User',
    hint: 'Sign in to your workspace as a team member.',
    staff: false,
  },
};

export function portalForRole(role?: string | null): AuthPortal {
  if (isSuperAdmin(role)) return 'superadmin';
  if (isPlatformAdmin(role)) return 'admin';
  if (isSubscriberAdmin(role)) return 'subscriber';
  return 'user';
}

export function loginPathForRole(role?: string | null) {
  return AUTH_PORTALS[portalForRole(role)].login;
}

export function homePathForRole(role?: string | null) {
  return AUTH_PORTALS[portalForRole(role)].home;
}

export function loginPathFromPathname(pathname: string) {
  if (pathname.startsWith('/superadmin')) return AUTH_PORTALS.superadmin.login;
  if (pathname.startsWith('/admin')) return AUTH_PORTALS.admin.login;
  if (pathname.startsWith('/user')) return AUTH_PORTALS.user.login;
  return AUTH_PORTALS.subscriber.login;
}

export function roleMatchesPortal(role: PlatformRole | string | null | undefined, portal: AuthPortal) {
  if (portal === 'superadmin') return isSuperAdmin(role);
  if (portal === 'admin') return isPlatformAdmin(role);
  if (portal === 'subscriber') return isSubscriberAdmin(role);
  return isSubscriberUser(role);
}
