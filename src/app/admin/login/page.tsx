import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { getBranding } from '@/lib/cms';
import { query } from '@/lib/db/postgres';

export default async function AdminLoginPage() {
  const auth = await resolveAdminAuth();
  if (auth) redirect('/admin');
  const branding = await getBranding();
  let needsSetup = false;
  try {
    const { rows } = await query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM public.admin_users`);
    needsSetup = Number(rows[0]?.count || 0) === 0;
  } catch {
    needsSetup = false;
  }
  return <AdminLoginForm branding={branding} needsSetup={needsSetup} />;
}
