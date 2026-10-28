import { redirect } from 'next/navigation';
import LeadPaths from '@/components/LeadPaths';
import { isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_LEADS, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor, trialPath } from '@/lib/saas/session';

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const access = await resolveAccess(actor.account, actor.role);
  if (!isSuperAdmin(actor.role) && !access.has(FEATURE_LEADS)) {
    if (actor.account?.status === 'pending_autopay') redirect(trialPath(actor.account.pending_package_id));
    redirect('/billing?need=leads');
  }
  return <LeadPaths>{children}</LeadPaths>;
}
