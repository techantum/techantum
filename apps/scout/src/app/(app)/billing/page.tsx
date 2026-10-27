'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { formatInr } from '@/lib/saas/money';

type Feature = { id: string; name: string; description?: string; icon?: string };
type Package = {
  id: string;
  name: string;
  price_monthly: number;
  highlight?: boolean;
  features: Feature[];
  description_html?: string;
};

type BillingState = {
  canManage: boolean;
  access: {
    active: boolean;
    keys: string[];
    features: Feature[];
    priceMonthly: number;
    periodEnd: string | null;
    pendingPackageId: string | null;
    pendingChangeAt: string | null;
    subscriptionStatus: string;
  };
  package: Package | null;
  packages: Package[];
  events: { id: string; event_type: string; created_at: string; from_name: string | null; to_name: string | null }[];
  account: { status: string; trial_ends_at: string | null };
};

export default function BillingPage() {
  const [data, setData] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Package | null>(null);

  const load = async () => {
    const res = await fetch('/api/billing');
    const body = await res.json();
    if (res.ok) setData(body);
  };

  useEffect(() => {
    void load();
  }, []);

  const apply = async (pkg: Package) => {
    setBusy(pkg.id);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not change package');
      setNotice(body.notice);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change package');
    } finally {
      setBusy('');
    }
  };

  if (!data) return <p className="text-slate-500">Loading billing…</p>;
  const current = data.package;
  const others = data.packages.filter((item) => item.id !== current?.id);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">Billing & Subscription</p>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your plan and subscription. Amounts are shown in Indian rupees.</p>
      </div>
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {data.access.subscriptionStatus === 'trialing' ? 'Trial' : 'Active'}
            </span>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Current plan</p>
            <h2 className="font-bricolage text-3xl font-bold text-slate-900">{current?.name || 'No package'}</h2>
            <p className="mt-1 text-lg font-semibold text-violet-700">{formatInr(data.access.priceMonthly)} / month</p>
            <p className="mt-1 text-sm text-slate-500">
              {data.account.trial_ends_at ? `Trial ends ${new Date(data.account.trial_ends_at).toLocaleDateString('en-IN')}. ` : ''}
              {data.access.periodEnd ? `Next renewal ${new Date(data.access.periodEnd).toLocaleDateString('en-IN')}.` : 'Payment status will appear here after billing is connected.'}
            </p>
            {data.access.pendingChangeAt ? (
              <p className="mt-2 text-sm text-amber-700">A downgrade is scheduled for {new Date(data.access.pendingChangeAt).toLocaleDateString('en-IN')}.</p>
            ) : null}
          </div>
        </div>
        <div className="mt-5">
          <p className="text-sm font-semibold text-slate-800">Included features</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {(data.access.features || []).map((feature) => (
              <li key={feature.id} className="flex items-center gap-2">
                <Icon name="CheckIcon" size={14} className="text-emerald-600" /> {feature.name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bricolage text-xl font-bold text-slate-900">Other available packages</h2>
        <div className="mt-4 space-y-3">
          {others.map((item) => {
            const upgrade = item.price_monthly >= (data.access.priceMonthly || 0);
            return (
              <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">{formatInr(item.price_monthly)} / month · {item.features.length === 1 ? '1 feature' : `${item.features.length} features`}</p>
                </div>
                {data.canManage ? (
                  <button type="button" onClick={() => setConfirm(item)} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
                    {upgrade ? 'Upgrade' : 'Downgrade'}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bricolage text-lg font-bold text-slate-900">Subscription history</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {data.events.map((event) => (
            <li key={event.id}>
              {event.event_type.replace(/_/g, ' ')}
              {event.to_name ? ` → ${event.to_name}` : ''}
              <span className="text-slate-400"> · {new Date(event.created_at).toLocaleString('en-IN')}</span>
            </li>
          ))}
          {data.events.length === 0 ? <li>No billing events yet.</li> : null}
        </ul>
        <p className="mt-3 text-xs text-slate-400">Invoices and tax details will appear here after a payment provider is connected.</p>
      </section>

      {confirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="font-bricolage text-xl font-bold">{confirm.price_monthly >= (data.access.priceMonthly || 0) ? 'Upgrade package' : 'Downgrade package'}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {confirm.price_monthly >= (data.access.priceMonthly || 0)
                ? `You will move to ${confirm.name} at ${formatInr(confirm.price_monthly, { withCycle: 'monthly' })}. Additional features become available immediately.`
                : `You will lose access to features not included in ${confirm.name}. The change takes effect at the next renewal${data.access.periodEnd ? ` (${new Date(data.access.periodEnd).toLocaleDateString('en-IN')})` : ''}.`}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {confirm.features.map((feature) => (
                <li key={feature.id}>• {feature.name}</li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" disabled={Boolean(busy)} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => void apply(confirm)}>
                {busy ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
