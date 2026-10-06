import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export default async function AdminLoginPage() {
  const auth = await resolveAdminAuth();
  if (auth) redirect('/admin');
  return <AdminLoginForm />;
}
