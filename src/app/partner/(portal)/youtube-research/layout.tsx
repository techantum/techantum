import { redirect } from 'next/navigation';
import YoutubeFrame from '@/components/admin/youtube/YoutubeFrame';
import { getPartnerSession } from '@/lib/partner/auth';
import { firstAllowedPartnerHref, partnerHasNavAccess } from '@/lib/partner/nav';
import { permissionsForRole } from '@/lib/youtube/permissions';

export default async function PartnerYoutubeLayout({ children }: { children: React.ReactNode }) {
  const session = await getPartnerSession();
  if (!session) redirect('/partner/login');

  if (!partnerHasNavAccess(session.partnerUser, 'youtube-research', session.partner)) {
    redirect(firstAllowedPartnerHref(session.partnerUser, session.partner));
  }

  return <YoutubeFrame initialAccess={permissionsForRole(session.partnerUser.role, [])}>{children}</YoutubeFrame>;
}
