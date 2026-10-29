import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import YoutubeActivityDashboard from '@/components/admin/youtube/YoutubeActivityDashboard';
import { isStaffAdmin } from '@/lib/admin/roles';
import { homePathForRole } from '@/lib/saas/portals';
import { getPlatformActor } from '@/lib/saas/session';
import { firstNameFrom } from '@/lib/youtube/home-display';
import { researchHomeForAccount } from '@/lib/youtube/home';
import { permissionsForRole } from '@/lib/youtube/permissions';

export default async function HomePage() {
  const actor = await getPlatformActor();
  const home = actor ? homePathForRole(actor.role) : '/subscriber';
  if (actor && isStaffAdmin(actor.role)) redirect(home);
  const path = (await headers()).get('x-pathname') || '';
  if (actor && (path === '/subscriber' || path === '/user') && path !== home) redirect(home);
  const researchHome = await researchHomeForAccount(actor?.account?.id || null).catch(() => null);
  const permissions = permissionsForRole(actor?.role, []);
  return (
    <YoutubeActivityDashboard
      initialHome={researchHome}
      initialFirstName={firstNameFrom(actor?.name, actor?.email)}
      initialManage={permissions.includes('youtube_research.channels.manage')}
    />
  );
}
