'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import AdminPageLoader from '@/components/admin/AdminPageLoader';
import { adminInputClass } from '@/components/admin/AdminField';

interface MasterList {
  list_key: string;
  label: string;
  description: string | null;
}

interface MasterItem {
  id: string;
  list_key: string;
  item_key: string;
  label: string;
  parent_key: string | null;
  sort_order: number;
  active: boolean;
}

const PAGE_SIZE = 10;

const CATEGORY: Record<string, { icon: string; wrap: string; hint: string }> = {
  project_type: { icon: 'CubeTransparentIcon', wrap: 'bg-orange-50 text-secondary', hint: 'Types of projects used in invoices' },
  project_package: { icon: 'ArchiveBoxIcon', wrap: 'bg-violet-50 text-violet-500', hint: 'Service packages and bundles' },
  client_type: { icon: 'UserGroupIcon', wrap: 'bg-sky-50 text-sky-500', hint: 'Types of clients and accounts' },
  payment_mode: { icon: 'CreditCardIcon', wrap: 'bg-orange-50 text-orange-500', hint: 'Accepted payment methods' },
  tax_treatment: { icon: 'ReceiptPercentIcon', wrap: 'bg-pink-50 text-pink-500', hint: 'Tax configuration and types' },
  currency: { icon: 'BanknotesIcon', wrap: 'bg-amber-50 text-amber-500', hint: 'Supported currencies' },
  gst_rate: { icon: 'CalculatorIcon', wrap: 'bg-teal-50 text-teal-600', hint: 'GST and tax rates' },
  document_type: { icon: 'DocumentTextIcon', wrap: 'bg-emerald-50 text-emerald-500', hint: 'Types of documents' },
  document_link: { icon: 'LinkIcon', wrap: 'bg-sky-50 text-sky-500', hint: 'Supported document links' },
  ops_project_status: { icon: 'FlagIcon', wrap: 'bg-rose-50 text-rose-500', hint: 'Delivery project statuses' },
  ticket_type: { icon: 'TicketIcon', wrap: 'bg-orange-50 text-orange-500', hint: 'Support ticket categories' },
  ticket_status: { icon: 'QueueListIcon', wrap: 'bg-slate-100 text-slate-500', hint: 'Ticket workflow statuses' },
  requirement_status: { icon: 'CheckCircleIcon', wrap: 'bg-emerald-50 text-emerald-500', hint: 'Requirement workflow statuses' },
  requirement_project_status: { icon: 'ClipboardDocumentCheckIcon', wrap: 'bg-lime-50 text-lime-600', hint: 'Requirement project statuses' },
  partner_type: { icon: 'UserPlusIcon', wrap: 'bg-violet-50 text-violet-500', hint: 'Partner categories' },
  partner_tier: { icon: 'StarIcon', wrap: 'bg-violet-50 text-violet-500', hint: 'Partner level classification' },
  partner_status: { icon: 'UserCircleIcon', wrap: 'bg-slate-100 text-slate-500', hint: 'Partner account statuses' },
  partner_requirement_status: { icon: 'InboxIcon', wrap: 'bg-indigo-50 text-indigo-500', hint: 'Partner requirement statuses' },
  record_status: { icon: 'PowerIcon', wrap: 'bg-emerald-50 text-emerald-600', hint: 'Manage active/inactive items' },
};

const ROW_STYLE = [
  { icon: 'GlobeAltIcon', wrap: 'bg-sky-50 text-sky-500' },
  { icon: 'ComputerDesktopIcon', wrap: 'bg-violet-50 text-violet-500' },
  { icon: 'DevicePhoneMobileIcon', wrap: 'bg-orange-50 text-orange-500' },
  { icon: 'WindowIcon', wrap: 'bg-emerald-50 text-emerald-500' },
  { icon: 'PaintBrushIcon', wrap: 'bg-pink-50 text-pink-500' },
  { icon: 'MegaphoneIcon', wrap: 'bg-indigo-50 text-indigo-500' },
  { icon: 'SparklesIcon', wrap: 'bg-rose-50 text-rose-500' },
  { icon: 'ShoppingBagIcon', wrap: 'bg-lime-50 text-lime-600' },
  { icon: 'WrenchScrewdriverIcon', wrap: 'bg-amber-50 text-amber-600' },
  { icon: 'BriefcaseIcon', wrap: 'bg-sky-50 text-sky-600' },
];

function displayCode(item: MasterItem) {
  const compact = item.item_key.replace(/[^A-Za-z0-9]/g, '');
  if (compact.length <= 8 && compact === compact.toUpperCase()) return compact;
  const words = item.label.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 8).toUpperCase();
  return words.map((word) => word[0]).join('').slice(0, 8).toUpperCase();
}

