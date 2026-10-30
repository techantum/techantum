'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BusyButton } from './AuditBusy';

const PAGE_SIZE = 10;
const inputClass = 'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6D5CFF] focus:ring-2 focus:ring-[#6D5CFF]/15';
const card = 'rounded-[20px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
const CATEGORIES = ['seo', 'accessibility', 'content', 'ui', 'ux', 'performance', 'forms', 'responsive'];
const AUTHORITIES = ['WCAG 2.2', 'Google', 'WHATWG', 'web.dev', 'Techantum', 'AI Recommendation'];

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/website-audit/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const emptyForm = {
  id: '',
  rule_code: '',
  rule_name: '',
  category: 'seo',
  source_reference: 'Techantum',
  version: '1.0',
  source_url: '',
  description: '',
  active: true,
  authority_level: 3,
};

function levelFor(authority: string) {
  if (authority.startsWith('WCAG')) return 1;
  if (['Google', 'WHATWG', 'web.dev'].includes(authority)) return 2;
  if (authority.startsWith('AI')) return 4;
  return 3;
}

function categoryStyle(category: string) {
  const map: Record<string, string> = {
    seo: 'bg-violet-50 text-violet-600',
    accessibility: 'bg-sky-50 text-sky-600',
    content: 'bg-emerald-50 text-emerald-600',
    ui: 'bg-orange-50 text-orange-600',
    ux: 'bg-fuchsia-50 text-fuchsia-600',
    performance: 'bg-amber-50 text-amber-600',
    forms: 'bg-rose-50 text-rose-600',
    responsive: 'bg-indigo-50 text-indigo-600',
  };
  return map[category] || 'bg-slate-100 text-slate-600';
}

function iconFor(category: string) {
  const map: Record<string, string> = {
    seo: 'MagnifyingGlassIcon',
    accessibility: 'EyeIcon',
    content: 'DocumentTextIcon',
    ui: 'SwatchIcon',
    ux: 'CursorArrowRaysIcon',
    performance: 'BoltIcon',
    forms: 'ClipboardDocumentListIcon',
    responsive: 'DevicePhoneMobileIcon',
  };
  return map[category] || 'DocumentIcon';
}

