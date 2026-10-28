'use client';

import { useState } from 'react';
import { formatInr } from '@/lib/saas/money';

type TrialPackage = {
  id: string;
  name: string;
  price_monthly: number;
  short_description?: string;
  features: string[];
};

export default function TrialCheckout({
  packages,
  selectedId,
  initialError = '',
}: {
  packages: TrialPackage[];
  selectedId: string;
  email?: string;
  initialError?: string;
}) {
  const [packageId, setPackageId] = useState(selectedId);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const selected = packages.find((item) => item.id === packageId) || packages[0];

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/billing/razorpay/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selected.id, contact: phone }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not start Autopay.');
      if (!body.checkoutUrl) throw new Error('Could not open the Autopay page.');
      window.location.assign(body.checkoutUrl);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Autopay.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Start your 14-day trial</h1>
        <p className="mt-2 text-sm text-slate-500">
          Authorize Razorpay Autopay to unlock {selected.name}. You are not charged until the trial ends. After that, Razorpay bills {formatInr(selected.price_monthly)} each month.
        </p>
      </div>
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}
      {packages.length > 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {packages.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPackageId(item.id)}
              className={`rounded-2xl border p-4 text-left ${item.id === selected.id ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white'}`}
            >
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="text-sm text-violet-700">{formatInr(item.price_monthly)} / month after trial</p>
            </button>
          ))}
        </div>
      ) : null}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Selected package</p>
        <h2 className="mt-1 font-bricolage text-2xl font-bold text-slate-900">{selected.name}</h2>
        {selected.short_description ? <p className="mt-2 text-sm text-slate-500">{selected.short_description}</p> : null}
        <p className="mt-3 text-lg font-semibold text-violet-700">{formatInr(selected.price_monthly)} / month after 14 days</p>
        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          {selected.features.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>
        <label className="mt-5 block text-sm font-medium text-slate-700">
          UPI mobile number
          <span className="mt-1 flex overflow-hidden rounded-xl border border-slate-200">
            <span className="inline-flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">+91</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              className="h-11 min-w-0 flex-1 px-3 text-sm outline-none"
            />
          </span>
        </label>
        <p className="mt-2 text-xs text-slate-400">Use the mobile number on your UPI app. Razorpay then shows a UPI QR you can scan, or a request in that app. The workspace opens only after Autopay succeeds.</p>
        <button type="button" disabled={busy || phone.length !== 10} onClick={() => void start()} className="btn-primary mt-6 w-full">
          {busy ? 'Opening Razorpay…' : 'Authorize Autopay and start trial'}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">Autopay is required. YouTube and Leads stay locked until authorization succeeds.</p>
      </section>
    </div>
  );
}
