import { cache } from 'react';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getLocalAdminUser } from '@/lib/auth/local-admin-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getLocalRestUrl } from '@/lib/supabase/local-jwt';
import { isSuperAdmin, SUPER_ADMIN_ONLY_API_PREFIXES, type AdminRole } from './roles';
import { loadAuthorization, type ResolvedAuthorization } from './rbac';
import { allowAdminApi } from './path-access';
import type { AccessLevel } from './access';
import { can as rbacCan } from './rbac';

export type AdminAuth = {
  user: User;
  role: AdminRole;
  email: string;
  status?: string;
  rbacManaged: boolean;
  isSuperAdmin: boolean;
  access: Record<string, AccessLevel>;
  roleNames: string[];
};

function adminDb() {
  return getLocalRestUrl() ? createAdminClient() : null;
}

async function pathRequiresSuperAdmin(explicit?: boolean) {
  if (explicit) return true;
  try {
    const headerStore = await headers();
    const pathname = headerStore.get('x-pathname') || '';
    return SUPER_ADMIN_ONLY_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  } catch {
    return false;
  }
}

function toAuth(
  user: User,
  role: AdminRole,
  email: string,
  authorization: ResolvedAuthorization | null
): AdminAuth {
  const isSuper = authorization?.isSuperAdmin || role === 'SUPER_ADMIN';
  return {
    user,
    role: isSuper ? 'SUPER_ADMIN' : role,
    email,
    status: authorization?.status,
    rbacManaged: authorization?.rbacManaged || false,
    isSuperAdmin: isSuper,
    access: authorization?.access || {},
    roleNames: authorization?.roleNames || [],
  };
}

export const resolveAdminAuth = cache(async (): Promise<AdminAuth | null> => {
  const local = await getLocalAdminUser();
  let user = local?.user ?? null;
  let role = local?.role;
  let email = local?.email || '';

  if (!user) {
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
    } catch {
      user = null;
    }
  }

  if (!user) return null;

  if (!role) {
    const db = adminDb() ?? (await createClient());
    let adminUser: { user_id: string; email?: string; role?: string } | null = null;
    const withRole = await db.from('admin_users').select('user_id, role, email').eq('user_id', user.id).maybeSingle();
    if (withRole.error && /role/i.test(withRole.error.message)) {
      const fallback = await db.from('admin_users').select('user_id, email').eq('user_id', user.id).maybeSingle();
      adminUser = fallback.data;
    } else {
      adminUser = withRole.data;
    }
    if (!adminUser) return null;
    role = (adminUser.role || 'ADMIN') as AdminRole;
    email = adminUser.email || user.email || '';
  }

  let authorization: ResolvedAuthorization | null = null;
  try {
    authorization = await loadAuthorization(user.id);
  } catch {
    authorization = null;
  }

  if (authorization?.status && authorization.status !== 'active') return null;

  return toAuth(user, role as AdminRole, email || user.email || '', authorization);
});

export async function requireAdmin(options?: { superAdmin?: boolean; feature?: string; level?: AccessLevel }) {
  const auth = await resolveAdminAuth();
  if (!auth) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (options?.superAdmin && !auth.isSuperAdmin) {
    return { error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
  }

  if (options?.feature && auth.rbacManaged && !rbacCan(auth, options.feature, options.level || 'READ')) {
    return { error: NextResponse.json({ error: 'You do not have permission to access this feature.' }, { status: 403 }) };
  }

  if (auth.rbacManaged && !auth.isSuperAdmin) {
    try {
      const headerStore = await headers();
      const pathname = headerStore.get('x-pathname') || '';
      const method = headerStore.get('x-method') || 'GET';
      if (pathname && !allowAdminApi(auth, pathname, method)) {
        return { error: NextResponse.json({ error: 'You do not have permission to access this feature.' }, { status: 403 }) };
      }
    } catch {
      /* ignore */
    }
  } else if ((await pathRequiresSuperAdmin(options?.superAdmin)) && !auth.isSuperAdmin) {
    return { error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
  }

  const supabase = adminDb() ?? (await createClient());
  return { supabase, ...auth };
}

export async function requireSuperAdmin() {
  return requireAdmin({ superAdmin: true });
}
