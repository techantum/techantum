import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import { isSuperAdmin } from '@/lib/admin/roles';

export default async function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const auth = await resolveAdminAuth();
  if (!auth) redirect('/admin/login');
  if (!isSuperAdmin(auth.role)) redirect('/admin');
  return <>{children}</>;
}
