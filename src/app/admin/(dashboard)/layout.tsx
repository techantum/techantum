import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminShell from '@/components/admin/AdminShell';
import { canAccessAdminPath, type AdminRole } from '@/lib/admin/roles';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  let adminUser: { user_id: string; role?: string } | null = null;
  const withRole = await supabase.from('admin_users').select('user_id, role').eq('user_id', user.id).maybeSingle();
  if (withRole.error && /role/i.test(withRole.error.message)) {
    const fallback = await supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    adminUser = fallback.data;
  } else {
    adminUser = withRole.data;
  }

  if (!adminUser) {
    redirect('/admin/login');
  }

  const role = ((adminUser as { role?: string }).role || 'ADMIN') as AdminRole;
  const pathname = (await headers()).get('x-pathname') || '';
  if (pathname && !canAccessAdminPath(role, pathname)) {
    redirect('/admin');
  }

  return <AdminShell role={role}>{children}</AdminShell>;
}
