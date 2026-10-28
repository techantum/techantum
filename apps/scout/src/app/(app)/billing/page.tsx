'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { formatInr } from '@/lib/saas/money';

type Feature = { id: string; name: string; feature_key?: string };
type Package = {
  id: string;
  slug?: string;
  name: string;
  price_monthly: number;
  price_yearly?: number | null;
  short_description?: string;
  seats?: number | null;
  features: Feature[];
};

type BillingEvent = {
  id: string;
  event_type: string;
  created_at: string;
  payload?: { amount?: number } | null;
  from_name: string | null;
  to_name: string | null;
};

type BillingState = {
  canManage: boolean;
  access: {
    priceMonthly: number;
    periodEnd: string | null;
    subscriptionStatus: string;
  };
  package: Package | null;
  packages: Package[];
  events: BillingEvent[];
  usage?: { analyses: number; included: number | null };
  account: { status: string; trial_ends_at: string | null; name?: string; email?: string; current_period_end?: string | null };
  customer?: { name: string; email: string };
  razorpay?: { configured: boolean };
};

const EVENT_LABEL: Record<string, string> = {
  trial_started: 'Trial started',
  upgraded: 'Plan activated',
  assigned: 'Plan activated',
  admin_assigned: 'Plan activated',
  razorpay_paid: 'Plan activated',
  downgrade_scheduled: 'Downgrade scheduled',
  cancel_scheduled: 'Cancellation scheduled',
  canceled: 'Subscription canceled',
};

function highlights(pkg: Package) {
  if (pkg.slug === 'starter') return ['YouTube video analysis', 'Quick reports', 'AI-powered insights', 'Email support'];
  if (pkg.slug === 'growth') return ['Everything in Starter', 'Lead Discovery', 'Advanced reports', 'Priority support'];
  if (pkg.slug === 'business') return ['Everything in Growth', 'Team collaboration', pkg.seats ? `${pkg.seats} team seats` : 'Team seats', 'Dedicated support'];
  const names = pkg.features.map((feature) => feature.name);
  return names.length ? names : ['Email support'];
}

function planIcon(pkg: Package) {
  if (pkg.slug === 'growth') return { name: 'TrophyIcon', tone: 'bg-amber-50 text-amber-500' };
  if (pkg.slug === 'business') return { name: 'RocketLaunchIcon', tone: 'bg-violet-50 text-violet-600' };
  return { name: 'SparklesIcon', tone: 'bg-emerald-50 text-emerald-600' };
}

function shownPrice(pkg: Package, yearly: boolean) {
  if (!yearly) return { amount: pkg.price_monthly, cycle: 'month' };
  const annual = pkg.price_yearly && pkg.price_yearly > 0 ? pkg.price_yearly : pkg.price_monthly * 12;
  return { amount: annual, cycle: 'year' };
}

