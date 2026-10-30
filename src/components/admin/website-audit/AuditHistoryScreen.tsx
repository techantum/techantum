'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BusyButton, PageRedirectLoader } from './AuditBusy';
import { statusChip } from './audit-ui';

const PAGE_SIZE = 10;

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/website-audit/${path}`, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function hostOf(url?: string) {
  try {
    return new URL(String(url || '')).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '');
  }
}

function scopeLabel(scope?: string) {
  if (scope === 'single') return 'Single Page Scan';
  if (scope === 'selected') return 'Section Scan';
  return 'Full Website Scan';
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

function scoreTone(score: number | null) {
  if (score == null) return { ring: '#E2E8F0', text: 'text-slate-400' };
  if (score >= 80) return { ring: '#22C55E', text: 'text-emerald-600' };
  if (score >= 70) return { ring: '#84CC16', text: 'text-lime-600' };
  if (score >= 50) return { ring: '#F59E0B', text: 'text-amber-500' };
  return { ring: '#EF4444', text: 'text-red-500' };
}

export default function AuditHistoryScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [environment, setEnvironment] = useState('');
  const [range, setRange] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [redirecting, setRedirecting] = useState('');
  const [deleting, setDeleting] = useState(false);

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
        const created = new Date(row.created_at || row.completed_at || 0).getTime();
        const days = range === '7d' ? 7 : range === '30d' ? 30 : 0;
        if (range === 'month') {
          const start = new Date();
          start.setDate(1);
          start.setHours(0, 0, 0, 0);
          if (created < start.getTime()) return false;
        } else if (days && created < now - days * 86400000) return false;
      }
      if (!q) return true;
      return [row.audit_name, row.website_url, row.project_name].join(' ').toLowerCase().includes(q);
    });
  }, [rows, query, status, environment, range]);

  const stats = useMemo(() => {
    const total = rows.length;
    const completed = rows.filter((row) => String(row.status).includes('complet')).length;
    const running = rows.filter((row) => ['queued', 'running'].includes(row.status)).length;
    const failed = rows.filter((row) => row.status === 'failed').length;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonth = rows.filter((row) => new Date(row.created_at).getTime() >= monthStart.getTime()).length;
    return { total, completed, running, failed, thisMonth };
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allSelected = pageRows.length > 0 && pageRows.every((row) => selected.includes(row.id));

  function go(path: string, label: string) {
    setRedirecting(label);
    router.push(path);
  }

  async function removeAudits(ids: string[]) {
    if (!ids.length) return;
    const label = ids.length === 1 ? 'this audit' : `${ids.length} audits`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    setError('');
    try {
      await api('audits', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      const gone = new Set(ids);
      setRows((current) => current.filter((row) => !gone.has(row.id)));
      setSelected((current) => current.filter((id) => !gone.has(id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete audits');
    } finally {
      setDeleting(false);
    }
  }

  const card = 'rounded-[20px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

  return (
    <div className="audit-fade relative space-y-4 pb-10">
      <PageRedirectLoader open={Boolean(redirecting)} label={redirecting} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-slate-400">
            <Link href="/admin" className="hover:text-slate-600">Home</Link>
            <span className="px-1.5">›</span>
            <Link href="/admin/website-audit" className="hover:text-slate-600">Website Audit</Link>
            <span className="px-1.5">›</span>
            Audit History
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-slate-900">Audit History</h1>
          <p className="mt-1 text-sm text-slate-400">View all website audit runs, check results, compare reports and download them.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selected.length ? (
            <BusyButton
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-rose-500 disabled:opacity-60"
              busy={deleting}
              disabled={deleting}
              onClick={() => removeAudits(selected)}
            >
              <Icon name="TrashIcon" size={16} /> Delete {selected.length} selected
            </BusyButton>
          ) : null}
          <BusyButton className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#6D5CFF] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#5c4ce8]" onClick={() => go('/admin/website-audit/new', 'Opening new audit…')}>
            <Icon name="PlusIcon" size={16} /> New Audit
          </BusyButton>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="DocumentTextIcon" wrap="bg-violet-50 text-violet-500" label="Total Audits" value={stats.total} hint={<span className="text-emerald-500">↑ {stats.thisMonth} this month</span>} />
        <Kpi icon="CheckCircleIcon" wrap="bg-emerald-50 text-emerald-500" label="Completed" value={stats.completed} hint={`${stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}% of total`} />
        <Kpi icon="ClockIcon" wrap="bg-amber-50 text-amber-500" label="Running" value={stats.running} hint="In progress" />
        <Kpi icon="ExclamationTriangleIcon" wrap="bg-rose-50 text-rose-500" label="Failed" value={stats.failed} hint="Check and re-run" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="h-10 w-full rounded-xl border-0 bg-white py-2 pl-9 pr-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-100 placeholder:text-slate-400"
            placeholder="Search by website, project or audit name..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
        </div>
        <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={range} onChange={(e) => { setRange(e.target.value); setPage(1); }}>
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="month">This month</option>
        </select>
        <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All status</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="queued">Queued</option>
          <option value="failed">Failed</option>
        </select>
        <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={environment} onChange={(e) => { setEnvironment(e.target.value); setPage(1); }}>
          <option value="">All environments</option>
          {[...new Set(rows.map((row) => String(row.environment || 'production')))].map((env) => (
            <option key={env} value={env}>{env}</option>
          ))}
        </select>
        <button
          type="button"
          className="h-10 rounded-xl px-3 text-sm text-slate-500 hover:bg-white"
          onClick={() => { setQuery(''); setStatus(''); setEnvironment(''); setRange('all'); setPage(1); }}
        >
          Reset
        </button>
      </div>

      <section className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <tr>
                <th className="w-10 px-5 py-3">
                  <input
                    type="checkbox"
                    className="accent-[#6D5CFF]"
                    checked={allSelected}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...new Set([...selected, ...pageRows.map((row) => row.id)])]
                          : selected.filter((id) => !pageRows.some((row) => row.id === id))
                      )
                    }
                  />
                </th>
                {['Audit', 'Website', 'Project', 'Environment', 'Pages', 'Score', 'Issues', 'Status', 'Audited on', 'Actions'].map((col) => (
                  <th key={col} className="px-3 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const score = row.overall_score == null ? null : Number(row.overall_score);
                const tone = scoreTone(score);
                return (
                  <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-5 py-3.5">
                      <input type="checkbox" className="accent-[#6D5CFF]" checked={selected.includes(row.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} />
                    </td>
                    <td className="px-3 py-3.5">
                      <button type="button" className="text-left" onClick={() => go(`/admin/website-audit/${row.id}`, 'Opening report…')}>
                        <p className="font-semibold text-slate-900">{row.audit_name}</p>
                        <p className="text-[12px] text-slate-400">{scopeLabel(row.audit_scope)}</p>
                      </button>
                    </td>
                    <td className="px-3 py-3.5">
                      <a href={row.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#6D5CFF]">
                        {hostOf(row.website_url) || row.website_url}
                        <Icon name="ArrowTopRightOnSquareIcon" size={12} />
                      </a>
                    </td>
                    <td className="px-3 py-3.5 text-slate-500">{row.project_name || '—'}</td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${envClass(row.environment)}`}>{row.environment || 'production'}</span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-600">{row.pages_scanned ?? row.pages_count ?? 0}</td>
                    <td className="px-3 py-3.5"><ScoreDot score={score} tone={tone} /></td>
                    <td className="px-3 py-3.5">
                      {['queued', 'running'].includes(row.status) ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-[12px]">
                          <span className="text-rose-500">● {row.critical_count || 0}</span>
                          <span className="text-amber-500">● {row.high_count || 0}</span>
                          <span className="text-emerald-500">● {row.other_count || 0}</span>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">{statusChip(row.status)}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[12px] leading-5 text-slate-500">{formatWhen(row.completed_at || row.created_at)}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-2 text-slate-400">
                        <button type="button" title="View" onClick={() => go(`/admin/website-audit/${row.id}`, 'Opening report…')}><Icon name="EyeIcon" size={16} /></button>
                        <a title="Download" href={`/api/admin/website-audit/audits/${row.id}/report?format=html`} target="_blank" rel="noreferrer"><Icon name="ArrowDownTrayIcon" size={16} /></a>
                        <button type="button" title="Delete" className="hover:text-rose-600" disabled={deleting} onClick={() => removeAudits([row.id])}><Icon name="TrashIcon" size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!pageRows.length ? (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-slate-400">No audits match these filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[13px] text-slate-400">
          <span>
            Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} audits
            {selected.length ? ` · ${selected.length} selected` : ''}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} className="h-8 w-8 rounded-lg disabled:opacity-30" onClick={() => setPage((n) => n - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 6).map((number) => (
              <button key={number} type="button" className={`h-8 w-8 rounded-lg text-sm ${number === page ? 'bg-[#6D5CFF] text-white' : 'text-slate-500'}`} onClick={() => setPage(number)}>{number}</button>
            ))}
            <button type="button" disabled={page >= pageCount} className="h-8 w-8 rounded-lg disabled:opacity-30" onClick={() => setPage((n) => n + 1)}>›</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, wrap, label, value, hint }: { icon: string; wrap: string; label: string; value: unknown; hint: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] border border-slate-100 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${wrap}`}><Icon name={icon} size={20} /></span>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[22px] font-semibold leading-tight text-slate-900">{String(value)}</p>
        <p className="text-[11px] text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

function ScoreDot({ score, tone }: { score: number | null; tone: { ring: string; text: string } }) {
  if (score == null) return <span className="text-slate-300">—</span>;
  const r = 14;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center">
      <svg viewBox="0 0 36 36" className="-rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#EEF2F7" strokeWidth="4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke={tone.ring} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <span className={`absolute text-[11px] font-semibold ${tone.text}`}>{score}</span>
    </span>
  );
}