export default function WebStandardsScreen() {
  const [rules, setRules] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [authority, setAuthority] = useState('');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    const data = await api('webmaster/standards');
    setRules(data.rules || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((row) => {
      if (category && row.category !== category) return false;
      if (authority && String(row.source_reference || '').toLowerCase() !== authority.toLowerCase()) return false;
      if (!q) return true;
      return [row.rule_name, row.rule_code, row.description, row.source_reference].join(' ').toLowerCase().includes(q);
    });
  }, [rules, query, category, authority]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const code = form.rule_code || form.rule_name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
      await api('webmaster/rules', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          rule_code: code,
          authority_level: levelFor(form.source_reference),
        }),
      });
      if (form.description) {
        await api('webmaster/standards', {
          method: 'POST',
          body: JSON.stringify({
            source_name: form.rule_name,
            category: form.category,
            authority_level: levelFor(form.source_reference),
            version: form.version,
            source_url: form.source_url,
            content: form.description,
            active: form.active,
          }),
        });
      }
      setNotice('Standard saved.');
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(row: any) {
    setSaving(true);
    try {
      await api('webmaster/rules', { method: 'POST', body: JSON.stringify({ ...row, active: false }) });
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="audit-fade space-y-4 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-slate-400">
            <Link href="/admin" className="hover:text-slate-600">Home</Link><span className="px-1.5">›</span>
            <Link href="/admin/website-audit" className="hover:text-slate-600">Website Audit</Link><span className="px-1.5">›</span>Web Standards
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-slate-900">Web Standards</h1>
          <p className="mt-1 text-sm text-slate-400">Manage the standards and rules used by the AI agent to audit websites. These standards help identify SEO, content, UX and technical issues.</p>
        </div>
        <Link href="/admin/website-audit/webmaster" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6D5CFF] px-4 text-sm font-semibold text-white">
          <Icon name="BookOpenIcon" size={16} /> View Documentation
        </Link>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className={card}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-500"><Icon name="DocumentPlusIcon" size={16} /></span>
              Add / Edit Standard
            </h2>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className={`relative h-6 w-11 rounded-full ${form.active ? 'bg-emerald-400' : 'bg-slate-200'}`}>
                <input type="checkbox" className="peer sr-only" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${form.active ? 'left-5' : 'left-0.5'}`} />
              </span>
              {form.active ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600">Published</span> : 'Inactive'}
            </label>
          </div>
          <p className="mb-4 text-sm text-slate-400">Create a new standard or update an existing one. Standards are used by the AI agent during website audits.</p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">Standard Name *
              <input className={inputClass} value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} placeholder="e.g. Page Title Length" required />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">Category *
                <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">Authority
                <select className={inputClass} value={form.source_reference} onChange={(e) => setForm({ ...form, source_reference: e.target.value })}>
                  {AUTHORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Version *
              <input className={inputClass} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </label>
            <label className="block text-sm font-medium text-slate-700">Source URL
              <input className={inputClass} value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://example.com/documentation" />
            </label>
            <label className="block text-sm font-medium text-slate-700">Description / Content *
              <textarea className="mt-1.5 h-36 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#6D5CFF]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the standard, guidelines or rule in detail..." />
            </label>
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-[12px] text-sky-700">Clearly define the rule or guideline. This will be used by the AI agent to identify issues during the audit.</p>
          </div>
          <div className="mt-5 flex justify-between">
            <button type="button" className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-4 text-sm" onClick={() => setForm(emptyForm)}>
              <Icon name="XMarkIcon" size={16} /> Cancel
            </button>
            <BusyButton busy={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white" onClick={() => void save()}>
              Save Standard
            </BusyButton>
          </div>
        </section>

        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-500"><Icon name="QueueListIcon" size={16} /></span>
              Existing Standards
            </h2>
            <button type="button" className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#6D5CFF] px-3 text-sm font-semibold text-white" onClick={() => setForm(emptyForm)}>
              <Icon name="PlusIcon" size={14} /> Add Standard
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Icon name="MagnifyingGlassIcon" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="h-9 w-full rounded-xl bg-slate-50 pl-8 pr-3 text-sm" placeholder="Search standards..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <select className="h-9 rounded-xl bg-slate-50 px-2 text-sm" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
              <option value="">All categories</option>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="h-9 rounded-xl bg-slate-50 px-2 text-sm" value={authority} onChange={(e) => { setAuthority(e.target.value); setPage(1); }}>
              <option value="">All authorities</option>
              {AUTHORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button type="button" className="h-9 px-2 text-sm text-slate-500" onClick={() => { setQuery(''); setCategory(''); setAuthority(''); }}>Reset</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  {['Name', 'Category', 'Authority', 'Version', 'Status', 'Actions'].map((col) => <th key={col} className="px-2 py-2">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id || row.rule_code} className="border-t border-slate-100">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${categoryStyle(row.category)}`}><Icon name={iconFor(row.category)} size={15} /></span>
                        <div>
                          <p className="font-medium text-slate-800">{row.rule_name}</p>
                          <p className="line-clamp-1 text-[11px] text-slate-400">{row.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${categoryStyle(row.category)}`}>{row.category}</span></td>
                    <td className="px-2 py-3 text-slate-500">{row.source_reference || '—'}</td>
                    <td className="px-2 py-3 text-slate-500">{row.version || '1.0'}</td>
                    <td className="px-2 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] ${row.active === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>{row.active === false ? 'Inactive' : 'Active'}</span></td>
                    <td className="px-2 py-3">
                      <div className="flex gap-2 text-slate-400">
                        <button type="button" onClick={() => setForm({
                          id: row.id,
                          rule_code: row.rule_code,
                          rule_name: row.rule_name,
                          category: row.category,
                          source_reference: row.source_reference || 'Techantum',
                          version: row.version || '1.0',
                          source_url: '',
                          description: row.description || '',
                          active: row.active !== false,
                          authority_level: row.authority_level || 3,
                        })}><Icon name="PencilSquareIcon" size={16} /></button>
                        <button type="button" onClick={() => void deactivate(row)}><Icon name="TrashIcon" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-[13px] text-slate-400">
            <span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} standards</span>
            <div className="flex gap-1">
              <button type="button" className="h-8 w-8 rounded-lg disabled:opacity-30" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>‹</button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 4).map((n) => (
                <button key={n} type="button" className={`h-8 w-8 rounded-lg text-sm ${n === page ? 'bg-[#6D5CFF] text-white' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button type="button" className="h-8 w-8 rounded-lg disabled:opacity-30" disabled={page >= pageCount} onClick={() => setPage((n) => n + 1)}>›</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
