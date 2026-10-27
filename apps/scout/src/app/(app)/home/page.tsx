import Link from 'next/link';
import { isSuperAdmin, isSubscriberAdmin } from '@/lib/admin/roles';
import { FEATURE_TEAM, listPackages, listSubscriptionRows, resolveAccess } from '@/lib/saas/catalog';
import { formatInr } from '@/lib/saas/money';
import { getPlatformActor } from '@/lib/saas/session';

export default async function HomePage() {
  const actor = await getPlatformActor();
  if (!actor) return null;
  const access = await resolveAccess(actor.account, actor.role);
  const admin = isSuperAdmin(actor.role);

  if (admin) {
    const [packages, subscriptions] = await Promise.all([listPackages(), listSubscriptionRows()]);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-500">Manage features, packages, and subscriber workspaces.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="font-bricolage text-2xl font-bold">{packages.length}</p>
            <p className="text-xs text-slate-500">Packages</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="font-bricolage text-2xl font-bold">{subscriptions.length}</p>
            <p className="text-xs text-slate-500">Subscribers</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="font-bricolage text-2xl font-bold">{packages.reduce((sum, item) => sum + item.features.length, 0)}</p>
            <p className="text-xs text-slate-500">Assigned features</p>
          </article>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {packages.map((item) => (
            <Link key={item.id} href="/subscriptions/packages" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-violet-700">{formatInr(item.price_monthly, { withCycle: 'monthly' })}</p>
              <p className="mt-2 text-sm text-slate-500">{item.features.length} features · {item.subscriber_count} subscribers</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Welcome, {actor.name}</h1>
        <p className="mt-1 text-slate-500">
          {access.active
            ? `Your ${access.package?.name || 'workspace'} package includes ${access.features.map((item) => item.name).join(', ') || 'no extra modules yet'}.`
            : 'Your trial or subscription is not active. Ask a Subscriber Admin to open Billing.'}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {access.features
          .filter((feature) => feature.feature_key !== FEATURE_TEAM || isSubscriberAdmin(actor.role))
          .map((feature) => (
            <Link key={feature.id} href={feature.route} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-violet-200">
              <p className="text-sm font-semibold text-violet-600">{feature.sidebar_label}</p>
              <h2 className="mt-2 font-bricolage text-xl font-semibold">{feature.name}</h2>
              <p className="mt-2 text-sm text-slate-500">{feature.description}</p>
            </Link>
          ))}
        {isSubscriberAdmin(actor.role) ? (
          <Link href="/billing" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:border-violet-200">
            <p className="text-sm font-semibold text-violet-600">Billing</p>
            <h2 className="mt-2 font-bricolage text-xl font-semibold">Manage your package</h2>
            <p className="mt-2 text-sm text-slate-500">See your active plan in Indian rupees and upgrade or downgrade.</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
