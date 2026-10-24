'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { downloadResearchReport } from '@/components/admin/youtube/research-ui';
import { ProjectRequired, useProjectId, yt } from '@/components/admin/youtube/YoutubeFrame';

const REPORT_TYPES = [
  { id: 'performance', label: 'Existing Performance Report' },
  { id: 'gap', label: 'Video Gap Analysis Report' },
  { id: 'high_performing', label: 'High-Performing Content Research Report' },
  { id: 'competitor', label: 'Own vs Competitor Research Report' },
  { id: 'improvement_plan', label: 'Content Improvement Plan' },
  { id: 'executive', label: 'Executive Research Report' },
];

const selectClass = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800';

function typeLabel(id: string) {
  return REPORT_TYPES.find((item) => item.id === id)?.label || id;
}

function Reports() {
  const projectId = useProjectId();
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, any>[]>([]);
  const [name, setName] = useState('');
  const [reportType, setReportType] = useState('executive');
  const [analysisId, setAnalysisId] = useState('');
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState('');

  const load = async () => {
    const [listed, analysisRows] = await Promise.all([
      yt(`projects/${projectId}/research-reports`),
      yt(`projects/${projectId}/ai-analyses`),
    ]);
    setRows(listed || []);
    setAnalyses(analysisRows || []);
    if (!analysisId && analysisRows?.[0]?.id) setAnalysisId(analysisRows[0].id);
  };

  useEffect(() => {
    if (!projectId) return;
    load().catch((err) => setError(err.message)).finally(() => setReady(true));
  }, [projectId]);

  const visible = useMemo(() => rows.filter((row) => {
    const hay = `${row.name} ${row.report_type}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!typeFilter || row.report_type === typeFilter);
  }), [rows, q, typeFilter]);

  const create = async () => {
    try {
      setBusy(true);
      setError('');
      setMessage('');
      await yt(`projects/${projectId}/research-reports`, { method: 'POST', body: JSON.stringify({ name, report_type: reportType, analysis_id: analysisId }) });
      setName('');
      setMessage('Report saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create report');
    } finally {
      setBusy(false);
    }
  };

  const archive = async (id: string) => {
    setPending(`archive:${id}`);
    try {
      await yt(`projects/${projectId}/research-reports/${id}/archive`, { method: 'POST', body: '{}' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive report');
    } finally {
      setPending('');
    }
  };

  const download = async (id: string, format: 'pdf' | 'xlsx') => {
    setPending(`${format}:${id}`);
    try {
      setError('');
      await downloadResearchReport(projectId, id, format);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export report');
    } finally {
      setPending('');
    }
  };

  const openPreview = async (row: Record<string, any>) => {
    setPending(`preview:${row.id}`);
    try {
      const report = await yt(`projects/${projectId}/research-reports/${row.id}`);
      setPreview(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not preview report');
    } finally {
      setPending('');
    }
  };

  if (!ready && !error) return <PageLoader label="Loading reports…" />;

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">Generated reports</h2>
          <div className="flex flex-wrap gap-2">
            <input className="h-10 rounded-xl border border-slate-200 px-3 text-sm" placeholder="Search" value={q} onChange={(event) => setQ(event.target.value)} />
            <select className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">All types</option>
              {REPORT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                {['Report name', 'Type', 'Generated on', 'Status', 'Download'].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length ? visible.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-3 text-slate-600">{typeLabel(row.report_type)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">{String(row.generated_at || '').slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3"><AdminBadge variant={row.status === 'ready' ? 'green' : 'default'}>{row.status}</AdminBadge></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <AdminButton size="sm" loading={pending === `preview:${row.id}`} onClick={() => openPreview(row)}>Preview</AdminButton>
                      <AdminButton size="sm" loading={pending === `pdf:${row.id}`} onClick={() => download(row.id, 'pdf')}>PDF</AdminButton>
                      <AdminButton size="sm" loading={pending === `xlsx:${row.id}`} onClick={() => download(row.id, 'xlsx')}>Excel</AdminButton>
                      <AdminButton size="sm" variant="ghost" loading={pending === `archive:${row.id}`} onClick={() => archive(row.id)}>Archive</AdminButton>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td className="px-4 py-10 text-sm text-slate-500" colSpan={5}>No reports yet. Select videos and click Download report, or generate one below from a saved AI Analysis.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">Create report</h2>
        <p className="mt-0.5 text-xs text-slate-400">Reports reuse a saved AI Analysis. They do not invent extra analytics.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
          <label className="text-xs font-semibold text-slate-500">
            Report name
            <input className={selectClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="October executive research" />
          </label>
          <label className="text-xs font-semibold text-slate-500">
            Report type
            <select className={selectClass} value={reportType} onChange={(event) => setReportType(event.target.value)}>
              {REPORT_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">
            AI Analysis
            <select className={selectClass} value={analysisId} onChange={(event) => setAnalysisId(event.target.value)}>
              {!analyses.length ? <option value="">Generate an analysis first</option> : null}
              {analyses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <AdminButton variant="primary" className="h-11 w-full" loading={busy} disabled={!analysisId} onClick={create}>Generate Report</AdminButton>
          </div>
        </div>
      </section>

      {preview ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bricolage text-[15px] font-semibold text-slate-900">{preview.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{preview.payload?.analysis?.result?.summary?.headline}</p>
            </div>
            <AdminButton size="sm" onClick={() => setPreview(null)}>Close</AdminButton>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{preview.payload?.analysis?.result?.summary?.body}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {(preview.payload?.analysis?.result?.observations || []).slice(0, 6).map((item: Record<string, string>) => (
              <li key={item.headline}>{item.headline}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProjectRequired>
      <Reports />
    </ProjectRequired>
  );
}