function itemDescription(list: MasterList | undefined, item: MasterItem) {
  if (item.parent_key) return `${item.label} under ${item.parent_key}`;
  const topic = (list?.label || 'records').replace(/s$/, '').toLowerCase();
  return `${item.label} ${topic} used across the platform.`;
}

function singular(label?: string) {
  const value = label || 'Item';
  if (value.endsWith('Statuses')) return value.replace(/Statuses$/, 'Status');
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.endsWith('s')) return value.slice(0, -1);
  return value;
}

export default function MasterDataPage() {
  const [lists, setLists] = useState<MasterList[]>([]);
  const [items, setItems] = useState<MasterItem[]>([]);
  const [selected, setSelected] = useState('project_type');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [editor, setEditor] = useState<{ id?: string; label: string; item_key: string; parent_key: string; active: boolean } | null>(null);

  const load = async () => {
    const response = await fetch('/api/admin/master-data');
    const body = await response.json();
    if (body.error) throw new Error(body.error);
    setLists(body.lists || []);
    setItems(body.items || []);
    setSelected((current) => current || body.lists?.[0]?.list_key || 'project_type');
  };

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load master data')).finally(() => setLoading(false));
  }, []);

  const list = lists.find((row) => row.list_key === selected);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((row) => row.list_key === selected)
      .filter((row) => (status === 'all' ? true : status === 'active' ? row.active : !row.active))
      .filter((row) => !q || [row.label, row.item_key, row.parent_key].join(' ').toLowerCase().includes(q))
      .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  }, [items, selected, query, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allChecked = pageRows.length > 0 && pageRows.every((row) => checked.includes(row.id));
  const meta = CATEGORY[selected] || { icon: 'QueueListIcon', wrap: 'bg-slate-100 text-slate-500', hint: list?.description || '' };

  useEffect(() => {
    setPage(1);
    setChecked([]);
    setQuery('');
    setStatus('all');
  }, [selected]);

  const request = async (method: string, body: object) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/master-data', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Request failed');
      await load();
      setEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const header = 'Name,Code,Description,Status\n';
    const lines = filtered.map((row) => [row.label, displayCode(row), itemDescription(list, row), row.active ? 'Active' : 'Inactive'].map((value) => `"${value.replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([header + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selected}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] pb-8">
      <AdminPageLoader open={loading || saving} label={saving ? 'Saving master data…' : 'Loading master data…'} />
      <p className="text-[12px] text-slate-400">
        <Link href="/admin" className="hover:text-slate-600">Home</Link>
        <span className="px-1.5">›</span>
        Administration
        <span className="px-1.5">›</span>
        Master Data
      </p>
      <div className="mt-2 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Master Data</h1>
          <p className="mt-1 text-sm text-slate-400">Manage reference data used across the platform. Keep your data organized, consistent and up to date.</p>
        </div>
        <button type="button" onClick={() => setDocsOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-600">
          <Icon name="BookOpenIcon" size={16} /> View Documentation
        </button>
      </div>

      {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="mb-3 px-1 text-sm font-semibold text-slate-900">Master Data Categories</p>
          <div className="space-y-1">
            {lists.map((row) => {
              const style = CATEGORY[row.list_key] || meta;
              const active = selected === row.list_key;
              return (
                <button
                  key={row.list_key}
                  type="button"
                  onClick={() => setSelected(row.list_key)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${active ? 'bg-orange-50' : 'hover:bg-slate-50'}`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.wrap}`}>
                    <Icon name={style.icon} size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${active ? 'font-semibold text-secondary' : 'font-medium text-slate-800'}`}>{row.label}</span>
                    <span className="block truncate text-[11px] text-slate-400">{style.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${meta.wrap}`}>
                <Icon name={meta.icon} size={18} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{list?.label || 'Values'}</h2>
                <p className="text-[12px] text-slate-400">{list?.description || meta.hint}</p>
              </div>
            </div>
            <button type="button" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-semibold text-white" onClick={() => setEditor({ label: '', item_key: '', parent_key: '', active: true })}>
              + Add {singular(list?.label)}
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="h-10 w-full rounded-xl border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm ring-1 ring-slate-100 placeholder:text-slate-400" placeholder={`Search ${list?.label.toLowerCase() || 'items'}...`} value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="button" className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-50" onClick={() => { setQuery(''); setStatus('all'); setPage(1); }}>
              <Icon name="ArrowPathIcon" size={16} /> Reset
            </button>
            <button type="button" className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-50" onClick={exportCsv}>
              <Icon name="ArrowDownTrayIcon" size={16} /> Export
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="w-10 py-3 pr-2">
                    <input type="checkbox" className="accent-[#EF4323]" checked={allChecked} onChange={(e) => setChecked(e.target.checked ? pageRows.map((row) => row.id) : checked.filter((id) => !pageRows.some((row) => row.id === id)))} />
                  </th>
                  {['Name', 'Code', 'Description', 'Usage Count', 'Status', 'Actions'].map((col) => (
                    <th key={col} className="px-2 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, index) => {
                  const style = ROW_STYLE[index % ROW_STYLE.length];
                  return (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="py-3 pr-2">
                        <input type="checkbox" className="accent-[#EF4323]" checked={checked.includes(row.id)} onChange={(e) => setChecked(e.target.checked ? [...checked, row.id] : checked.filter((id) => id !== row.id))} />
                      </td>
                      <td className="px-2 py-3">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${style.wrap}`}><Icon name={style.icon} size={15} /></span>
                          {row.label}
                        </span>
                      </td>
                      <td className="px-2 py-3 font-mono text-[12px] text-slate-500">{displayCode(row)}</td>
                      <td className="max-w-[280px] truncate px-2 py-3 text-slate-500">{itemDescription(list, row)}</td>
                      <td className="px-2 py-3 text-slate-500">{row.sort_order}</td>
                      <td className="px-2 py-3">
                        <button type="button" onClick={() => request('PATCH', { id: row.id, active: !row.active })} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.active ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${row.active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {row.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-2">
                          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-500" onClick={() => setEditor({ id: row.id, label: row.label, item_key: displayCode(row), parent_key: row.parent_key || '', active: row.active })}>
                            <Icon name="PencilSquareIcon" size={14} />
                          </button>
                          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-500" onClick={() => {
                            if (window.confirm(`Delete ${row.label}?`)) request('DELETE', { id: row.id });
                          }}>
                            <Icon name="TrashIcon" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!pageRows.length ? (
                  <tr><td colSpan={7} className="px-3 py-12 text-center text-slate-400">No values in this list yet.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-[13px] text-slate-400">
            <span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} {list?.label.toLowerCase()}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} className="h-8 w-8 rounded-lg disabled:opacity-30" onClick={() => setPage((n) => n - 1)}>‹</button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 6).map((number) => (
                <button key={number} type="button" className={`h-8 w-8 rounded-lg text-sm ${number === page ? 'bg-violet-600 text-white' : 'text-slate-500'}`} onClick={() => setPage(number)}>{number}</button>
              ))}
              <button type="button" disabled={page >= pageCount} className="h-8 w-8 rounded-lg disabled:opacity-30" onClick={() => setPage((n) => n + 1)}>›</button>
            </div>
          </div>
        </section>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">{editor.id ? 'Edit' : 'Add'} {singular(list?.label)}</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-[12px] font-medium text-slate-600">Name
                <input className={`${adminInputClass} mt-1`} value={editor.label} onChange={(e) => setEditor({ ...editor, label: e.target.value })} />
              </label>
              <label className="block text-[12px] font-medium text-slate-600">Code
                <input className={`${adminInputClass} mt-1`} value={editor.item_key} onChange={(e) => setEditor({ ...editor, item_key: e.target.value })} />
              </label>
              {selected === 'project_package' ? (
                <label className="block text-[12px] font-medium text-slate-600">Parent type
                  <input className={`${adminInputClass} mt-1`} value={editor.parent_key} onChange={(e) => setEditor({ ...editor, parent_key: e.target.value })} />
                </label>
              ) : null}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="accent-[#EF4323]" checked={editor.active} onChange={(e) => setEditor({ ...editor, active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="h-10 rounded-full px-4 text-sm font-semibold text-slate-500" onClick={() => setEditor(null)}>Cancel</button>
              <button
                type="button"
                className="h-10 rounded-full bg-secondary px-4 text-sm font-semibold text-white"
                onClick={() => request(editor.id ? 'PATCH' : 'POST', editor.id
                  ? { id: editor.id, label: editor.label, item_key: editor.item_key, parent_key: editor.parent_key, active: editor.active }
                  : { list_key: selected, label: editor.label, item_key: editor.item_key || undefined, parent_key: editor.parent_key || undefined })}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {docsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Master Data</h3>
            <p className="mt-2 text-sm text-slate-500">These lists feed dropdowns across invoices, projects, tickets, HR and the partner portal. Change a label here and related screens pick it up. Restricted items stay in history even if you hide them.</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {lists.map((row) => <li key={row.list_key}><span className="font-semibold">{row.label}.</span> {row.description}</li>)}
            </ul>
            <div className="mt-5 text-right">
              <button type="button" className="h-10 rounded-full bg-secondary px-4 text-sm font-semibold text-white" onClick={() => setDocsOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
