import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import { canAccessAdminPath } from '@/lib/admin/roles';
import AdminShell from '@/components/admin/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await resolveAdminAuth();
  if (!auth) {
    redirect('/admin/login');
  }

  const pathname = (await headers()).get('x-pathname') || '';
  if (pathname && !canAccessAdminPath(auth.role, pathname)) {
    redirect('/admin');
  }

  return <AdminShell role={auth.role}>{children}</AdminShell>;
}
