'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { formatInr, packageIconTone } from '@/lib/saas/money';
import type { CatalogFeature, CatalogPackage } from '@/lib/saas/catalog';

const input = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400';
const ICONS = ['RocketLaunchIcon', 'ChartBarIcon', 'TrophyIcon', 'SparklesIcon', 'CubeIcon', 'BoltIcon'];
const TABS = [
  { id: 'basic', label: 'Basic Information', icon: 'InformationCircleIcon' },
  { id: 'features', label: 'Features', icon: 'Squares2X2Icon' },
  { id: 'pricing', label: 'Pricing', icon: 'BanknotesIcon' },
  { id: 'description', label: 'Description', icon: 'DocumentTextIcon' },
  { id: 'display', label: 'Display Settings', icon: 'ComputerDesktopIcon' },
] as const;

const emptyForm = {
  id: '',
  name: '',
  price_monthly: '',
  price_yearly: '',
  billing_cycle: 'monthly' as 'monthly' | 'yearly',
  status: 'active' as 'active' | 'inactive',
  short_description: '',
  description_html: '',
  icon: 'CubeIcon',
  highlight: false,
  seats: '',
  sort_order: '100',
  feature_ids: [] as string[],
};

function yearlySave(monthly: number, yearly: number | null) {
  if (!yearly || !monthly) return 0;
  return Math.max(0, Math.round((1 - yearly / (monthly * 12)) * 100));
}

