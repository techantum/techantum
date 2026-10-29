import { redirect } from 'next/navigation';
import LeadPaths from '@/components/LeadPaths';
import FeatureUpgrade from '@/components/billing/FeatureUpgrade';
import { isStaffAdmin } from '@/lib/admin/roles';
import { FEATURE_LEADS, listPackages, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor, trialPath } from '@/lib/saas/session';

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/subscriber/login');
  const access = await resolveAccess(actor.account, actor.role);
  if (!isStaffAdmin(actor.role) && !access.has(FEATURE_LEADS)) {
    if (actor.account?.status === 'pending_autopay') redirect(trialPath(actor.account.pending_package_id));
    const packages = await listPackages({ activeOnly: true });
    const plans = packages
      .filter((item) => item.features.some((feature) => feature.feature_key === FEATURE_LEADS))
      .map((item) => ({ name: item.name, price_monthly: item.price_monthly }));
    return <FeatureUpgrade name="Lead Discovery" plans={plans} />;
  }
  return <LeadPaths>{children}</LeadPaths>;
}
