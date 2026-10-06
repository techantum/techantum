import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import { getBranding } from '@/lib/cms';

export default async function AdminLoginPage() {
  const auth = await resolveAdminAuth();
  if (auth) redirect('/admin');
  const branding = await getBranding();
  return <AdminLoginForm branding={branding} />;
}
