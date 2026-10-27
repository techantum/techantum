import { redirect } from 'next/navigation';
import SubscriptionsNav from '@/components/admin/SubscriptionsNav';
import { isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';

export default async function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor || !isSuperAdmin(actor.role)) redirect('/home');
  return (
    <>
      <SubscriptionsNav />
      {children}
    </>
  );
}
