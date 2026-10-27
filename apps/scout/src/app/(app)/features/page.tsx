'use client';

import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { CatalogFeature } from '@/lib/saas/catalog';

const input = 'mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm';
const empty = { id: '', name: '', feature_key: '', sidebar_label: '', description: '', icon: 'Squares2X2Icon', route: '', status: 'active' as 'active' | 'inactive' };

export default function FeaturesPage() {
  const [rows, setRows] = useState<CatalogFeature[]>([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/features');
    const data = await res.json();
    setRows(data.rows || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setMessage('');
    const res = await fetch('/api/admin/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id: form.id || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Could not save feature');
      return;
    }
    setOpen(false);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Feature Catalog</h1>
          <p className="mt-1 text-sm text-slate-500">Register modules once, then assign them to packages. New modules can be added without changing subscriber navigation code.</p>
        </div>
        <button type="button" onClick={() => { setForm(empty); setOpen(true); }} className="rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">
          + Add Feature
        </button>
      </div>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">Feature</th>
              <th className="px-5 py-3">Feature key</th>
              <th className="px-5 py-3">Sidebar label</th>
              <th className="px-5 py-3">Route</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-50">
                <td className="px-5 py-4">
                  <p className="flex items-center gap-2 font-semibold text-slate-900"><Icon name={row.icon} size={16} /> {row.name}</p>
                  <p className="text-xs text-slate-400">{row.description}</p>
                </td>
                <td className="px-5 py-4 font-mono text-xs text-slate-500">{row.feature_key}</td>
                <td className="px-5 py-4">{row.sidebar_label}</td>
                <td className="px-5 py-4 font-mono text-xs">{row.route}</td>
                <td className="px-5 py-4 capitalize">{row.status}</td>
                <td className="px-5 py-4">
                  <button type="button" className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold" onClick={() => { setForm({ ...row, id: row.id }); setOpen(true); }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {open ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bricolage text-xl font-bold">{form.id ? 'Edit Feature' : 'Add Feature'}</h2>
          {message ? <p className="mt-2 text-sm text-rose-600">{message}</p> : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Feature name<input className={input} value={form.name} placeholder="Enter feature name" onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label className="text-sm font-medium">Feature key<input className={input} value={form.feature_key} placeholder="Enter feature key" onChange={(event) => setForm({ ...form, feature_key: event.target.value })} /></label>
            <label className="text-sm font-medium">Sidebar label<input className={input} value={form.sidebar_label} placeholder="Enter sidebar label" onChange={(event) => setForm({ ...form, sidebar_label: event.target.value })} /></label>
            <label className="text-sm font-medium">Route<input className={input} value={form.route} placeholder="Enter route" onChange={(event) => setForm({ ...form, route: event.target.value })} /></label>
            <label className="text-sm font-medium sm:col-span-2">Description<input className={input} value={form.description} placeholder="Enter description" onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <label className="text-sm font-medium">Icon<input className={input} value={form.icon} placeholder="Enter icon name" onChange={(event) => setForm({ ...form, icon: event.target.value })} /></label>
            <label className="text-sm font-medium">Status
              <select className={input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'active' | 'inactive' })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button>
            <button type="button" onClick={() => void save()} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Save Feature</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
