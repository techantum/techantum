'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Card, MetricCard, PageTitle, SkeletonRows } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

type Metrics = Awaited<ReturnType<typeof Object>> & Record<string, any>;

export default function OverviewPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/v1/reports/dashboard?days=30')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <SkeletonRows rows={8} />;

  const funnel = [
    { label: 'Total leads', value: data.funnel.total },
    { label: 'Delivered', value: data.funnel.delivered },
    { label: 'Responded', value: data.funnel.responded },
    { label: 'Qualified', value: data.funnel.qualified },
    { label: 'AI called', value: data.funnel.called },
    { label: 'Converted', value: data.funnel.converted },
  ];
  const maxFunnel = Math.max(...funnel.map((f) => f.value), 1);

  return (
    <div>
      <PageTitle
        title="Overview"
        subtitle="Lead generation, AI qualification and sales conversion for this workspace."
        actions={
          <Link href="/leads" className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-white">
            Open leads
          </Link>
        }
      />
      <StatusBanner tone="ok">
        Live metrics from the CRM database (<b>crm</b> schema). Empty values mean no records yet.
      </StatusBanner>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Total leads" value={data.totalLeads} hint={`${data.newLeads} in last ${data.rangeDays}d`} />
        <MetricCard label="New leads today" value={data.newToday} />
        <MetricCard label="WhatsApp sent" value={data.whatsappSent} hint={`${data.whatsappResponseRate}% response rate`} />
        <MetricCard label="WhatsApp responses" value={data.whatsappResponded} />
        <MetricCard label="AI qualified" value={data.aiQualified} />
        <MetricCard label="Valid leads" value={data.validLeads} tone="ok" />
        <MetricCard label="Hot leads" value={data.hotLeads} tone="hot" />
        <MetricCard label="AI calls completed" value={data.callsCompleted} />
        <MetricCard label="Sales conversions" value={data.conversions} hint={`${data.conversionRate}% conversion`} tone="ok" />
        <MetricCard label="Pending follow-ups" value={data.openTasks} hint={`${data.overdueTasks} overdue`} tone="warn" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Lead conversion funnel</h3>
            <Badge tone="purple">{data.conversionRate}% overall</Badge>
          </div>
          <div className="space-y-3">
            {funnel.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{row.label}</span>
                  <span className="font-medium text-slate-800">{row.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-secondary"
                    style={{ width: `${Math.max(4, (row.value / maxFunnel) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-900">Lead quality</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Validity</div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="green">Valid {data.validLeads}</Badge>
                <Badge tone="amber">Needs review {data.needsReview}</Badge>
                <Badge tone="rose">Invalid {data.invalidLeads}</Badge>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Interest</div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="rose">Hot {data.hotLeads}</Badge>
                <Badge tone="orange">Warm {data.warmLeads}</Badge>
                <Badge tone="sky">Cold {data.coldLeads}</Badge>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">AI calling</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-2">Scheduled <b>{data.callsScheduled}</b></div>
                <div className="rounded-lg bg-slate-50 p-2">Active <b>{data.callsActive}</b></div>
                <div className="rounded-lg bg-slate-50 p-2">Completed <b>{data.callsCompleted}</b></div>
                <div className="rounded-lg bg-slate-50 p-2">Failed <b>{data.callsFailed}</b></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 font-semibold">Source performance</div>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Leads</th>
                <th className="px-4 py-2">Responded</th>
                <th className="px-4 py-2">Qualified</th>
              </tr>
            </thead>
            <tbody>
              {(data.leadsBySource || []).map((row: any) => (
                <tr key={row.source} className="border-t border-slate-100">
                  <td className="px-4 py-2 capitalize">{row.source}</td>
                  <td className="px-4 py-2">{row.count}</td>
                  <td className="px-4 py-2">{row.responded}</td>
                  <td className="px-4 py-2">{row.qualified}</td>
                </tr>
              ))}
              {!data.leadsBySource?.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-slate-400">
                    No leads yet
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-900">Recent activity</h3>
          <ul className="mt-3 space-y-3">
            {(data.activities || []).map((a: any) => (
              <li key={a.id} className="border-l-2 border-secondary/40 pl-3 text-sm">
                <div className="font-medium text-slate-800">
                  {a.lead_name ? `${a.lead_name}: ` : ''}
                  {a.summary || a.activity_type}
                </div>
                <div className="text-[11px] text-slate-400">{new Date(a.created_at).toLocaleString()}</div>
              </li>
            ))}
            {!data.activities?.length ? <li className="text-sm text-slate-400">No activity yet</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
