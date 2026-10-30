'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BusyButton, PageRedirectLoader } from './AuditBusy';
import { statusChip } from './audit-ui';

const PAGE_SIZE = 9;

async function api(path: string) {
  const response = await fetch(`/api/admin/website-audit/${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function scopeMeta(scope?: string) {
  if (scope === 'single') return { label: 'Single page analysis', icon: 'DocumentIcon', wrap: 'bg-orange-50 text-orange-500' };
  if (scope === 'selected') return { label: 'Section analysis', icon: 'RectangleGroupIcon', wrap: 'bg-emerald-50 text-emerald-500' };
  return { label: 'Complete website analysis', icon: 'DocumentDuplicateIcon', wrap: 'bg-violet-50 text-violet-500' };
}

function envClass(env?: string) {
  const value = String(env || '').toLowerCase();
  if (value === 'staging') return 'bg-amber-50 text-amber-600';
  if (value === 'development' || value === 'custom') return 'bg-emerald-50 text-emerald-600';
  return 'bg-violet-50 text-violet-600';
}

function formatWhen(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AuditReportsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [environment, setEnvironment] = useState('');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [redirecting, setRedirecting] = useState('');

  useEffect(() => {
    api('audits').then(setRows).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();
    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (environment && String(row.environment) !== environment) return false;
      if (range !== 'all') {
        const created = new Date(row.completed_at || row.created_at || 0).getTime();
        if (range === 'month') {
          const start = new Date();
          start.setDate(1); start.setHours(0, 0, 0, 0);
          if (created < start.getTime()) return false;
        } else {
          const days = range === '7d' ? 7 : 30;
          if (created < now - days * 86400000) return false;
        }
      }
      if (!q) return true;
      return [row.audit_name, row.website_url, row.project_name].join(' ').toLowerCase().includes(q);
    });
  }, [rows, query, status, environment, range]);

  const stats = useMemo(() => ({
    total: rows.length,
    completed: rows.filter((row) => String(row.status).includes('complet')).length,
    running: rows.filter((row) => ['queued', 'running'].includes(row.status)).length,
    failed: rows.filter((row) => row.status === 'failed').length,
  }), [rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const card = 'rounded-[20px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

  function go(path: string, label: string) {
    setRedirecting(label);
    router.push(path);
  }

  return (
    <div className="audit-fade relative space-y-4 pb-10">
      <PageRedirectLoader open={Boolean(redirecting)} label={redirecting} />
      <div>
        <p className="text-[12px] text-slate-400">
          <Link href="/admin" className="hover:text-slate-600">Home</Link><span className="px-1.5">›</span>
          <Link href="/admin/website-audit" className="hover:text-slate-600">Website Audit</Link><span className="px-1.5">›</span>Reports
        </p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">Download website audit reports to share with your team or developers.</p>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="DocumentTextIcon" wrap="bg-violet-50 text-violet-500" label="Total Reports" value={stats.total} />
        <Kpi icon="CheckCircleIcon" wrap="bg-emerald-50 text-emerald-500" label="Completed Reports" value={stats.completed} />
        <Kpi icon="ClockIcon" wrap="bg-amber-50 text-amber-500" label="Running Reports" value={stats.running} />
        <Kpi icon="ExclamationTriangleIcon" wrap="bg-rose-50 text-rose-500" label="Failed Reports" value={stats.failed} />
      </div>

      <div className={`${card} flex flex-wrap items-center gap-2 px-4 py-3`}>
        <div className="relative min-w-[220px] flex-1">
          <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="h-10 w-full rounded-xl bg-slate-50 pl-9 pr-3 text-sm outline-none" placeholder="Search by website, project or report name..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
        </div>
        <label className="text-xs text-slate-400">Date range
          <select className="ml-2 h-10 rounded-xl bg-slate-50 px-3 text-sm text-slate-600" value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }}>
            <option value="all">All time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="month">This month</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">Status
          <select className="ml-2 h-10 rounded-xl bg-slate-50 px-3 text-sm text-slate-600" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="text-xs text-slate-400">Environment
          <select className="ml-2 h-10 rounded-xl bg-slate-50 px-3 text-sm text-slate-600" value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }}>
            <option value="">All environments</option>
            {[...new Set(rows.map((row) => String(row.environment || 'production')))].map((env) => <option key={env} value={env}>{env}</option>)}
          </select>
        </label>
        <button type="button" className="inline-flex h-10 items-center gap-1 px-2 text-sm text-slate-500" onClick={() => { setQuery(''); setStatus(''); setEnvironment(''); setRange('all'); setPage(1); }}>
          <Icon name="ArrowPathIcon" size={14} /> Reset
        </button>
      </div>

      <section className={`${card} overflow-hidden`}>
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
            <tr>
              {['Report', 'Website', 'Project', 'Environment', 'Generated on', 'Status', 'Actions'].map((col) => (
                <th key={col} className="px-4 py-3">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const meta = scopeMeta(row.audit_scope);
              return (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.wrap}`}><Icon name={meta.icon} size={18} /></span>
                      <div>
                        <p className="font-semibold text-slate-900">{row.audit_name}</p>
                        <p className="text-[12px] text-slate-400">{meta.label}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <a href={row.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#6D5CFF]">
                      {row.website_url?.replace(/^https?:\/\//, '')}<Icon name="ArrowTopRightOnSquareIcon" size={12} />
                    </a>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{row.project_name || '—'}</td>
                  <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${envClass(row.environment)}`}>{row.environment || 'production'}</span></td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-[12px] leading-5 text-slate-500">{formatWhen(row.completed_at || row.created_at)}</td>
                  <td className="px-4 py-3.5">{statusChip(row.status)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3 text-slate-500">
                      <BusyButton className="inline-flex items-center gap-1 text-sm" onClick={() => go(`/admin/website-audit/${row.id}`, 'Opening report…')}><Icon name="EyeIcon" size={15} /> View</BusyButton>
                      <a className="inline-flex items-center gap-1 text-sm" href={`/api/admin/website-audit/audits/${row.id}/report?format=html`} target="_blank" rel="noreferrer"><Icon name="ArrowDownTrayIcon" size={15} /> Download</a>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!pageRows.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No reports match these filters.</td></tr> : null}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[13px] text-slate-400">
          <span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} reports</span>
          <div className="flex gap-1">
            <button type="button" className="h-8 w-8 rounded-lg disabled:opacity-30" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).slice(0, 5).map((n) => (
              <button key={n} type="button" className={`h-8 w-8 rounded-lg text-sm ${n === page ? 'bg-[#6D5CFF] text-white' : ''}`} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button type="button" className="h-8 w-8 rounded-lg disabled:opacity-30" disabled={page >= pageCount} onClick={() => setPage((n) => n + 1)}>›</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, wrap, label, value }: { icon: string; wrap: string; label: string; value: unknown }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-100 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${wrap}`}><Icon name={icon} size={20} /></span>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[22px] font-semibold text-slate-900">{String(value)}</p>
      </div>
    </div>
  );
}
