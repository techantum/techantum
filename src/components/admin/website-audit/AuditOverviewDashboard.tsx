'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BusyButton, PageRedirectLoader } from './AuditBusy';
import { IssueDonut, KpiCard, ScoreSparkline, deltaLabel, statusChip } from './audit-ui';

async function api(path: string) {
  const response = await fetch(`/api/admin/website-audit/${path}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function AuditOverviewDashboard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [redirecting, setRedirecting] = useState('');

  useEffect(() => {
    api('overview').then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (!data && !error) {
    return <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
  }
  if (error) return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>;

  const prev = data.previous || {};
  const last = data.last_scan;
  const breakdown = data.issue_breakdown || {};
  const series = (data.score_series || []).map((row: any) => ({ score: Number(row.score), day: row.day }));
  const insights = buildInsights(last, breakdown);

  return (
    <div className="audit-fade space-y-6">
      <PageRedirectLoader open={Boolean(redirecting)} label={redirecting} />
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Website Audit</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">Monitor your website audits, issue health and AI assistant performance.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon="ClipboardDocumentCheckIcon" iconWrap="bg-orange-50 text-secondary" label="Audits this month" value={data.audits_this_month} delta={deltaLabel(data.audits_this_month, prev.audits_this_month)} />
        <KpiCard icon="GlobeAltIcon" iconWrap="bg-sky-50 text-sky-600" label="Websites audited" value={data.websites_audited} delta={deltaLabel(data.websites_audited, prev.websites_audited)} />
        <KpiCard icon="HeartIcon" iconWrap="bg-emerald-50 text-emerald-600" label="Average health score" value={data.average_score ?? '—'} delta={deltaLabel(Number(data.average_score || 0), prev.average_score)} />
        <KpiCard icon="ExclamationTriangleIcon" iconWrap="bg-red-50 text-red-500" label="Critical open" value={data.critical_open} delta={deltaLabel(data.critical_open, 0)} invertDelta />
        <KpiCard icon="ExclamationCircleIcon" iconWrap="bg-amber-50 text-amber-600" label="Warnings open" value={data.warnings_open} delta={deltaLabel(data.warnings_open, 0)} invertDelta />
        <KpiCard icon="CheckCircleIcon" iconWrap="bg-emerald-50 text-emerald-600" label="Resolved this month" value={data.resolved_this_month} delta={deltaLabel(data.resolved_this_month, prev.resolved_this_month)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.2fr_0.9fr]">
        <section className="audit-fade rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" style={{ animationDelay: '80ms' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Web Master Agent Health</h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${data.agent?.agent_enabled === false ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
              {data.agent?.agent_enabled === false ? 'Paused' : 'Healthy'}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-secondary"><Icon name="SparklesIcon" size={22} /></span>
            <div>
              <p className="font-semibold text-slate-900">Web Master Agent</p>
              <p className="text-sm text-slate-500">AI-powered audit assistant monitoring website health and suggesting improvements.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Meter label="Readiness" value={data.agent?.agent_enabled === false ? 0 : 100} />
            <Meter label="Confidence" value={Math.round(Number(data.agent?.confidence_threshold || 0.6) * 100)} />
            <Meter label="Coverage" value={Math.min(100, (data.websites_audited || 0) * 20 + 40)} />
            <div>
              <p className="text-xs text-slate-400">Last run</p>
              <p className="mt-1 font-medium text-slate-800">{last?.completed_at ? String(last.completed_at).slice(0, 16).replace('T', ' ') : '—'}</p>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">All systems operational. The agent is ready to run audits and analyze results.</p>
        </section>

        <section className="audit-fade rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" style={{ animationDelay: '120ms' }}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Audit performance</h2>
            <span className="text-xs text-slate-400">Last 30 days</span>
          </div>
          <ScoreSparkline points={series} />
        </section>

        <section className="audit-fade rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" style={{ animationDelay: '160ms' }}>
          <h2 className="mb-3 font-semibold text-slate-900">Issue breakdown</h2>
          <IssueDonut
            critical={Number(breakdown.critical || 0)}
            warnings={Number(breakdown.warnings || 0)}
            review={Number(breakdown.review || 0)}
            passed={Number(breakdown.passed || 0)}
          />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent audits</h2>
            <Link className="text-sm text-secondary" href="/admin/website-audit/history" onClick={() => setRedirecting('Opening history…')}>View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  {['Audit name', 'Website', 'Project', 'Last run', 'Pages', 'Score', 'Open issues', 'Status', 'Actions'].map((col) => <th key={col} className="pb-2 pr-3 font-medium">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {(data.recent || []).slice(0, 6).map((row: any) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3 pr-3 font-medium text-slate-800">{row.audit_name}</td>
                    <td className="pr-3 text-slate-500">{row.website_url}</td>
                    <td className="pr-3">{row.project_name || '—'}</td>
                    <td className="pr-3 text-slate-500">{String(row.completed_at || row.created_at || '').slice(0, 16).replace('T', ' ')}</td>
                    <td className="pr-3">{row.pages_scanned ?? 0}</td>
                    <td className="pr-3 font-semibold">{row.overall_score ?? '—'}</td>
                    <td className="pr-3">{row.critical_count || 0} crit · {row.high_count || 0} high</td>
                    <td className="pr-3">{statusChip(row.status)}</td>
                    <td>
                      <Link className="text-secondary" href={`/admin/website-audit/${row.id}`} onClick={() => setRedirecting('Opening audit…')}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-slate-900">Insights & recommendations</h2>
          <ul className="space-y-3 text-sm">
            {insights.map((item) => (
              <li key={item.title} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <Icon name={item.icon} size={18} className="mt-0.5 text-secondary" />
                <span>
                  <span className="block font-medium text-slate-800">{item.title}</span>
                  <span className="text-slate-500">{item.body}</span>
                </span>
              </li>
            ))}
          </ul>
          <BusyButton className="mt-4 w-full rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white" onClick={() => { setRedirecting('Opening new audit…'); window.location.href = '/admin/website-audit/new'; }}>
            Start a new audit
          </BusyButton>
        </section>
      </div>
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{value}%</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-secondary transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function buildInsights(last: any, breakdown: any) {
  const items = [];
  if ((breakdown.warnings || 0) > 0) items.push({ icon: 'DocumentTextIcon', title: 'Reduce remaining warnings', body: `${breakdown.warnings} high/medium issues are still open.` });
  if (last && Number(last.overall_score) < 80) items.push({ icon: 'BoltIcon', title: 'Improve overall health', body: `Last score was ${last.overall_score}. Re-run after fixes to measure lift.` });
  if ((breakdown.critical || 0) === 0) items.push({ icon: 'CheckCircleIcon', title: 'Good critical hygiene', body: 'No critical open issues across recent audits.' });
  items.push({ icon: 'LightBulbIcon', title: 'Use structured data', body: 'Helps improve search visibility and richer results.' });
  return items.slice(0, 4);
}
