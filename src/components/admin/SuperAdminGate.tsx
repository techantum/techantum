import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveAdminAuth } from '@/lib/admin/auth';
import { allowAdminPath } from '@/lib/admin/path-access';

export default async function SuperAdminGate({ children }: { children: React.ReactNode }) {
  const auth = await resolveAdminAuth();
  if (!auth) redirect('/admin/login');
  const pathname = (await headers()).get('x-pathname') || '';
  if (pathname && !allowAdminPath(auth, pathname)) redirect('/admin/access-denied');
  return <>{children}</>;
}
