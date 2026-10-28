import YoutubeActivityDashboard from '@/components/admin/youtube/YoutubeActivityDashboard';
import { getPlatformActor } from '@/lib/saas/session';
import { firstNameFrom } from '@/lib/youtube/home-display';
import { researchHomeForAccount } from '@/lib/youtube/home';
import { permissionsForRole } from '@/lib/youtube/permissions';

export default async function ResearchProjectsPage() {
  const actor = await getPlatformActor();
  const home = await researchHomeForAccount(actor?.account?.id || null).catch(() => null);
  const permissions = permissionsForRole(actor?.role, []);
  return (
    <YoutubeActivityDashboard
      initialHome={home}
      initialFirstName={firstNameFrom(actor?.name, actor?.email)}
      initialManage={permissions.includes('youtube_research.channels.manage')}
    />
  );
}
