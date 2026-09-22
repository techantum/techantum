import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/admin/roles';

export default async function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  let role = 'ADMIN';
  const withRole = await supabase.from('admin_users').select('role').eq('user_id', user.id).maybeSingle();
  if (!withRole.error) role = (withRole.data as { role?: string } | null)?.role || 'ADMIN';
  if (!isSuperAdmin(role)) redirect('/admin');
  return <>{children}</>;
}
