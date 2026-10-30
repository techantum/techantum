import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import { allowAdminPath } from '@/lib/admin/path-access';
import AdminShell from '@/components/admin/AdminShell';
import { getBranding } from '@/lib/cms';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await resolveAdminAuth();
  if (!auth) {
    redirect('/admin/login');
  }

  const pathname = (await headers()).get('x-pathname') || '';
  if (pathname && !allowAdminPath(auth, pathname)) {
    redirect('/admin/access-denied');
  }

  const branding = await getBranding();

  return (
    <AdminShell
      role={auth.role}
      access={auth.access}
      rbacManaged={auth.rbacManaged}
      isSuperAdmin={auth.isSuperAdmin}
      roleLabel={auth.isSuperAdmin ? 'Super admin' : auth.roleNames[0] || 'Admin'}
      logoUrl={branding.logo_url}
      logoLetter={branding.logo_letter}
      companyName={branding.company_name}
    >
      {children}
    </AdminShell>
  );
}
