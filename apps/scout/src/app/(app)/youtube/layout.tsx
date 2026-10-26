import { redirect } from 'next/navigation';
import YoutubeFrame from '@/components/admin/youtube/YoutubeFrame';
import { isSuperAdmin } from '@/lib/admin/roles';
import { entitlementsFor, getPlatformActor } from '@/lib/saas/session';
import { permissionsForRole } from '@/lib/youtube/permissions';

export default async function YoutubeLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const access = entitlementsFor(actor.account);
  if (!isSuperAdmin(actor.role) && !access.youtube) redirect('/billing?need=youtube');
  return <YoutubeFrame initialAccess={permissionsForRole(actor.role, [])}>{children}</YoutubeFrame>;
}
