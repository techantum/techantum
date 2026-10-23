import YoutubeFrame from '@/components/admin/youtube/YoutubeFrame';
import { resolveAdminAuth } from '@/lib/admin/auth';
import { sessionAccess } from '@/lib/youtube/service';

export default async function YoutubeResearchLayout({ children }: { children: React.ReactNode }) {
  const auth = await resolveAdminAuth();
  const access = auth ? (await sessionAccess(auth.role, auth.user.id)).permissions : [];
  return <YoutubeFrame initialAccess={access}>{children}</YoutubeFrame>;
}
