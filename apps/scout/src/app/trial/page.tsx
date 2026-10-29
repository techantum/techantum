import { redirect } from 'next/navigation';
import { isStaffAdmin } from '@/lib/admin/roles';
import { homePathForRole } from '@/lib/saas/portals';
import TrialCheckout from '@/components/billing/TrialCheckout';
import AuthShell from '@/components/marketing/AuthShell';
import { getPackageById, listPackages } from '@/lib/saas/catalog';
import { accountIsActive, getPlatformActor } from '@/lib/saas/session';

export default async function TrialPage({ searchParams }: { searchParams: Promise<{ package?: string; error?: string }> }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/subscriber/login');
  if (isStaffAdmin(actor.role)) redirect(homePathForRole(actor.role));
  const params = await searchParams;
  const requested = params.package || actor.account?.pending_package_id || '';
  if (actor.account && accountIsActive(actor.account) && (!requested || requested === actor.account.package_id)) {
    redirect(homePathForRole(actor.role));
  }
  const chosen = requested ? await getPackageById(requested) : null;
  const packages = chosen ? [chosen] : await listPackages({ activeOnly: true });
  return (
    <AuthShell>
      {packages.length ? (
        <TrialCheckout
          packages={packages.map((item) => ({
            id: item.id,
            name: item.name,
            price_monthly: item.price_monthly,
            short_description: item.short_description,
            features: item.features.map((feature) => feature.name),
          }))}
          selectedId={chosen?.id || packages[0].id}
          initialError={params.error || ''}
        />
      ) : (
        <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8">
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Start your 14-day trial</h1>
          <p className="mt-2 text-sm text-slate-500">No packages are published yet. Ask a Super Admin to add one.</p>
        </div>
      )}
    </AuthShell>
  );
}
