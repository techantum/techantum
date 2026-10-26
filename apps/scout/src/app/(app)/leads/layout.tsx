import { redirect } from 'next/navigation';
import LeadPaths from '@/components/LeadPaths';
import { isSuperAdmin } from '@/lib/admin/roles';
import { entitlementsFor, getPlatformActor } from '@/lib/saas/session';

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  if (!isSuperAdmin(actor.role) && !entitlementsFor(actor.account).leads) redirect('/billing?need=leads');
  return <LeadPaths>{children}</LeadPaths>;
}