function FeatureMark({ feature, on }: { feature: CatalogFeature; on: boolean }) {
  const visual =
    feature.feature_key === 'youtube_research'
      ? { icon: 'PlayCircleIcon', tone: 'text-red-500' }
      : feature.feature_key === 'lead_discovery'
        ? { icon: 'MapPinIcon', tone: 'text-sky-600' }
        : { icon: feature.icon || 'UsersIcon', tone: 'text-blue-600' };
  return (
    <p className={`flex items-center gap-1.5 text-sm ${on ? 'text-slate-700' : 'text-slate-300'}`}>
      <Icon name={visual.icon} size={15} className={on ? visual.tone : 'text-slate-300'} />
      <span className="flex-1">{feature.name}</span>
      <Icon name={on ? 'CheckIcon' : 'XMarkIcon'} size={14} className={on ? 'text-emerald-500' : 'text-slate-300'} />
    </p>
  );
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<CatalogPackage[]>([]);
  const [features, setFeatures] = useState<CatalogFeature[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('basic');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState(false);

  const load = useCallback(async (keepId?: string) => {
    const [pkg, feat] = await Promise.all([fetch('/api/admin/packages'), fetch('/api/admin/features')]);
    const packagesBody = await pkg.json();
    const featuresBody = await feat.json();
    const rows: CatalogPackage[] = packagesBody.rows || [];
    setPackages(rows);
    setFeatures(featuresBody.rows || []);
    const current = rows.find((item) => item.id === keepId) || rows[0];
    if (current) applyForm(current);
    else setForm(emptyForm);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const applyForm = (item?: CatalogPackage) => {
    if (!item) {
      setForm(emptyForm);
      return;
    }
    setForm({
      id: item.id,
      name: item.name,
      price_monthly: String(item.price_monthly),
      price_yearly: item.price_yearly == null ? '' : String(item.price_yearly),
      billing_cycle: item.billing_cycle,
      status: item.status,
      short_description: item.short_description || '',
      description_html: item.description_html,
      icon: item.icon,
      highlight: item.highlight,
      seats: item.seats == null ? '' : String(item.seats),
      sort_order: String(item.sort_order || 100),
      feature_ids: item.feature_ids,
    });
    setTab('basic');
    setMessage('');
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          id: form.id || undefined,
          price_monthly: Number(form.price_monthly),
          price_yearly: form.price_yearly === '' ? null : Number(form.price_yearly),
          seats: form.seats === '' ? null : Number(form.seats),
          sort_order: Number(form.sort_order || 100),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save package');
      await load(data.id || form.id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save package');
    } finally {
      setSaving(false);
    }
  };

  const monthly = Number(form.price_monthly || 0);
  const yearly = form.price_yearly === '' ? null : Number(form.price_yearly);
  const savePct = yearlySave(monthly, yearly);
  const selectedFeatures = useMemo(
    () => features.filter((feature) => form.feature_ids.includes(feature.id)),
    [features, form.feature_ids]
  );

  const stats = [
    { label: 'Total Packages', value: packages.length, icon: 'CubeIcon', tone: 'bg-sky-50 text-sky-600' },
    { label: 'Active Subscribers', value: packages.reduce((sum, item) => sum + item.subscriber_count, 0), icon: 'UserGroupIcon', tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Features', value: features.filter((item) => item.status === 'active').length, icon: 'Squares2X2Icon', tone: 'bg-violet-50 text-violet-600' },
    {
      label: 'Package Adoption',
      value: `${packages.length ? Math.round((packages.filter((item) => item.subscriber_count > 0).length / packages.length) * 100) : 0}%`,
      icon: 'ChartBarIcon',
      tone: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Subscription Packages</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage packages, set pricing, and assign features. Subscribers will get access to the features included in their active package.</p>
        </div>
        <button type="button" onClick={() => { setForm(emptyForm); setTab('basic'); setMessage(''); }} className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED] px-4 py-2.5 text-sm font-semibold text-white">
          <Icon name="PlusIcon" size={16} /> Add Package
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}>
              <Icon name={item.icon} size={18} />
            </span>
            <p className="mt-3 font-bricolage text-2xl font-bold text-slate-900">{item.value}</p>
            <p className="text-xs text-slate-500">{item.label}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">Package</th>
              <th className="px-5 py-3">Price</th>
              <th className="px-5 py-3">Features</th>
              <th className="px-5 py-3">Subscribers</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((item, index) => (
              <tr key={item.id} className={`border-t border-slate-50 ${form.id === item.id ? 'bg-violet-50/40' : ''}`}>
                <td className="px-5 py-4">
                  <button type="button" className="flex items-center gap-3 text-left" onClick={() => applyForm(item)}>
                    <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${packageIconTone(item.name, index)}`}>
                      <Icon name={item.icon} size={18} />
                    </span>
                    <span>
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        {item.name}
                        {item.highlight ? <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Most Popular</span> : null}
                      </span>
                      <span className="mt-0.5 block max-w-[240px] text-xs text-slate-400">{item.short_description}</span>
                    </span>
                  </button>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">{formatInr(item.price_monthly)} / month</p>
                  {item.price_yearly ? (
                    <>
                      <p className="text-xs text-slate-400">{formatInr(item.price_yearly)} / year</p>
                      {yearlySave(item.price_monthly, item.price_yearly) ? <p className="text-xs font-semibold text-emerald-600">Save {yearlySave(item.price_monthly, item.price_yearly)}%</p> : null}
                    </>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <div className="min-w-[180px] space-y-1">
                    {features.map((feature) => (
                      <FeatureMark key={feature.id} feature={feature} on={item.feature_ids.includes(feature.id)} />
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{item.subscriber_count} subscribers</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> {item.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => applyForm(item)} className="rounded-full border border-slate-200 p-2 text-slate-500" aria-label={`Edit ${item.name}`}>
                      <Icon name="PencilSquareIcon" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bricolage text-xl font-bold text-slate-900">{form.id ? 'Edit Package' : 'Add Package'}</h2>
            <p className="text-sm text-slate-500">Update package details, features and pricing.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => applyForm(packages.find((item) => item.id === form.id) || packages[0])} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button type="button" disabled={saving} onClick={() => void save()} className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Package'}
            </button>
          </div>
        </div>
        {message ? <p className="px-5 pt-3 text-sm text-rose-600">{message}</p> : null}
        <div className="grid lg:grid-cols-[210px_1fr_280px]">
          <aside className="space-y-1 border-b border-slate-100 p-3 lg:border-b-0 lg:border-r">
            {TABS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${tab === item.id ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <NavIcon name={item.icon} itemKey={item.id} delay={index * 120} className="h-7 w-7 rounded-lg" size={14} /> {item.label}
              </button>
            ))}
          </aside>
          <div className="space-y-4 p-5">
            {tab === 'basic' ? (
              <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">Package Name *
                      <input className={input} value={form.name} placeholder="Enter package name" onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    </label>
                    <label className="text-sm font-medium">Status
                      <select className={input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'active' | 'inactive' })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-sm font-medium">Short Description
                    <input className={input} value={form.short_description} placeholder="Enter short description" onChange={(event) => setForm({ ...form, short_description: event.target.value })} />
                  </label>
                </div>
                <div className="flex flex-col items-center justify-center rounded-2xl bg-violet-50 p-4 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
                    <Icon name={form.icon} size={28} />
                  </span>
                  <button type="button" className="mt-3 text-xs font-semibold text-violet-700" onClick={() => setPicker((value) => !value)}>Change Icon</button>
                  <p className="mt-1 text-[10px] text-slate-400">Recommended: 64×64 PNG, SVG or JPG</p>
                </div>
                {picker ? (
                  <div className="flex flex-wrap gap-2 md:col-span-2">
                    {ICONS.map((icon) => (
                      <button key={icon} type="button" onClick={() => { setForm({ ...form, icon }); setPicker(false); }} className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${form.icon === icon ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200'}`}>
                        <Icon name={icon} size={20} />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {tab === 'features' ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Select which application features subscribers can access.</p>
                {features.map((feature) => {
                  const checked = form.feature_ids.includes(feature.id);
                  return (
                    <label key={feature.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 ${checked ? 'border-violet-200 bg-violet-50/60' : 'border-slate-100'}`}>
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={checked}
                        onChange={() => setForm({ ...form, feature_ids: checked ? form.feature_ids.filter((id) => id !== feature.id) : [...form.feature_ids, feature.id] })}
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{feature.name}</span>
                        <span className="text-xs text-slate-500">{feature.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
            {tab === 'pricing' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">Package Price (₹) *
                  <input className={input} type="number" min={0} value={form.price_monthly} placeholder="Enter price" onChange={(event) => setForm({ ...form, price_monthly: event.target.value })} />
                </label>
                <label className="text-sm font-medium">Yearly price (₹)
                  <input className={input} type="number" min={0} value={form.price_yearly} placeholder="Enter yearly price" onChange={(event) => setForm({ ...form, price_yearly: event.target.value })} />
                </label>
                <label className="text-sm font-medium">Billing Cycle
                  <select className={input} value={form.billing_cycle} onChange={(event) => setForm({ ...form, billing_cycle: event.target.value as 'monthly' | 'yearly' })}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </label>
              </div>
            ) : null}
            {tab === 'description' ? (
              <div>
                <p className="mb-2 text-sm font-medium">Package Description & Benefits</p>
                <RichTextEditor value={form.description_html} onChange={(description_html) => setForm({ ...form, description_html })} placeholder="Enter package benefits" />
                <p className="mt-1 text-xs text-slate-400">Marketing copy only. Access is granted only by selected catalog features.</p>
              </div>
            ) : null}
            {tab === 'display' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-2xl border border-slate-100 px-3 py-3 text-sm font-medium">
                  <input type="checkbox" checked={form.highlight} onChange={(event) => setForm({ ...form, highlight: event.target.checked })} />
                  Mark as most popular
                </label>
                <label className="text-sm font-medium">Seat limit
                  <input className={input} type="number" min={0} value={form.seats} placeholder="Enter seat limit" onChange={(event) => setForm({ ...form, seats: event.target.value })} />
                </label>
                <label className="text-sm font-medium">Sort order
                  <input className={input} type="number" value={form.sort_order} placeholder="Enter sort order" onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />
                </label>
              </div>
            ) : null}
          </div>
          <aside className="border-t border-slate-100 bg-[#F8F7FF] p-5 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-slate-800">Package Preview</p>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${packageIconTone(form.name)}`}>
                  <Icon name={form.icon} size={18} />
                </span>
                {savePct ? <span className="text-xs font-semibold text-emerald-600">Save {savePct}%</span> : null}
              </div>
              <p className="mt-3 font-bricolage text-lg font-bold">{form.name || 'Package name'}</p>
              <p className="text-lg font-semibold">{formatInr(monthly)} <span className="text-sm font-medium text-slate-400">/ month</span></p>
              {yearly ? <p className="text-xs text-slate-400">{formatInr(yearly)} / year</p> : null}
              <p className="mt-2 text-xs text-slate-500">{form.short_description || 'Enter short description'}</p>
              <ul className="mt-3 space-y-1">
                {features.map((feature) => (
                  <li key={feature.id}>
                    <FeatureMark feature={feature} on={form.feature_ids.includes(feature.id)} />
                  </li>
                ))}
              </ul>
              {selectedFeatures.length === 0 ? <p className="mt-2 text-xs text-slate-400">No features selected</p> : null}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
