import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin, SUPER_ADMIN_ONLY_API_PREFIXES, type AdminRole } from './roles';

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

export async function requireAdmin(options?: { superAdmin?: boolean }) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let adminUser: { user_id: string; email?: string; role?: string } | null = null;
  const withRole = await supabase.from('admin_users').select('user_id, role, email').eq('user_id', user.id).maybeSingle();
  if (withRole.error && /role/i.test(withRole.error.message)) {
    const fallback = await supabase.from('admin_users').select('user_id, email').eq('user_id', user.id).maybeSingle();
    adminUser = fallback.data;
  } else {
    adminUser = withRole.data;
  }

  if (!adminUser) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const role = (adminUser.role || 'ADMIN') as AdminRole;
  if ((await pathRequiresSuperAdmin(options?.superAdmin)) && !isSuperAdmin(role)) {
    return { error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
  }

  return { supabase, user, role, email: adminUser.email || user.email || '' };
}

export async function requireSuperAdmin() {
  return requireAdmin({ superAdmin: true });
}
