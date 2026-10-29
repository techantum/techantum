import { redirect } from 'next/navigation';
import { canManageBilling } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/subscriber/login');
  if (!canManageBilling(actor.role)) redirect('/home');
  return children;
}
