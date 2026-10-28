import { redirect } from 'next/navigation';
import FeatureUpgrade from '@/components/billing/FeatureUpgrade';
import { canManageTeam, isSuperAdmin } from '@/lib/admin/roles';
import { FEATURE_TEAM, listPackages, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  if (isSuperAdmin(actor.role)) redirect('/subscribers');
  if (!canManageTeam(actor.role)) redirect('/home');
  const access = await resolveAccess(actor.account, actor.role);
  if (!access.has(FEATURE_TEAM)) {
    const packages = await listPackages({ activeOnly: true });
    const plans = packages
      .filter((item) => item.features.some((feature) => feature.feature_key === FEATURE_TEAM))
      .map((item) => ({ name: item.name, price_monthly: item.price_monthly }));
    return <FeatureUpgrade name="Team" plans={plans} />;
  }
  return children;
}
