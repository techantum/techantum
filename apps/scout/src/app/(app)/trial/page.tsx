import { redirect } from 'next/navigation';
import { getPackageById, listPackages } from '@/lib/saas/catalog';
import { accountIsActive, getPlatformActor } from '@/lib/saas/session';
import { isSuperAdmin } from '@/lib/admin/roles';
import TrialCheckout from '@/components/billing/TrialCheckout';

export default async function TrialPage({ searchParams }: { searchParams: Promise<{ package?: string }> }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  if (isSuperAdmin(actor.role)) redirect('/home');
  const params = await searchParams;
  const requested = params.package || actor.account?.pending_package_id || '';
  if (actor.account && accountIsActive(actor.account) && (!requested || requested === actor.account.package_id)) {
    redirect('/home');
  }
  const chosen = requested ? await getPackageById(requested) : null;
  const packages = chosen ? [chosen] : await listPackages({ activeOnly: true });
  if (!packages.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8">
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Start your 14-day trial</h1>
        <p className="mt-2 text-sm text-slate-500">No packages are published yet. Ask a Super Admin to add one.</p>
      </div>
    );
  }
  return (
    <TrialCheckout
      packages={packages.map((item) => ({
        id: item.id,
        name: item.name,
        price_monthly: item.price_monthly,
        short_description: item.short_description,
        features: item.features.map((feature) => feature.name),
      }))}
      selectedId={chosen?.id || packages[0].id}
      email={actor.email}
    />
  );
}
