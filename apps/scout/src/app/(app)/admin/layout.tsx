import { redirect } from 'next/navigation';
import { isPlatformAdmin } from '@/lib/admin/roles';
import { homePathForRole } from '@/lib/saas/portals';
import { getPlatformActor } from '@/lib/saas/session';

export default async function PlatformAdminAreaLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/admin/login');
  if (!isPlatformAdmin(actor.role)) redirect(homePathForRole(actor.role));
  return children;
}
