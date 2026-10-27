import { redirect } from 'next/navigation';
import YoutubeFrame from '@/components/admin/youtube/YoutubeFrame';
import { isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_YOUTUBE, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';
import { permissionsForRole } from '@/lib/youtube/permissions';

export default async function YoutubeLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const access = await resolveAccess(actor.account, actor.role);
  if (!isSuperAdmin(actor.role) && !access.has(FEATURE_YOUTUBE)) redirect('/billing?need=youtube');
  return <YoutubeFrame initialAccess={permissionsForRole(actor.role, [])}>{children}</YoutubeFrame>;
}
