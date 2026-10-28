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
  account: { status: string; trial_ends_at: string | null; name?: string; email?: string; razorpay_subscription_id?: string | null };
  customer?: { name: string; email: string };
  razorpay?: { configured: boolean; keyId: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
}

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

  const applyDowngrade = async (pkg: Package) => {
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

  const pay = async (pkg: Package) => {
    setBusy(pkg.id);
    setError('');
    setNotice('');
    try {
      if (!data?.razorpay?.configured) {
        throw new Error('Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.');
      }
      const orderRes = await fetch('/api/billing/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || 'Could not start Razorpay');
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay Checkout is not available.');
      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency || 'INR',
          name: 'Hookooh',
          description: order.package?.name || pkg.name,
          order_id: order.orderId,
          prefill: {
            name: order.customer?.name || data.customer?.name || data.account.name || '',
            email: order.customer?.email || data.customer?.email || data.account.email || '',
          },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch('/api/billing/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...response, packageId: pkg.id }),
              });
              const verified = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verified.error || 'Payment verification failed');
              setNotice(verified.notice);
              setConfirm(null);
              await load();
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment was cancelled.')) },
          theme: { color: '#7c3aed' },
        });
        checkout.open();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete payment');
    } finally {
      setBusy('');
    }
  };

  if (!data) return <p className="text-slate-500">Loading billing…</p>;
  const current = data.package;
  const others = data.packages.filter((item) => item.id !== current?.id);

  return (
    <div className="space-y-5">
      <h1 className="font-bricolage text-3xl font-bold text-slate-900">Billing & Subscription</h1>
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {data.account.status === 'pending_autopay' ? 'Autopay pending' : data.access.subscriptionStatus === 'trialing' || data.account.status === 'trialing' ? 'Trial' : 'Active'}
            </span>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Current plan</p>
            <h2 className="font-bricolage text-3xl font-bold text-slate-900">{current?.name || 'No package'}</h2>
            <p className="mt-1 text-lg font-semibold text-violet-700">{formatInr(data.access.priceMonthly)} / month</p>
            <p className="mt-1 text-sm text-slate-500">
              {data.account.trial_ends_at ? `Trial ends ${new Date(data.account.trial_ends_at).toLocaleDateString('en-IN')}. ` : ''}
              {data.access.periodEnd ? `Next renewal ${new Date(data.access.periodEnd).toLocaleDateString('en-IN')}.` : 'Pay with Razorpay in Indian Rupees to activate or upgrade a package.'}
            </p>
            {data.access.pendingChangeAt ? (
              <p className="mt-2 text-sm text-amber-700">A downgrade is scheduled for {new Date(data.access.pendingChangeAt).toLocaleDateString('en-IN')}.</p>
            ) : null}
            <p className="mt-2 text-xs text-slate-400">
            {data.account.razorpay_subscription_id
              ? 'Razorpay Autopay is authorized. The first charge runs after the trial unless you pay to activate sooner.'
              : data.account.status === 'pending_autopay'
                ? 'Authorize Autopay on the trial page to unlock this workspace.'
                : data.razorpay?.configured
                  ? 'Razorpay is connected. Pay in INR to activate or upgrade a package.'
                  : 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to collect payments.'}
          </p>
            {data.canManage && (data.account.status === 'trialing' || data.access.subscriptionStatus === 'trialing') && current ? (
              <button type="button" onClick={() => setConfirm(current)} className="mt-4 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white">
                Pay {formatInr(current.price_monthly)} to activate {current.name}
              </button>
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
                    {upgrade ? 'Pay & upgrade' : 'Downgrade'}
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
      </section>

      {confirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="font-bricolage text-xl font-bold">{confirm.price_monthly >= (data.access.priceMonthly || 0) ? 'Pay with Razorpay' : 'Downgrade package'}</h3>
            <p className="mt-2 text-sm text-slate-600">
              {confirm.price_monthly >= (data.access.priceMonthly || 0)
                ? `You will pay ${formatInr(confirm.price_monthly)} for ${confirm.name} and receive the included features immediately.`
                : `You will lose access to features not included in ${confirm.name}. The change takes effect at the next renewal${data.access.periodEnd ? ` (${new Date(data.access.periodEnd).toLocaleDateString('en-IN')})` : ''}.`}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {confirm.features.map((feature) => (
                <li key={feature.id}>• {feature.name}</li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                type="button"
                disabled={Boolean(busy)}
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void (confirm.price_monthly >= (data.access.priceMonthly || 0) ? pay(confirm) : applyDowngrade(confirm))}
              >
                {busy ? 'Working…' : confirm.price_monthly >= (data.access.priceMonthly || 0) ? 'Continue to Razorpay' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
