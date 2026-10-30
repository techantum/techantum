'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Icon from '@/components/ui/AppIcon';
import { AuditScanOverlay, BusyButton, PageRedirectLoader, clearScanSession, readScanSession, saveScanSession } from './AuditBusy';
import {
  CategoryBars,
  HealthRing,
  SeverityDonut,
  findingStatusBadge,
  severityBadge,
  statusChip,
} from './audit-ui';

const PAGE_SIZE = 7;
const NOTES_LIMIT = 500;

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/website-audit/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function hostOf(url?: string) {
  try {
    return new URL(String(url || '')).hostname.replace(/^www\./, '');
  } catch {
    return String(url || '—');
  }
}

function pagePath(row: any) {
  const urls = Array.isArray(row?.affected_urls) ? row.affected_urls : [];
  const evidence = row?.evidence || {};
  const raw = urls[0] || evidence.url || (Array.isArray(evidence.urls) ? evidence.urls[0] : '') || '';
  try {
    return new URL(String(raw)).pathname || '/';
  } catch {
    return raw || '—';
  }
}

function formatWhen(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function csvFor(findings: any[]) {
  const header = ['Severity', 'Category', 'Issue', 'Description', 'Page', 'Source', 'Status'];
  const lines = findings.map((row) => [row.severity, row.category, row.title, row.description, pagePath(row), row.source, row.status]
    .map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`)
    .join(','));
  return [header.join(','), ...lines].join('\n');
}

export default function AuditDetailScreen({ auditId }: { auditId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ severity: '', category: '', source: '', status: '', page: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const [redirecting, setRedirecting] = useState('');
  const [openFinding, setOpenFinding] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [recipients, setRecipients] = useState<{ name: string; email: string }[]>([]);
  const [recipientDraft, setRecipientDraft] = useState({ name: '', email: '' });
  const [showRecipientForm, setShowRecipientForm] = useState(false);

  const running = ['queued', 'running'].includes(String(detail?.audit?.status || (!detail ? 'queued' : '')));
  const showOverlay = !error && (!detail || running);

  const load = useCallback(async () => {
    try {
      const [row, list] = await Promise.all([api(`audits/${auditId}`), api('audits')]);
      setDetail(row);
      setAudits(list);
      if (!['queued', 'running'].includes(String(row.audit?.status))) clearScanSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit');
    }
  }, [auditId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(1); setSelected([]); setOpenFinding(null); }, [auditId]);
  useEffect(() => {
    try {
      setNotes(localStorage.getItem(`wa-notes-${auditId}`) || '');
      const saved = localStorage.getItem(`wa-recipients-${auditId}`);
      setRecipients(saved ? JSON.parse(saved) : []);
    } catch {
      setNotes('');
      setRecipients([]);
    }
  }, [auditId]);
  useEffect(() => {
    if (!['queued', 'running'].includes(String(detail?.audit?.status || 'queued'))) return;
    const timer = setInterval(() => { void load(); }, 2500);
    return () => clearInterval(timer);
  }, [detail?.audit?.status, load]);

  const findings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (detail?.findings || []).filter((row: any) => {
      if (filters.severity && row.severity !== filters.severity) return false;
      if (filters.category && row.category !== filters.category) return false;
      if (filters.source && String(row.source).toLowerCase() !== filters.source.toLowerCase()) return false;
      if (filters.status === 'open' && ['accepted', 'ignored', 'false_positive', 'fixed'].includes(row.status)) return false;
      if (filters.status === 'reviewed' && !['accepted', 'ignored', 'false_positive', 'fixed'].includes(row.status)) return false;
      if (filters.page && !pagePath(row).includes(filters.page)) return false;
      if (!q) return true;
      return [row.title, row.description, row.recommendation, pagePath(row), row.category].join(' ').toLowerCase().includes(q);
    });
  }, [detail, filters, query]);

  const counts = useMemo(() => {
    const rows = detail?.findings || [];
    const severity: Record<string, number> = {};
    const category: Record<string, number> = {};
    for (const row of rows) {
      severity[row.severity] = (severity[row.severity] || 0) + 1;
      category[row.category] = (category[row.category] || 0) + 1;
    }
    return { severity, category, total: rows.length };
  }, [detail]);

  const pageCount = Math.max(1, Math.ceil(findings.length / PAGE_SIZE));
  const pageRows = findings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allVisibleSelected = pageRows.length > 0 && pageRows.every((row: any) => selected.includes(row.id));
  const selectedRows = (detail?.findings || []).filter((row: any) => selected.includes(row.id));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  function persistNotes(value: string) {
    setNotes(value.slice(0, NOTES_LIMIT));
    try { localStorage.setItem(`wa-notes-${auditId}`, value.slice(0, NOTES_LIMIT)); } catch { /* ignore */ }
  }

  function persistRecipients(next: { name: string; email: string }[]) {
    setRecipients(next);
    try { localStorage.setItem(`wa-recipients-${auditId}`, JSON.stringify(next)); } catch { /* ignore */ }
  }

  async function rerun() {
    setBusy('rerun');
    setRedirecting('Starting a new scan…');
    try {
      const created = await api(`audits/${auditId}/rerun`, { method: 'POST', body: '{}' });
      saveScanSession({ id: created.id, url: String(created.website_url || ''), name: String(created.audit_name || '') });
      router.push(`/admin/website-audit/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Re-run failed');
      setBusy('');
      setRedirecting('');
    }
  }

  async function reviewFinding(id: string, decision: string) {
    setBusy(`review-${id}-${decision}`);
    try {
      await api(`findings/${id}/review`, { method: 'POST', body: JSON.stringify({ decision }) });
      await load();
      setOpenFinding(null);
    } finally {
      setBusy('');
    }
  }

  async function createTickets() {
    if (!selected.length) return;
    setBusy('tickets');
    try {
      await api(`audits/${auditId}/tickets`, { method: 'POST', body: JSON.stringify({ finding_ids: selected }) });
      setSelected([]);
      setNotice('Tickets created for the selected findings.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create tickets');
    } finally {
      setBusy('');
    }
  }

  async function share(scope: 'all' | 'selected') {
    setBusy(`share-${scope}`);
    try {
      const url = window.location.href;
      const extra = scope === 'selected' && selectedRows.length
        ? `\n\nSelected findings:\n${selectedRows.map((row: any) => `- ${row.title}`).join('\n')}`
        : '';
      const note = notes ? `\n\nNotes:\n${notes}` : '';
      const to = recipients.map((item) => item.email).filter(Boolean).join(',');
      const body = encodeURIComponent(`Website audit report for ${hostOf(audit?.website_url)}\n${url}${extra}${note}`);
      if (to) {
        window.location.href = `mailto:${to}?subject=${encodeURIComponent('Website Audit Report')}&body=${body}`;
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${url}${extra}${note}`);
        setNotice('Report link copied to clipboard.');
      }
    } finally {
      setBusy('');
    }
  }

  function exportCsv(scope: 'all' | 'selected') {
    const rows = scope === 'selected' ? selectedRows : (detail?.findings || []);
    downloadText(`website-audit-${scope}.csv`, csvFor(rows), 'text/csv;charset=utf-8');
  }

  const audit = detail?.audit;
  const session = readScanSession();
  const pages = detail?.pages || [];
  const screenshot = pages.find((row: any) => row.desktop_screenshot)?.desktop_screenshot;
  const scanned = Number(audit?.pages_scanned || 0);
  const maxPages = Number(audit?.max_pages || scanned || 0);
  const criticalHigh = (counts.severity.critical || 0) + (counts.severity.high || 0);
  const summary = audit?.webmaster_summary?.overall_quality_assessment
    || (audit
      ? `We scanned ${scanned} page${scanned === 1 ? '' : 's'} on ${hostOf(audit.website_url)} and found ${counts.total} issue${counts.total === 1 ? '' : 's'} that may affect search visibility, user experience and overall site performance.`
      : '');

  function toggleAllVisible() {
    if (allVisibleSelected) setSelected((ids) => ids.filter((id) => !pageRows.some((row: any) => row.id === id)));
    else setSelected((ids) => [...new Set([...ids, ...pageRows.map((row: any) => row.id)])]);
  }

  const card = 'rounded-[20px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
  const ghostBtn = 'inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50';
  const primaryBtn = 'inline-flex h-10 items-center gap-2 rounded-xl bg-[#6D5CFF] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#5c4ce8] disabled:opacity-70';
  const checkClass = 'h-4 w-4 rounded border-slate-300 text-[#6D5CFF] accent-[#6D5CFF]';

  return (
    <div className="audit-fade -mx-2 space-y-4 pb-10 sm:-mx-0">
      <AuditScanOverlay
        open={showOverlay}
        url={audit?.website_url || session?.url}
        stage={audit?.progress?.stage ? `Stage: ${audit.progress.stage}` : undefined}
        pagesScanned={audit?.pages_scanned}
        maxPages={audit?.max_pages}
        aiEnabled={audit?.ai_enabled !== false}
      />
      <PageRedirectLoader open={Boolean(redirecting) && !showOverlay} label={redirecting} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {audits.length ? (
          <select
            className="h-10 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 shadow-sm"
            value={auditId}
            onChange={(event) => {
              setRedirecting('Opening report…');
              router.push(`/admin/website-audit/${event.target.value}`);
            }}
          >
            {audits.map((row) => (
              <option key={row.id} value={row.id}>{hostOf(row.website_url)}</option>
            ))}
          </select>
        ) : null}
        <BusyButton busy={busy === 'rerun'} className={ghostBtn} onClick={() => void rerun()}>Re-run Audit</BusyButton>
        <a className={primaryBtn} href={`/api/admin/website-audit/audits/${auditId}/report?format=html`} target="_blank" rel="noreferrer">
          <Icon name="ArrowDownTrayIcon" size={16} /> Download Report
        </a>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] text-slate-400">
            <Link href="/admin" className="hover:text-slate-600">Home</Link>
            <span className="px-1.5">›</span>
            <Link href="/admin/website-audit" className="hover:text-slate-600">Website Audit</Link>
            <span className="px-1.5">›</span>
            <span className="text-slate-500">Report</span>
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-slate-900">Website Audit Report</h1>
          <p className="mt-1 text-sm text-slate-400">Complete overview of your website’s SEO, accessibility, content and technical health.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a className={ghostBtn} href={`/api/admin/website-audit/audits/${auditId}/report?format=html`} target="_blank" rel="noreferrer">
            <Icon name="ArrowDownTrayIcon" size={16} className="text-slate-400" /> Download PDF
          </a>
          <button type="button" className={ghostBtn} onClick={() => exportCsv('all')}>
            <Icon name="TableCellsIcon" size={16} className="text-emerald-500" /> Export Excel
          </button>
          <BusyButton busy={busy === 'share-all'} className={primaryBtn} onClick={() => void share('all')}>
            <Icon name="ShareIcon" size={16} /> Share Report
          </BusyButton>
        </div>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}

      {audit ? (
        <>
          <section className={`${card} px-5 py-4`}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
              <div className="h-[92px] w-[156px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {screenshot ? (
                  <img src={screenshot} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-indigo-900 to-slate-800 px-3 text-center text-white">
                    <p className="text-sm font-semibold">{hostOf(audit.website_url)}</p>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[17px] font-semibold text-slate-900">{hostOf(audit.website_url)}</p>
                  <a href={audit.website_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-[#6D5CFF]"><Icon name="ArrowTopRightOnSquareIcon" size={15} /></a>
                </div>
                <a href={audit.website_url} target="_blank" rel="noreferrer" className="text-sm text-[#6D5CFF]">{audit.website_url}</a>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Meta icon="CalendarDaysIcon" label="Last scanned" value={formatWhen(audit.completed_at || audit.updated_at || audit.created_at)} />
                  <Meta icon="Square3Stack3DIcon" label="Environment" value={<span className="capitalize">{audit.environment || 'production'}</span>} />
                  <Meta icon="DocumentTextIcon" label="Pages scanned" value={`${scanned} / ${maxPages || scanned}`} />
                  <Meta icon="CheckCircleIcon" label="Audit status" value={statusChip(audit.status)} />
                </div>
              </div>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500"><Icon name="ClipboardDocumentIcon" size={16} /></span>
              Executive Summary
            </h2>
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
              <p className="max-w-2xl flex-1 text-[13.5px] leading-6 text-slate-500">{summary}</p>
              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[540px] xl:shrink-0">
                <div className="rounded-2xl bg-[#F3FBF6]"><HealthRing score={audit.overall_score} /></div>
                <StatTile tone="rose" icon="ExclamationTriangleIcon" value={counts.total} label="Total Findings" hint={`${counts.severity.critical || 0} Critical`} />
                <StatTile tone="amber" icon="ExclamationCircleIcon" value={criticalHigh} label="Critical + High" hint="Need Attention" />
                <StatTile tone="sky" icon="DocumentDuplicateIcon" value={scanned} label="Pages Scanned" hint={maxPages ? `${Math.round((scanned / Math.max(1, maxPages)) * 100)}% Complete` : 'Complete'} />
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${card} p-5`}>
              <h2 className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-500"><Icon name="ChartPieIcon" size={16} /></span>
                Findings by Severity
              </h2>
              <SeverityDonut counts={counts.severity} />
            </section>
            <section className={`${card} p-5`}>
              <h2 className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"><Icon name="ChartBarIcon" size={16} /></span>
                Findings by Category
              </h2>
              <CategoryBars counts={counts.category} />
            </section>
          </div>

          <section className={`${card} overflow-hidden`}>
            <div className="flex flex-col gap-3 px-5 pb-2 pt-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500"><Icon name="ClipboardDocumentListIcon" size={16} /></span>
                  Findings Report ({findings.length})
                </h2>
                <p className="mt-1 text-sm text-slate-400">Review and select issues to include in your report. Use filters to find specific issues.</p>
              </div>
              <div className="flex flex-col items-stretch gap-2 lg:items-end">
                <div className="relative">
                  <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className="h-10 w-full rounded-xl border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none ring-1 ring-slate-100 placeholder:text-slate-400 lg:w-[280px]"
                    placeholder="Search issues, pages or keywords..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <FilterSelect label="All Severities" value={filters.severity} onChange={(value) => { setFilters({ ...filters, severity: value }); setPage(1); }} options={['critical', 'high', 'medium', 'low', 'suggestion']} />
                  <FilterSelect label="All Categories" value={filters.category} onChange={(value) => { setFilters({ ...filters, category: value }); setPage(1); }} options={[...Object.keys(counts.category)]} />
                  <FilterSelect label="All Sources" value={filters.source} onChange={(value) => { setFilters({ ...filters, source: value }); setPage(1); }} options={[...new Set((detail.findings || []).map((row: any) => String(row.source)))]} />
                  <FilterSelect label="All Pages" value={filters.page} onChange={(value) => { setFilters({ ...filters, page: value }); setPage(1); }} options={[...new Set((detail.findings || []).map((row: any) => pagePath(row)).filter((path: string) => path && path !== '—'))]} />
                  <FilterSelect label="All Statuses" value={filters.status} onChange={(value) => { setFilters({ ...filters, status: value }); setPage(1); }} options={['open', 'reviewed']} />
                </div>
              </div>
            </div>

            {selected.length ? (
              <div className="mx-5 mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F3EEFF] px-4 py-2.5 text-sm text-[#5B45D6]">
                <span className="inline-flex items-center gap-2 font-medium">
                  <input type="checkbox" className={checkClass} checked readOnly />
                  {selected.length} issue{selected.length === 1 ? '' : 's'} selected
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <BusyButton busy={busy === 'tickets'} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-medium" onClick={() => void createTickets()}>Create tickets</BusyButton>
                  <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-medium" onClick={() => window.open(`/api/admin/website-audit/audits/${auditId}/report?format=html`, '_blank')}>
                    <Icon name="ArrowDownTrayIcon" size={14} /> Export Selected to PDF
                  </button>
                  <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-medium" onClick={() => exportCsv('selected')}>
                    <Icon name="TableCellsIcon" size={14} /> Export Selected to Excel
                  </button>
                  <BusyButton busy={busy === 'share-selected'} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-medium" onClick={() => void share('selected')}>
                    <Icon name="ShareIcon" size={14} /> Share Selected
                  </BusyButton>
                  <button type="button" className="px-1 text-xs font-medium text-[#6D5CFF]" onClick={() => setSelected([])}>Clear Selection</button>
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="w-10 px-5 py-3"><input type="checkbox" className={checkClass} checked={allVisibleSelected} onChange={toggleAllVisible} /></th>
                    {['Severity', 'Category', 'Issue Summary', 'Affected Page', 'Source', 'Status', 'Evidence', ''].map((col) => (
                      <th key={col || 'menu'} className="px-3 py-3 font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row: any) => (
                    <tr key={row.id} className="border-t border-slate-100 align-middle hover:bg-slate-50/40">
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          className={checkClass}
                          checked={selected.includes(row.id)}
                          onChange={(e) => setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))}
                        />
                      </td>
                      <td className="px-3 py-3.5">{severityBadge(row.severity)}</td>
                      <td className="px-3 py-3.5 capitalize text-slate-600">{row.category}</td>
                      <td className="min-w-[220px] px-3 py-3.5">
                        <p className="font-semibold text-slate-900">{row.title}</p>
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-slate-400">{row.description}</p>
                      </td>
                      <td className="px-3 py-3.5 text-slate-500">{pagePath(row)}</td>
                      <td className="px-3 py-3.5 uppercase tracking-wide text-[11px] text-slate-400">{row.source}</td>
                      <td className="px-3 py-3.5">{findingStatusBadge(row.status)}</td>
                      <td className="px-3 py-3.5">
                        <button type="button" className="inline-flex items-center gap-1.5 text-sm text-[#6D5CFF]" onClick={() => setOpenFinding(row)}>
                          <Icon name="DocumentTextIcon" size={15} /> View details
                        </button>
                      </td>
                      <td className="px-3 py-3.5 text-slate-300">
                        <button type="button" onClick={() => setOpenFinding(row)}><Icon name="EllipsisVerticalIcon" size={16} /></button>
                      </td>
                    </tr>
                  ))}
                  {!pageRows.length ? (
                    <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-400">No findings match these filters.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[13px] text-slate-400">
              <span>
                Showing {findings.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, findings.length)} of {findings.length} findings
              </span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page <= 1} className="h-8 w-8 rounded-lg text-slate-400 disabled:opacity-30" onClick={() => setPage((n) => n - 1)}>‹</button>
                {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 6).map((number) => (
                  <button
                    key={number}
                    type="button"
                    className={`h-8 w-8 rounded-lg text-sm ${number === page ? 'bg-[#6D5CFF] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ))}
                <button type="button" disabled={page >= pageCount} className="h-8 w-8 rounded-lg text-slate-400 disabled:opacity-30" onClick={() => setPage((n) => n + 1)}>›</button>
              </div>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className={`${card} p-5`}>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500"><Icon name="PencilSquareIcon" size={16} /></span>
                Report Notes (Optional)
              </h2>
              <p className="mt-1 mb-3 text-sm text-slate-400">Add a brief note to include with the exported or shared report.</p>
              <textarea
                className="h-[108px] w-full resize-none rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-violet-200 focus:bg-white"
                maxLength={NOTES_LIMIT}
                value={notes}
                onChange={(e) => persistNotes(e.target.value)}
                placeholder="e.g. This audit was performed as part of the Q4 review. Please review the critical issues and plan for improvements in the next sprint."
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">{notes.length}/{NOTES_LIMIT}</p>
            </section>
            <section className={`${card} p-5`}>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-500"><Icon name="UserGroupIcon" size={16} /></span>
                Prepared For
              </h2>
              <p className="mt-1 mb-3 text-sm text-slate-400">Add recipients or team details for this report.</p>
              <div className="flex flex-wrap gap-2">
                {recipients.map((item) => (
                  <span key={item.email} className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white px-2.5 py-1.5 shadow-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6D5CFF] text-[10px] font-semibold text-white">
                      {item.name.slice(0, 2).toUpperCase() || 'TO'}
                    </span>
                    <span>
                      <span className="block text-[12px] font-medium text-slate-800">{item.name || item.email}</span>
                      <span className="block text-[11px] text-slate-400">{item.email}</span>
                    </span>
                    <button type="button" className="pl-1 text-slate-300 hover:text-slate-500" onClick={() => persistRecipients(recipients.filter((row) => row.email !== item.email))}>×</button>
                  </span>
                ))}
              </div>
              {showRecipientForm ? (
                <form
                  className="mt-3 flex flex-wrap gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!recipientDraft.email) return;
                    persistRecipients([...recipients.filter((row) => row.email !== recipientDraft.email), recipientDraft]);
                    setRecipientDraft({ name: '', email: '' });
                    setShowRecipientForm(false);
                  }}
                >
                  <input className="h-9 rounded-lg border border-slate-200 px-3 text-sm" placeholder="Name" value={recipientDraft.name} onChange={(e) => setRecipientDraft({ ...recipientDraft, name: e.target.value })} />
                  <input className="h-9 rounded-lg border border-slate-200 px-3 text-sm" type="email" required placeholder="email@domain.com" value={recipientDraft.email} onChange={(e) => setRecipientDraft({ ...recipientDraft, email: e.target.value })} />
                  <button className="h-9 rounded-lg bg-[#6D5CFF] px-3 text-sm text-white" type="submit">Add</button>
                </form>
              ) : (
                <button type="button" className="mt-3 text-sm font-medium text-[#6D5CFF]" onClick={() => setShowRecipientForm(true)}>+ Add another recipient</button>
              )}
            </section>
          </div>
        </>
      ) : null}

      {openFinding ? (
        <FindingDrawer
          finding={openFinding}
          busy={busy}
          onClose={() => setOpenFinding(null)}
          onReview={reviewFinding}
        />
      ) : null}
    </div>
  );
}

function Meta({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size={18} className="mt-0.5 text-slate-400" />
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function StatTile({ tone, icon, value, label, hint }: { tone: 'rose' | 'amber' | 'sky'; icon: string; value: unknown; label: string; hint: string }) {
  const wrap = tone === 'rose' ? 'bg-[#FFF1F2] text-rose-500' : tone === 'amber' ? 'bg-[#FFF7ED] text-amber-500' : 'bg-[#EFF6FF] text-sky-500';
  const hintCls = tone === 'rose' ? 'text-rose-400' : tone === 'amber' ? 'text-amber-400' : 'text-sky-400';
  return (
    <div className={`flex flex-col justify-center rounded-2xl px-3.5 py-3 ${wrap}`}>
      <Icon name={icon} size={18} />
      <p className="mt-2 text-[26px] font-semibold leading-none text-slate-900">{String(value)}</p>
      <p className="mt-1.5 text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-[11px] ${hintCls}`}>{hint}</p>
    </div>
  );
}

function FindingDrawer({
  finding,
  busy,
  onClose,
  onReview,
}: {
  finding: any;
  busy: string;
  onClose: () => void;
  onReview: (id: string, decision: string) => void;
}) {
  const locations = locationsOf(finding);
  const evidence = finding.evidence || {};
  const pageUrl = evidence.url || (Array.isArray(finding.affected_urls) ? finding.affected_urls[0] : '') || '';
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 p-4 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">{severityBadge(finding.severity)}{findingStatusBadge(finding.status)}</div>
            <h3 className="text-lg font-semibold text-slate-900">{finding.title}</h3>
            <p className="text-sm text-slate-500">{pagePath(finding)} · {finding.source}{finding.rule_code ? ` · ${finding.rule_code}` : ''}</p>
          </div>
          <button type="button" onClick={onClose}><Icon name="XMarkIcon" size={18} /></button>
        </div>
        <p className="text-sm text-slate-600">{finding.description}</p>
        <dl className="mt-4 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm">
          {pageUrl ? <Row label="Page" value={<a className="text-secondary break-all" href={String(pageUrl)} target="_blank" rel="noreferrer">{String(pageUrl)}</a>} /> : null}
          {finding.selector ? <Row label="Selector" value={<code className="break-all text-xs">{finding.selector}</code>} /> : null}
          {finding.viewport ? <Row label="Viewport" value={finding.viewport} /> : null}
          {evidence.wcag ? <Row label="Standard" value={String(evidence.wcag)} /> : null}
          {finding.standard_reference?.name ? <Row label="Reference" value={`${finding.standard_reference.name}${finding.standard_reference.rule ? ` · ${finding.standard_reference.rule}` : ''}`} /> : null}
        </dl>
        {locations.length ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-900">Exact location{locations.length > 1 ? 's' : ''}</p>
            <ul className="space-y-2">
              {locations.map((item, index) => (
                <li key={`${item.selector}-${index}`} className="rounded-xl border border-slate-200 p-3 text-sm">
                  {item.why ? <p className="text-slate-700">{item.why}</p> : null}
                  {item.selector ? <p className="mt-1 font-mono text-xs text-secondary">{item.selector}</p> : null}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                    {item.name ? <span>name={item.name}</span> : null}
                    {item.id ? <span>id={item.id}</span> : null}
                    {item.type ? <span>type={item.type}</span> : null}
                    {item.href ? <span className="break-all">{item.href}</span> : null}
                    {item.src ? <span className="break-all">{item.src}</span> : null}
                    {item.form ? <span>form {item.form}</span> : null}
                  </div>
                  {item.snippet ? <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100">{item.snippet}</pre> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {finding.recommendation ? (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><span className="font-medium">Fix: </span>{finding.recommendation}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {['confirmed', 'false_positive', 'ignored', 'fixed'].map((decision) => (
            <BusyButton key={decision} busy={busy === `review-${finding.id}-${decision}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs capitalize" onClick={() => void onReview(finding.id, decision)}>
              {decision.replace('_', ' ')}
            </BusyButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2">
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function locationsOf(row: any) {
  const evidence = row?.evidence || {};
  if (Array.isArray(evidence.instances) && evidence.instances.length) {
    return evidence.instances.map((item: any) => ({
      selector: item.selector || row.selector || '',
      snippet: item.snippet,
      why: item.why,
      name: item.name,
      id: item.id,
      type: item.type,
      href: item.href,
      src: item.src,
      form: item.form,
    }));
  }
  const names = Array.isArray(evidence.names) ? evidence.names : [];
  if (names.length) {
    return names.map((name: string) => ({
      selector: row.selector ? `${row.selector}[name="${name}"]` : `[name="${name}"]`,
      name,
      why: 'No associated label on this control',
    }));
  }
  const samples = Array.isArray(evidence.samples) ? evidence.samples : [];
  if (samples.length) {
    return samples.map((sample: string) => ({
      selector: String(sample),
      href: String(sample),
      src: String(sample),
      why: row.description,
    }));
  }
  if (row.selector) return [{ selector: row.selector, why: row.description }];
  return [];
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select className="h-8 rounded-lg border-0 bg-transparent px-2 text-[13px] capitalize text-slate-500 outline-none" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{label}</option>
      {options.filter(Boolean).map((option) => (
        <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
      ))}
    </select>
  );
}
