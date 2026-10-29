import { redirect } from 'next/navigation';
import { isSuperAdmin } from '@/lib/admin/roles';
import { homePathForRole } from '@/lib/saas/portals';
import { getPlatformActor } from '@/lib/saas/session';

export default async function SuperAdminAreaLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/superadmin/login');
  if (!isSuperAdmin(actor.role)) redirect(homePathForRole(actor.role));
  return children;
}
