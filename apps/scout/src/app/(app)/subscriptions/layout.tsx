import { redirect } from 'next/navigation';
import SubscriptionsNav from '@/components/admin/SubscriptionsNav';
import { isStaffAdmin } from '@/lib/admin/roles';
import { homePathForRole } from '@/lib/saas/portals';
import { getPlatformActor } from '@/lib/saas/session';

export default async function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor || !isStaffAdmin(actor.role)) redirect(homePathForRole(actor?.role));
  return (
    <>
      <SubscriptionsNav />
      {children}
    </>
  );
}