function stamp(iso?: string | null, withTime = false) {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

function slashDate(iso?: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
}

function daysUntil(iso?: string | null) {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return days >= 0 ? days : null;
}

function downloadFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function PlanArt() {
  return (
    <div className="pointer-events-none absolute right-[250px] top-10 hidden h-56 w-56 lg:block" aria-hidden>
      <span className="absolute left-6 top-8 h-14 w-14 rounded-2xl bg-white shadow-md animate-[create-float_5s_ease-in-out_infinite]" />
      <span className="absolute right-4 top-2 h-12 w-12 rounded-2xl bg-rose-100 shadow-md animate-[create-float_4.2s_ease-in-out_infinite]" />
      <span className="absolute bottom-6 left-2 h-12 w-16 rounded-2xl bg-sky-100 shadow-md animate-[create-float_6s_ease-in-out_infinite]" />
      <svg viewBox="0 0 160 180" className="absolute inset-0 h-full w-full animate-[create-float_4.6s_ease-in-out_infinite]">
        <path d="M80 18c18 22 28 46 28 72 0 18-6 34-16 46l-12 16-12-16c-10-12-16-28-16-46 0-26 10-50 28-72z" fill="#8B5CF6" />
        <path d="M80 42c10 16 16 32 16 48 0 10-3 20-8 28l-8 10-8-10c-5-8-8-18-8-28 0-16 6-32 16-48z" fill="#F5F3FF" />
        <circle cx="80" cy="86" r="10" fill="#7C3AED" />
        <path d="M52 112c-16 8-28 24-32 40 14-6 28-8 40-4" fill="#F472B6" />
        <path d="M108 112c16 8 28 24 32 40-14-6-28-8-40-4" fill="#38BDF8" />
        <path d="M68 150c4 12 8 18 12 22 4-4 8-10 12-22" fill="#FB923C" />
      </svg>
    </div>
  );
}

export default function BillingPage() {
  const [data, setData] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Package | 'cancel' | null>(null);
  const [yearly, setYearly] = useState(false);
  const [compare, setCompare] = useState(false);

  const load = async () => {
    const res = await fetch('/api/billing');
    const body = await res.json();
    if (res.ok) setData(body);
  };

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) setError(params.get('error') || '');
    if (params.get('paid')) setNotice(params.get('paid') || '');
  }, []);

  const pay = async (pkg: Package) => {
    setBusy(pkg.id);
    setError('');
    setNotice('');
    try {
      if (!data?.razorpay?.configured) throw new Error('Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment.');
      const orderRes = await fetch('/api/billing/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error || 'Could not start Razorpay');
      if (!order.checkoutUrl) throw new Error('Could not open the payment page.');
      window.location.assign(order.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not complete payment');
      setBusy('');
    }
  };

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

  const cancelPlan = async () => {
    setBusy('cancel');
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not cancel Autopay');
      setNotice(body.notice);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel Autopay');
    } finally {
      setBusy('');
    }
  };

  if (!data) return <p className="text-slate-500">Loading billing…</p>;

  const current = data.package;
  const price = data.access.priceMonthly || current?.price_monthly || 0;
  const trialing = data.account.status === 'trialing' || data.access.subscriptionStatus === 'trialing';
  const renewIso = data.access.periodEnd || data.account.current_period_end || data.account.trial_ends_at;
  const trialDays = trialing ? daysUntil(data.account.trial_ends_at) : null;
  const used = data.usage?.analyses || 0;
  const included = data.usage?.included;
  const pct = included == null ? 100 : Math.min(100, Math.round((used / Math.max(included, 1)) * 100));
  const cancelScheduled = data.events.some((event) => event.event_type === 'cancel_scheduled');
  const packages = [...data.packages].sort((a, b) => a.price_monthly - b.price_monthly);
  const savePct = Math.max(0, ...packages.map((pkg) => {
    const annual = pkg.price_yearly || 0;
    const full = pkg.price_monthly * 12;
    if (!annual || annual >= full) return 0;
    return Math.round((1 - annual / full) * 100);
  }));
  const featureNames = [...new Set(packages.flatMap((pkg) => pkg.features.map((feature) => feature.name)))];
  const paymentEvents = data.events.filter((event) => ['trial_started', 'razorpay_paid', 'upgraded', 'assigned', 'admin_assigned'].includes(event.event_type));
  const history = [...data.events].reverse();

  const invoiceRows = paymentEvents.map((event) => {
    const trial = event.event_type === 'trial_started';
    const amount = trial ? 0 : Number(event.payload?.amount || price);
    return {
      id: event.id,
      date: stamp(event.created_at),
      description: `${event.to_name || current?.name || 'Plan'}${trial ? ' (Trial)' : ''}`,
      amount,
      status: 'Success',
    };
  });

  const exportInvoices = () => {
    const lines = ['Date,Description,Amount,Status', ...invoiceRows.map((row) => `${row.date},"${row.description}",${row.amount},${row.status}`)];
    downloadFile('hookooh-invoices.csv', lines.join('\n'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your plan, view usage and transactions. Upgrade anytime to unlock more power for your YouTube research.</p>
      </div>
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="relative overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-sm">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-gradient-to-br from-white via-fuchsia-50/80 to-sky-50 lg:block" />
        <PlanArt />
        <div className="relative grid items-center gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:p-8">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Current Plan</span>
            <h2 className="mt-3 font-bricolage text-4xl font-bold text-slate-900">{current?.name || 'No package'}</h2>
            <p className="mt-1">
              <span className="font-bricolage text-3xl font-bold text-slate-900">{formatInr(price)}</span>
              <span className="text-base font-medium text-slate-400"> / month</span>
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {renewIso ? <>Renews on {slashDate(renewIso)}</> : 'Renewal date appears after Autopay is authorized.'}
              {trialDays != null ? <> · Trial ends in {trialDays} {trialDays === 1 ? 'day' : 'days'}</> : null}
            </p>
            <div className="mt-4 max-w-md">
              <div className="h-2 overflow-hidden rounded-full bg-violet-100">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                {included == null ? 'Unlimited analyses' : `${used} of ${included} analyses used`}
                <Icon name="InformationCircleIcon" size={14} className="text-slate-400" />
              </p>
            </div>
            {data.canManage ? (
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="btn-primary" onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  Manage Plan <Icon name="ArrowRightIcon" size={16} />
                </button>
                <button type="button" className="btn-secondary" disabled={cancelScheduled || busy === 'cancel'} onClick={() => setConfirm('cancel')}>
                  {cancelScheduled ? 'Cancellation scheduled' : 'Cancel Subscription'}
                </button>
              </div>
            ) : null}
          </div>
          <aside className="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold text-slate-900">Your plan includes</p>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              {(current ? highlights(current) : ['Choose a package to see what is included.']).map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <Icon name="CheckCircleIcon" size={16} className="text-emerald-500" /> {line}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section id="plans" className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bricolage text-2xl font-bold text-slate-900">Other available packages</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="text-sm font-semibold text-violet-600" onClick={() => setCompare((value) => !value)}>
              Compare plans →
            </button>
            <div className="inline-flex items-center rounded-full bg-slate-100 p-1 text-sm font-semibold">
              <button type="button" className={`rounded-full px-3 py-1 ${yearly ? 'text-slate-500' : 'bg-violet-600 text-white shadow-sm'}`} onClick={() => setYearly(false)}>Monthly</button>
              <button type="button" className={`rounded-full px-3 py-1 ${yearly ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500'}`} onClick={() => setYearly(true)}>Yearly</button>
            </div>
            {savePct > 0 ? <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">Save {savePct}%</span> : null}
          </div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {packages.map((item) => {
            const active = item.id === current?.id;
            const higher = item.price_monthly > price;
            const priceView = shownPrice(item, yearly);
            const icon = planIcon(item);
            return (
              <article key={item.id} className={`flex flex-col rounded-3xl border bg-white p-5 ${active ? 'border-violet-400 shadow-[0_0_0_4px_rgba(196,181,253,0.35)]' : 'border-slate-200'}`}>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${icon.tone}`}>
                  <Icon name={icon.name} size={22} />
                </span>
                <h3 className="mt-4 font-bricolage text-2xl font-bold text-slate-900">{item.name}</h3>
                <p className="mt-1">
                  <span className="text-2xl font-bold text-slate-900">{formatInr(priceView.amount)}</span>
                  <span className="text-sm text-slate-400"> / {priceView.cycle}</span>
                </p>
                {item.short_description ? <p className="mt-2 text-sm text-slate-500">{item.short_description}</p> : null}
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                  {highlights(item).map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Icon name="CheckIcon" size={16} className="mt-0.5 text-emerald-500" /> {line}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  {active ? (
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                      <Icon name="CheckCircleIcon" size={16} /> Current plan
                    </p>
                  ) : data.canManage ? (
                    <button type="button" className={higher ? 'btn-primary w-full' : 'btn-secondary w-full'} onClick={() => setConfirm(item)}>
                      {higher ? `Upgrade to ${item.name}` : `Downgrade to ${item.name}`}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        {compare ? (
          <div className="mt-4 overflow-x-auto rounded-3xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Feature</th>
                  {packages.map((pkg) => <th key={pkg.id} className="px-4 py-3 font-semibold">{pkg.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {featureNames.map((name) => (
                  <tr key={name} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">{name}</td>
                    {packages.map((pkg) => (
                      <td key={pkg.id} className="px-4 py-3">
                        {pkg.features.some((feature) => feature.name === name)
                          ? <Icon name="CheckIcon" size={16} className="text-emerald-500" />
                          : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Icon name="CalendarDaysIcon" size={18} />
            </span>
            <div>
              <h2 className="font-bricolage text-xl font-bold text-slate-900">Subscription history</h2>
              <p className="text-sm text-slate-500">View your past and upcoming subscription details.</p>
            </div>
          </div>
          <ol className="relative mt-5 space-y-4 border-l border-slate-100 pl-5">
            {history.map((event) => (
              <li key={event.id} className="relative">
                <span className={`absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full ${event.event_type === 'cancel_scheduled' || event.event_type === 'canceled' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <p className="font-semibold text-slate-900">{EVENT_LABEL[event.event_type] || event.event_type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-slate-500">{event.to_name || event.from_name || current?.name || 'Plan'}</p>
                <p className="text-xs text-slate-400">{stamp(event.created_at, true)}</p>
              </li>
            ))}
            {renewIso && !cancelScheduled ? (
              <li className="relative">
                <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full bg-violet-500" />
                <p className="font-semibold text-slate-900">Renews on</p>
                <p className="text-sm text-slate-500">{formatInr(price)} / month</p>
                <p className="text-xs text-slate-400">{stamp(renewIso)}</p>
              </li>
            ) : null}
            {history.length === 0 && !renewIso ? <li className="text-sm text-slate-500">No billing events yet.</li> : null}
          </ol>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bricolage text-xl font-bold text-slate-900">Transactions</h2>
              <p className="text-sm text-slate-500">View your payments and invoices.</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={exportInvoices} disabled={!invoiceRows.length}>
              <Icon name="ArrowDownTrayIcon" size={14} /> Download invoices
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2 pr-3 font-semibold">Date</th>
                  <th className="py-2 pr-3 font-semibold">Description</th>
                  <th className="py-2 pr-3 font-semibold">Amount</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {invoiceRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-slate-700">
                    <td className="py-3 pr-3">{row.date}</td>
                    <td className="py-3 pr-3">{row.description}</td>
                    <td className="py-3 pr-3">{formatInr(row.amount)}</td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        <Icon name="CheckIcon" size={12} /> {row.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-violet-600"
                        aria-label={`Download invoice for ${row.description}`}
                        onClick={() => downloadFile(`hookooh-${row.id}.csv`, `Date,Description,Amount,Status\n${row.date},"${row.description}",${row.amount},${row.status}\n`)}
                      >
                        <Icon name="ArrowDownTrayIcon" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {invoiceRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-slate-500">No payments yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {confirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            {confirm === 'cancel' ? (
              <>
                <h3 className="font-bricolage text-xl font-bold">Cancel subscription</h3>
                <p className="mt-2 text-sm text-slate-600">Autopay stops at the end of this period. You keep {current?.name || 'your plan'} until {renewIso ? slashDate(renewIso) : 'then'}.</p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setConfirm(null)}>Keep plan</button>
                  <button type="button" className="btn-danger" disabled={Boolean(busy)} onClick={() => void cancelPlan()}>{busy === 'cancel' ? 'Working…' : 'Cancel Autopay'}</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bricolage text-xl font-bold">{confirm.price_monthly >= price ? 'Pay with Razorpay' : 'Downgrade package'}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {confirm.price_monthly >= price
                    ? `Razorpay bills ${formatInr(confirm.price_monthly)} each month for ${confirm.name}. The charge opens on the registered payment page.`
                    : `You move to ${confirm.name} at the next renewal${renewIso ? ` (${slashDate(renewIso)})` : ''}. Features that are not in that plan stay until then.`}
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    className="btn-primary"
                    onClick={() => void (confirm.price_monthly >= price ? pay(confirm) : applyDowngrade(confirm))}
                  >
                    {busy ? 'Working…' : confirm.price_monthly >= price ? 'Continue to payment' : 'Confirm'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
