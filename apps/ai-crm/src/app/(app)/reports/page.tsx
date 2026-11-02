'use client';

import { useEffect, useState } from 'react';
import { Badge, Card, MetricCard, PageTitle, SkeletonRows, Tabs } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/v1/reports/dashboard?days=30')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <SkeletonRows rows={8} />;

  const funnel = [
    ['Total leads', data.funnel.total],
    ['Delivered', data.funnel.delivered],
    ['Responded', data.funnel.responded],
    ['Qualified', data.funnel.qualified],
    ['AI called', data.funnel.called],
    ['Converted', data.funnel.converted],
  ] as const;
  const max = Math.max(...funnel.map(([, v]) => Number(v)), 1);

  return (
    <div>
      <PageTitle title="Reports & Analytics" subtitle="Trace performance from source to sale using live CRM aggregates." />
      <StatusBanner tone="ok">All report figures are aggregated from live CRM tables for this workspace.</StatusBanner>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'acquisition', label: 'Acquisition' },
          { id: 'whatsapp', label: 'WhatsApp' },
          { id: 'qualification', label: 'Qualification' },
          { id: 'voice', label: 'Voice' },
          { id: 'sales', label: 'Sales & follow-ups' },
          { id: 'documents', label: 'Documents & errors' },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Lead → sale conversion" value={`${data.conversionRate}%`} hint={`${data.conversions} / ${data.totalLeads}`} />
        <MetricCard label="WhatsApp response rate" value={`${data.whatsappResponseRate}%`} hint={`${data.whatsappResponded} / ${data.whatsappSent}`} />
        <MetricCard
          label="Call completion"
          value={data.callsCompleted + data.callsFailed ? `${Math.round((data.callsCompleted / Math.max(1, data.callsCompleted + data.callsFailed)) * 1000) / 10}%` : '—'}
          hint={`${data.callsCompleted} completed`}
        />
        <MetricCard label="Open tasks" value={data.openTasks} hint={`${data.overdueTasks} overdue`} tone="warn" />
      </div>

      {(tab === 'overview' || tab === 'acquisition') && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="font-semibold">Lead volume by source</h3>
            <div className="mt-4 space-y-3">
              {(data.leadsBySource || []).map((row: any) => (
                <div key={row.source}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize text-slate-600">{row.source}</span>
                    <span className="font-medium">{row.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-secondary"
                      style={{ width: `${Math.max(6, (row.count / Math.max(data.totalLeads, 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
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
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {(tab === 'overview' || tab === 'whatsapp' || tab === 'qualification') && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="font-semibold">WhatsApp & qualification funnel</h3>
            <div className="mt-4 space-y-3">
              {funnel.map(([label, value]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>{label}</span>
                    <span className="font-medium text-slate-800">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-violet-500" style={{ width: `${Math.max(4, (Number(value) / max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold">Validity vs interest</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="green">Valid {data.validLeads}</Badge>
              <Badge tone="amber">Needs review {data.needsReview}</Badge>
              <Badge tone="rose">Invalid {data.invalidLeads}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="rose">Hot {data.hotLeads}</Badge>
              <Badge tone="orange">Warm {data.warmLeads}</Badge>
              <Badge tone="sky">Cold {data.coldLeads}</Badge>
            </div>
          </Card>
        </div>
      )}

      {(tab === 'voice' || tab === 'overview') && (
        <Card className="mt-4 p-4">
          <h3 className="font-semibold">Voice performance</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Scheduled" value={data.callsScheduled} />
            <MetricCard label="Active" value={data.callsActive} />
            <MetricCard label="Completed" value={data.callsCompleted} tone="ok" />
            <MetricCard label="Failed" value={data.callsFailed} tone="warn" />
            <MetricCard label="Transferred" value={data.callsTransferred} />
          </div>
        </Card>
      )}

      {(tab === 'sales' || tab === 'documents' || tab === 'overview') && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h3 className="font-semibold">Sales & follow-ups</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">Open tasks <b>{data.openTasks}</b></div>
              <div className="rounded-xl bg-slate-50 p-3">Overdue <b>{data.overdueTasks}</b></div>
              <div className="rounded-xl bg-slate-50 p-3">Due today <b>{data.dueTodayTasks}</b></div>
              <div className="rounded-xl bg-slate-50 p-3">Completed <b>{data.completedTasks}</b></div>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold">Documents</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {(data.documents || []).map((row: any) => (
                <li key={row.status} className="flex justify-between">
                  <span className="capitalize">{row.status}</span>
                  <b>{row.count}</b>
                </li>
              ))}
              {!data.documents?.length ? <li className="text-slate-400">No documents yet</li> : null}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
