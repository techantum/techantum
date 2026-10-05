'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import CreateTemplateDialog from '@/components/whatsapp/CreateTemplateDialog';
import { HelpCard, Pill, StatTile, formatWhen, qualityDot, templateDisplayStatus } from '@/components/whatsapp/portal-ui';

type Template = {
  id: string;
  name: string;
  category?: string;
  language?: string;
  body?: string;
  quality_status?: string;
  internal_status?: string;
  meta_status?: string;
  updated_at?: string;
  rejection_reason?: string;
};

const TABS = [
  { id: 'ALL', label: 'All Templates' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'DRAFT', label: 'Drafts' },
];

export default function PortalTemplatesPage() {
  const [rows, setRows] = useState<Template[]>([]);
  const [counts, setCounts] = useState({ all: 0, approved: 0, pending: 0, rejected: 0, drafts: 0 });
  const [tab, setTab] = useState('ALL');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [total, setTotal] = useState(0);

  const load = () => {
    const params = new URLSearchParams({ tab, q, pageSize: '25' });
    fetch(`/api/portal/wa/templates?${params}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Could not load templates.');
        setRows(body.rows || []);
        setCounts(body.counts || counts);
        setTotal(body.total || 0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  };

  useEffect(load, [tab, q]);

  const filtered = rows.filter((row) => {
    const catOk = !category || String(row.category || '').toUpperCase() === category;
    const langOk = !language || String(row.language || '') === language;
    return catOk && langOk;
  });

  const submit = async (id: string) => {
    setBusyId(id);
    setError('');
    try {
      const res = await fetch('/api/portal/wa/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Meta could not receive this template.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Templates</p>
          <h1 className="mt-1 font-bricolage text-3xl font-bold text-slate-900">WhatsApp Message Templates</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Create, manage and get approval for your message templates from Meta. Use templates to send proactive messages to your customers.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-sm font-semibold text-slate-900">Need help with templates?</p>
          <p className="mt-1 text-xs text-slate-500">Our team can help you create and get your templates approved quickly.</p>
          <a href="/contact" className="mt-3 inline-flex rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-white">
            Book a Free Consultation
          </a>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(4,1fr)_auto]">
        <StatTile label="Total Templates" value={counts.all} hint="From last month" icon="DocumentTextIcon" />
        <StatTile label="Approved" value={counts.approved} hint="Ready to send" icon="CheckCircleIcon" tone="emerald" />
        <StatTile label="Pending" value={counts.pending} hint="Under Meta review" icon="ClockIcon" tone="amber" />
        <StatTile label="Rejected" value={counts.rejected} hint="Needs attention" icon="XCircleIcon" tone="rose" />
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-semibold text-white">
          <Icon name="PlusIcon" size={16} /> Create Template
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1">
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === item.id ? 'bg-secondary text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {item.label}
                {item.id === 'ALL' ? `(${counts.all})` : item.id === 'APPROVED' ? `(${counts.approved})` : item.id === 'PENDING' ? `(${counts.pending})` : item.id === 'REJECTED' ? `(${counts.rejected})` : `(${counts.drafts})`}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative">
              <Icon name="MagnifyingGlassIcon" size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates by name or category" className="rounded-full border border-slate-200 py-2 pl-8 pr-3 text-sm" />
            </label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">
              <option value="">All Categories</option>
              <option value="UTILITY">Utility</option>
              <option value="MARKETING">Marketing</option>
              <option value="AUTHENTICATION">Authentication</option>
            </select>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-full border border-slate-200 px-3 py-2 text-sm">
              <option value="">All Languages</option>
              <option value="en">English (en)</option>
              <option value="en_US">English (en_US)</option>
              <option value="hi">Hindi (hi)</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Template Name</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Language</th>
                <th className="px-3 py-3">Quality Rating</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Last Updated</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const status = templateDisplayStatus(row);
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="line-clamp-1 text-xs text-slate-400">{row.body || row.rejection_reason || ''}</p>
                    </td>
                    <td className="px-3 py-4">{row.category || '—'}</td>
                    <td className="px-3 py-4">{row.language || '—'}</td>
                    <td className="px-3 py-4">{qualityDot(row.quality_status)}</td>
                    <td className="px-3 py-4">
                      <Pill label={status.label} tone={status.tone} />
                    </td>
                    <td className="px-3 py-4">{formatWhen(row.updated_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-3">
                        <button type="button" className="text-xs font-semibold text-slate-500">
                          View
                        </button>
                        {status.label !== 'Approved' && status.label !== 'Pending' ? (
                          <button type="button" disabled={busyId === row.id} onClick={() => submit(row.id)} className="text-xs font-semibold text-secondary">
                            {busyId === row.id ? 'Submitting…' : 'Request Meta'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-400">
                    No templates in this view. Create one and request Meta approval.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">Showing {filtered.length} of {total} templates</p>
      </div>

      <HelpCard />
      {open ? <CreateTemplateDialog onClose={() => setOpen(false)} onDone={load} /> : null}
    </div>
  );
}
