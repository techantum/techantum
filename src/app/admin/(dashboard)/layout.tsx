import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocalAdminUser } from '@/lib/auth/local-admin-session';
import { canAccessAdminPath, type AdminRole } from '@/lib/admin/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getLocalRestUrl } from '@/lib/supabase/local-jwt';
import AdminShell from '@/components/admin/AdminShell';
import { getBranding } from '@/lib/cms';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = getLocalRestUrl() ? createAdminClient() : await createClient();
  const local = await getLocalAdminUser();
  let user = local?.user ?? null;
  let role = local?.role;

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

  if (!user) {
    redirect('/admin/login');
  }

  if (!role) {
    let adminUser: { user_id: string; role?: string } | null = null;
    const withRole = await db.from('admin_users').select('user_id, role').eq('user_id', user.id).maybeSingle();
    if (withRole.error && /role/i.test(withRole.error.message)) {
      const fallback = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
      adminUser = fallback.data;
    } else {
      adminUser = withRole.data;
    }
    if (!adminUser) {
      redirect('/admin/login');
    }
    role = ((adminUser as { role?: string }).role || 'ADMIN') as AdminRole;
  }
  const pathname = (await headers()).get('x-pathname') || '';
  if (pathname && !canAccessAdminPath(role, pathname)) {
    redirect('/admin');
  }

  const branding = await getBranding();

  return (
    <AdminShell
      role={role}
      logoUrl={branding.logo_url}
      logoLetter={branding.logo_letter}
      companyName={branding.company_name}
    >
      {children}
    </AdminShell>
  );
}
