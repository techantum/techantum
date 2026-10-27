import { redirect } from 'next/navigation';
import LeadPaths from '@/components/LeadPaths';
import { isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_LEADS, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const access = await resolveAccess(actor.account, actor.role);
  if (!isSuperAdmin(actor.role) && !access.has(FEATURE_LEADS)) redirect('/billing?need=leads');
  return <LeadPaths>{children}</LeadPaths>;
}
