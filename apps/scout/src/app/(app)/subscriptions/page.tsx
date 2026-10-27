'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { formatDateIn, formatInr, packageIconTone, planTone } from '@/lib/saas/money';
import type { CatalogPackage } from '@/lib/saas/catalog';

type Row = {
  id: string;
  name: string;
  email: string;
  status: string;
  plan: string;
  package_id: string | null;
  package_name: string | null;
  price_monthly: number | string | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  seats_used: string;
  subscription_status: string | null;
  started_at: string | null;
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'S';
}

function statusTone(status: string) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700';
  if (status === 'trialing' || status === 'trial') return 'bg-sky-50 text-sky-700';
  if (status === 'canceled' || status === 'cancelled') return 'bg-rose-50 text-rose-600';
  if (status === 'expired') return 'bg-orange-50 text-orange-700';
  return 'bg-slate-100 text-slate-600';
}

function FeatureLine({ name, featureKey }: { name: string; featureKey: string }) {
  const icon = featureKey === 'youtube_research' ? 'PlayCircleIcon' : featureKey === 'lead_discovery' ? 'MapPinIcon' : 'UsersIcon';
  const tone = featureKey === 'youtube_research' ? 'text-red-500' : featureKey === 'lead_discovery' ? 'text-sky-600' : 'text-blue-600';
  return (
    <p className="flex items-center gap-2 text-sm text-slate-700">
      <Icon name={icon} size={16} className={tone} />
      <span className="flex-1">{name}</span>
      <Icon name="CheckIcon" size={14} className="text-emerald-500" />
    </p>
  );
}

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'overview' | 'billing' | 'features' | 'activity'>('overview');
  const [events, setEvents] = useState<{ id: string; event_type: string; created_at: string; from_name: string | null; to_name: string | null }[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [addOpen, setAddOpen] = useState(false);
  const [addAccount, setAddAccount] = useState('');
  const [addPackage, setAddPackage] = useState('');

  const load = useCallback(async () => {
    const [subs, pkgs] = await Promise.all([fetch('/api/admin/subscriptions'), fetch('/api/admin/packages')]);
    const subBody = await subs.json();
    const pkgBody = await pkgs.json();
    const next: Row[] = subBody.rows || [];
    setRows(next);
    setPackages(pkgBody.rows || []);
    setSelectedId((current) => current || next[0]?.id || null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = rows.find((row) => row.id === selectedId) || null;
  const selectedPackage = packages.find((item) => item.id === selected?.package_id) || packages.find((item) => item.name === selected?.package_name);

  const openRow = (row: Row) => {
    setSelectedId(row.id);
    setPanelTab('overview');
    void fetch(`/api/admin/subscriptions?accountId=${row.id}`)
      .then((res) => res.json())
      .then((data) => setEvents(data.events || []));
  };

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const hay = `${row.name} ${row.email} ${row.package_name || ''}`.toLowerCase();
      if (query && !hay.includes(query.toLowerCase())) return false;
      if (planFilter !== 'all' && row.package_id !== planFilter) return false;
      const status = (row.subscription_status || row.status || '').toLowerCase();
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      return true;
    });
  }, [rows, query, planFilter, statusFilter]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => {
    setPage(1);
  }, [query, planFilter, statusFilter, perPage]);

  const assign = async (accountId: string, packageId: string) => {
    if (!packageId) return;
    setBusy(accountId);
    setMessage('');
    const res = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, packageId }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || 'Could not assign package');
    else {
      if (data.events) setEvents(data.events);
      setAddOpen(false);
      await load();
    }
    setBusy('');
  };

  const cancel = async (accountId: string) => {
    if (!window.confirm('Cancel this subscription? Workspace data is kept.')) return;
    setBusy(accountId);
    const res = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, action: 'cancel' }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || 'Could not cancel');
    else await load();
    setBusy('');
  };

  const counts = {
    total: rows.length,
    active: rows.filter((row) => (row.subscription_status || row.status) === 'active').length,
    trial: rows.filter((row) => (row.subscription_status || row.status) === 'trialing').length,
    ended: rows.filter((row) => ['canceled', 'expired'].includes(row.subscription_status || row.status || '')).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Manage Subscriptions</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage all subscriber subscriptions, billing status and plan details.</p>
        </div>
        <button type="button" onClick={() => { setAddAccount(rows[0]?.id || ''); setAddPackage(packages[0]?.id || ''); setAddOpen(true); }} className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white">
          <Icon name="PlusIcon" size={16} /> Add Subscription
        </button>
      </div>
      {message ? <p className="text-sm text-rose-600">{message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total Subscribers', counts.total, 'UserGroupIcon', 'bg-sky-50 text-sky-600'],
          ['Active Subscriptions', counts.active, 'CheckCircleIcon', 'bg-emerald-50 text-emerald-600'],
          ['Trial Subscriptions', counts.trial, 'ClockIcon', 'bg-amber-50 text-amber-600'],
          ['Expired / Cancelled', counts.ended, 'XCircleIcon', 'bg-rose-50 text-rose-600'],
        ].map(([label, value, icon, tone]) => (
          <article key={label as string} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
              <Icon name={icon as string} size={18} />
            </span>
            <p className="mt-3 font-bricolage text-2xl font-bold">{value as number}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </article>
        ))}
      </div>

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
            <label className="relative min-w-[220px] flex-1">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm" placeholder="Enter search" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
              <option value="all">All Plans</option>
              {packages.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trialing">Trial</option>
              <option value="canceled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3">Subscriber</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Billing cycle</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Next renewal</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const status = (row.subscription_status || row.status || '').toLowerCase();
                return (
                  <tr key={row.id} className={`border-t border-slate-50 ${selectedId === row.id ? 'bg-violet-50/50' : ''}`}>
                    <td className="px-5 py-3">
                      <button type="button" className="flex items-center gap-3 text-left" onClick={() => openRow(row)}>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{initials(row.name)}</span>
                        <span>
                          <span className="block font-semibold text-slate-900">{row.name}</span>
                          <span className="text-xs text-slate-400">{row.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${planTone(row.package_name || row.plan)}`}>{row.package_name || row.plan}</span>
                    </td>
                    <td className="px-5 py-3 capitalize">{row.billing_cycle || 'monthly'}</td>
                    <td className="px-5 py-3">{formatInr(row.price_monthly)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusTone(status)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {status === 'trialing' ? 'Trial' : status === 'canceled' ? 'Cancelled' : status}
                      </span>
                    </td>
                    <td className="px-5 py-3">{formatDateIn(row.current_period_end)}</td>
                    <td className="px-5 py-3">
                      <button type="button" className="rounded-full p-1 text-slate-400" onClick={() => openRow(row)} aria-label={`Open ${row.name}`}>
                        <Icon name="EllipsisHorizontalIcon" size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 ? (
                <tr>
                  <td className="px-5 py-8 text-slate-500" colSpan={7}>No subscriber workspaces yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <p>Showing {(page - 1) * perPage + (visible.length ? 1 : 0)} to {(page - 1) * perPage + visible.length} of {filtered.length} subscribers</p>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded-lg border px-2 py-1" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>&lt;</button>
              {Array.from({ length: Math.min(pages, 7) }, (_, index) => index + 1).map((item) => (
                <button key={item} type="button" onClick={() => setPage(item)} className={`h-7 w-7 rounded-lg ${page === item ? 'bg-[#7C3AED] text-white' : 'border border-slate-200'}`}>{item}</button>
              ))}
              <button type="button" className="rounded-lg border px-2 py-1" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>&gt;</button>
              <select className="h-8 rounded-lg border border-slate-200 px-2" value={perPage} onChange={(event) => setPerPage(Number(event.target.value))}>
                <option value={8}>8 / page</option>
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
              </select>
            </div>
          </div>
        </section>

        {selected ? (
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{initials(selected.name)}</span>
                <div>
                  <p className="font-semibold text-slate-900">{selected.name}</p>
                  <p className="text-xs text-slate-400">{selected.email}</p>
                  <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone((selected.subscription_status || selected.status || '').toLowerCase())}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> {(selected.subscription_status || selected.status) === 'trialing' ? 'Trial' : 'Active'}
                  </span>
                </div>
              </div>
              <button type="button" className="text-slate-400" onClick={() => setSelectedId(null)} aria-label="Close">
                <Icon name="XMarkIcon" size={16} />
              </button>
            </div>
            <div className="mt-4 flex gap-1 rounded-full bg-slate-100 p-1 text-xs font-semibold">
              {(['overview', 'billing', 'features', 'activity'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setPanelTab(item)} className={`flex-1 rounded-full px-2 py-1.5 capitalize ${panelTab === item ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500'}`}>
                  {item}
                </button>
              ))}
            </div>

            {(panelTab === 'overview' || panelTab === 'billing' || panelTab === 'features') ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current Plan</p>
                    <span className="text-xs font-semibold text-violet-700">Change Plan</span>
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${packageIconTone(selected.package_name)}`}>
                        <Icon name={selectedPackage?.icon || 'ChartBarIcon'} size={16} />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{selected.package_name || selected.plan}</p>
                        <p className="text-[11px] text-slate-400">{selectedPackage?.short_description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">{formatInr(selected.price_monthly)} / month</p>
                      {selectedPackage?.price_yearly ? <p className="text-[11px] text-slate-400">{formatInr(selectedPackage.price_yearly)} / year</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {(selectedPackage?.features || []).map((feature) => (
                      <FeatureLine key={feature.id} name={feature.name} featureKey={feature.feature_key} />
                    ))}
                  </div>
                  <select
                    className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                    disabled={busy === selected.id}
                    value={selected.package_id || ''}
                    onChange={(event) => void assign(selected.id, event.target.value)}
                  >
                    <option value="">Select package</option>
                    {packages.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} · {formatInr(item.price_monthly)} / month</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-slate-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">Subscription Details</p>
                    <span className="text-slate-300"><Icon name="PencilSquareIcon" size={14} /></span>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-slate-400">Status</dt><dd className="font-semibold capitalize text-emerald-600">{(selected.subscription_status || selected.status) === 'trialing' ? 'Trial' : selected.subscription_status || selected.status}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400">Start Date</dt><dd>{formatDateIn(selected.started_at)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400">Next Renewal</dt><dd>{formatDateIn(selected.current_period_end)}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400">Billing Cycle</dt><dd className="capitalize">{selected.billing_cycle || 'Monthly'}</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400">Payment Method</dt><dd className="text-slate-400">Not connected</dd></div>
                    <div className="flex justify-between"><dt className="text-slate-400">Auto Renewal</dt><dd className="font-semibold text-emerald-600">Enabled</dd></div>
                  </dl>
                </div>

                {panelTab === 'activity' || events.length ? null : null}

                <div className="flex gap-2">
                  <button type="button" className="flex-1 rounded-full border border-slate-200 py-2 text-sm font-semibold text-slate-600" onClick={() => window.alert('Invoices will appear here after a payment provider is connected.')}>
                    View Invoices
                  </button>
                  <button type="button" disabled={busy === selected.id} onClick={() => void cancel(selected.id)} className="flex-1 rounded-full border border-rose-200 py-2 text-sm font-semibold text-rose-600">
                    Cancel Subscription
                  </button>
                </div>
              </div>
            ) : null}

            {panelTab === 'activity' ? (
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {events.map((event) => (
                  <li key={event.id}>
                    {event.event_type.replace(/_/g, ' ')}
                    {event.to_name ? ` → ${event.to_name}` : ''}
                    <span className="text-slate-400"> · {formatDateIn(event.created_at)}</span>
                  </li>
                ))}
                {events.length === 0 ? <li className="text-slate-400">No subscription events yet.</li> : null}
              </ul>
            ) : null}
          </aside>
        ) : null}
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="font-bricolage text-xl font-bold">Add Subscription</h3>
            <p className="mt-1 text-sm text-slate-500">Assign a package to a workspace. The contracted Indian rupee price is stored on that subscription.</p>
            <label className="mt-4 block text-sm font-medium">Workspace
              <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={addAccount} onChange={(event) => setAddAccount(event.target.value)}>
                {rows.map((row) => (
                  <option key={row.id} value={row.id}>{row.name} · {row.email}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium">Package
              <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={addPackage} onChange={(event) => setAddPackage(event.target.value)}>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {formatInr(item.price_monthly)} / month</option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => setAddOpen(false)}>Cancel</button>
              <button type="button" disabled={!addAccount || !addPackage || Boolean(busy)} className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white" onClick={() => void assign(addAccount, addPackage)}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
