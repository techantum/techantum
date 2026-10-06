import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getLocalAdminUser } from '@/lib/auth/local-admin-session';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getLocalRestUrl } from '@/lib/supabase/local-jwt';
import { isSuperAdmin, SUPER_ADMIN_ONLY_API_PREFIXES, type AdminRole } from './roles';

export type AdminAuth = {
  user: User;
  role: AdminRole;
  email: string;
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

export async function resolveAdminAuth(): Promise<AdminAuth | null> {
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

  return { user, role, email: email || user.email || '' };
}

export async function requireAdmin(options?: { superAdmin?: boolean }) {
  const auth = await resolveAdminAuth();
  if (!auth) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if ((await pathRequiresSuperAdmin(options?.superAdmin)) && !isSuperAdmin(auth.role)) {
    return { error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
  }

  const supabase = adminDb() ?? (await createClient());
  return { supabase, ...auth };
}

export async function requireSuperAdmin() {
  return requireAdmin({ superAdmin: true });
}
