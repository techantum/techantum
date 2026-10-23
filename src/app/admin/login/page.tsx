import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { getBranding } from '@/lib/cms';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AdminLoginPage() {
  const auth = await resolveAdminAuth();
  if (auth) redirect('/admin');
  const branding = await getBranding();
  let needsSetup = false;
  try {
    const supabase = createAdminClient();
    const { count } = await supabase.from('admin_users').select('*', { count: 'exact', head: true });
    needsSetup = (count ?? 0) === 0;
  } catch {
    needsSetup = false;
  }
  return <AdminLoginForm branding={branding} needsSetup={needsSetup} />;
}
