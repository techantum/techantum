'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { SAAS_PLANS } from '@/lib/saas/plans';

function BillingInner() {
  const search = useSearchParams();
  const need = search?.get('need');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const choose = async (plan: string) => {
    setBusy(plan);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/billing/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not update the plan');
      setMessage(body.notice || 'Plan updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the plan');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Billing</h1>
        <p className="mt-1 text-slate-500">Subscription for this Revealeo workspace. Card billing uses Stripe when STRIPE_SECRET_KEY is set.</p>
      </div>
      {need === 'youtube' ? <p className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">YouTube Research needs Growth or Scale.</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        {SAAS_PLANS.map((plan) => (
          <article key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-indigo-700">{plan.name}</p>
            <p className="mt-1 font-bricolage text-2xl font-bold">${plan.priceMonthly}<span className="text-sm font-medium text-slate-400">/mo</span></p>
            <ul className="mt-3 space-y-1 text-sm text-slate-600">
              {plan.features.map((item) => <li key={item}>{item}</li>)}
            </ul>
            <button type="button" disabled={Boolean(busy)} onClick={() => choose(plan.id)} className="mt-4 w-full rounded-full bg-indigo-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy === plan.id ? 'Saving…' : `Choose ${plan.name}`}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingInner />
    </Suspense>
  );
}
