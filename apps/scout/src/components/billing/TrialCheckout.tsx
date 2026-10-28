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

export default function TrialCheckout({
  packages,
  selectedId,
  email,
}: {
  packages: TrialPackage[];
  selectedId: string;
  email: string;
}) {
  const [packageId, setPackageId] = useState(selectedId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = packages.find((item) => item.id === packageId) || packages[0];

  const start = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/billing/razorpay/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selected.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not start Autopay.');
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay Checkout is not available.');
      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay!({
          key: body.keyId,
          subscription_id: body.subscriptionId,
          name: 'Hookooh',
          description: `14-day trial of ${body.package?.name || selected.name}. First charge after the trial.`,
          prefill: { name: body.customer?.name || '', email: body.customer?.email || email },
          handler: async (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => {
            try {
              const verifyRes = await fetch('/api/billing/razorpay/subscribe/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...response, packageId: selected.id }),
              });
              const verified = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verified.error || 'Could not confirm Autopay.');
              window.location.assign(verified.next || '/home');
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => reject(new Error('Autopay was cancelled.')) },
          theme: { color: '#7c3aed' },
        });
        checkout.open();
      });
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
        <button type="button" disabled={busy} onClick={() => void start()} className="btn-primary mt-6 w-full">
          {busy ? 'Opening Razorpay…' : 'Authorize Autopay and start trial'}
        </button>
        <p className="mt-3 text-center text-xs text-slate-400">Autopay is required. YouTube and Leads stay locked until authorization succeeds.</p>
      </section>
    </div>
  );
}
