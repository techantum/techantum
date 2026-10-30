'use client';

import { createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import { matchFeatureForPath, type AccessLevel } from '@/lib/admin/access';
import { permissionTree } from '@/lib/admin/permission-registry';

type AdminAccessValue = {
  isSuperAdmin: boolean;
  rbacManaged: boolean;
  access: Record<string, AccessLevel>;
  can: (feature: string, level?: AccessLevel) => boolean;
};

const AdminAccessContext = createContext<AdminAccessValue>({
  isSuperAdmin: false,
  rbacManaged: false,
  access: {},
  can: () => true,
});

export function AdminAccessProvider({
  children,
  isSuperAdmin,
  rbacManaged,
  access,
}: {
  children: React.ReactNode;
  isSuperAdmin: boolean;
  rbacManaged: boolean;
  access: Record<string, AccessLevel>;
}) {
  const can = (feature: string, level: AccessLevel = 'READ') => {
    if (isSuperAdmin || !rbacManaged) return level === 'READ' ? true : isSuperAdmin || !rbacManaged;
    const have = access[feature] || 'NONE';
    if (level === 'READ') return have === 'READ' || have === 'FULL';
    return have === 'FULL';
  };
  return (
    <AdminAccessContext.Provider value={{ isSuperAdmin, rbacManaged, access, can }}>{children}</AdminAccessContext.Provider>
  );
}

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}

export function useCanWrite() {
  const pathname = usePathname() || '';
  const ctx = useAdminAccess();
  if (ctx.isSuperAdmin || !ctx.rbacManaged) return true;
  const feature = matchFeatureForPath(permissionTree(), pathname);
  if (!feature) return false;
  return ctx.can(feature.key, 'FULL');
}
