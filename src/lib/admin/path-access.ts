import { matchFeatureForApi, matchFeatureForPath, type AccessLevel } from './access';
import { featureKeyFromHref } from './access';
import { permissionTree } from './permission-registry';
import { canAccessAdminPath, isSuperAdmin } from './roles';

export type PathAccessAuth = {
  role?: string | null;
  isSuperAdmin?: boolean;
  rbacManaged?: boolean;
  access?: Record<string, AccessLevel>;
};

export function allowAdminPath(auth: PathAccessAuth, pathname: string) {
  if (!pathname || pathname === '/admin/access-denied') return true;
  if (auth.isSuperAdmin || isSuperAdmin(auth.role)) return true;
  if (auth.rbacManaged) {
    if (pathname === '/admin' || pathname === '/admin/profile') return true;
    const feature = matchFeatureForPath(permissionTree(), pathname);
    if (!feature) return false;
    const level = auth.access?.[feature.key] || 'NONE';
    return level === 'READ' || level === 'FULL';
  }
  return canAccessAdminPath(auth.role, pathname);
}

export function requiredApiAccess(pathname: string, method: string): { featureKey: string; level: AccessLevel } | null {
  if (!pathname.startsWith('/api/admin')) return null;
  if (
    pathname === '/api/admin/me' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/logout' ||
    pathname === '/api/admin/setup' ||
    pathname === '/api/admin/stats' ||
    pathname.startsWith('/api/admin/invite')
  ) {
    return null;
  }
  const feature = matchFeatureForApi(permissionTree(), pathname);
  if (!feature) {
    if (pathname.startsWith('/api/admin/rbac/users')) return { featureKey: 'users', level: method === 'GET' ? 'READ' : 'FULL' };
    if (pathname.startsWith('/api/admin/rbac/roles')) return { featureKey: 'roles', level: method === 'GET' ? 'READ' : 'FULL' };
    if (pathname.startsWith('/api/admin/rbac')) return { featureKey: 'audit-logs', level: 'READ' };
    return { featureKey: featureKeyFromHref(pathname.replace(/^\/api/, '')), level: method === 'GET' || method === 'HEAD' ? 'READ' : 'FULL' };
  }
  const write = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  return { featureKey: feature.key, level: write ? 'FULL' : 'READ' };
}

export function allowAdminApi(auth: PathAccessAuth, pathname: string, method: string) {
  if (auth.isSuperAdmin || isSuperAdmin(auth.role)) return true;
  const needed = requiredApiAccess(pathname, method);
  if (!needed) return true;
  if (!auth.rbacManaged) return canAccessAdminPath(auth.role, needed.featureKey.startsWith('/') ? needed.featureKey : pathname.replace(/^\/api/, ''));
  const level = auth.access?.[needed.featureKey] || 'NONE';
  if (needed.level === 'READ') return level === 'READ' || level === 'FULL';
  return level === 'FULL';
}
