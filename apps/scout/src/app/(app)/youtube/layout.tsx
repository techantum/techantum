import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import YoutubeFrame from '@/components/admin/youtube/YoutubeFrame';
import { isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_YOUTUBE, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor, trialPath } from '@/lib/saas/session';
import { permissionsForRole } from '@/lib/youtube/permissions';

export default async function YoutubeLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const access = await resolveAccess(actor.account, actor.role);
  if (!isSuperAdmin(actor.role) && !access.has(FEATURE_YOUTUBE)) {
    if (actor.account?.status === 'pending_autopay') redirect(trialPath(actor.account.pending_package_id));
    redirect('/billing?need=youtube');
  }
  return (
    <Suspense fallback={null}>
      <YoutubeFrame initialAccess={permissionsForRole(actor.role, [])}>{children}</YoutubeFrame>
    </Suspense>
  );
}
