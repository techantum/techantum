'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Btn, Card, PageTitle, Tabs } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

export default function SourcesPage() {
  const [tab, setTab] = useState('all');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/v1/sources')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Loading sources…</p>;

  const filtered = (data.sources || []).filter((s: any) => {
    if (tab === 'native') return s.native;
    if (tab === 'external') return !s.native;
    return true;
  });

  return (
    <div>
      <PageTitle
        title="Lead Sources"
        subtitle="Live source catalog with lead counts and webhook events from the CRM database."
        actions={
          <Link href="/leads" className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-white">
            + Add lead / import
          </Link>
        }
      />
      <StatusBanner tone="info">
        Mode: <b>{data.mode}</b>. Totals below are real lead counts in schema <b>crm</b>.
      </StatusBanner>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'all', label: `All sources · ${data.sources.length}` },
          { id: 'native', label: `Native · ${data.sources.filter((s: any) => s.native).length}` },
          { id: 'external', label: `External · ${data.sources.filter((s: any) => !s.native).length}` },
        ]}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((source: any) => (
          <Card key={source.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-900">{source.name}</div>
                <div className="text-xs text-slate-500">{source.method}</div>
              </div>
              <Badge tone={source.connected ? 'green' : 'amber'}>{source.status.replaceAll('_', ' ')}</Badge>
            </div>
            <div className="mt-4 text-sm text-slate-600">
              Leads: <b className="text-slate-900">{source.leadCount}</b>
              <div className="text-xs text-slate-400">
                Last lead: {source.lastLeadAt ? new Date(source.lastLeadAt).toLocaleString() : '—'}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {source.id === 'csv' || source.id === 'manual' ? (
                <Link href="/leads" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                  Open leads
                </Link>
              ) : (
                <Link href="/settings" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs">
                  Configure
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold">Latest webhook / ingest events</h3>
          <ul className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">
            {(data.events || []).map((ev: any) => (
              <li key={ev.id} className="rounded-xl border border-slate-100 px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium capitalize">{ev.provider}</span>
                  <Badge tone={ev.status === 'processed' ? 'green' : 'amber'}>{ev.status}</Badge>
                </div>
                <div className="text-[11px] text-slate-400">
                  {ev.event_key || '—'} · {new Date(ev.created_at).toLocaleString()}
                </div>
              </li>
            ))}
            {!data.events?.length ? <li className="text-slate-400">No webhook events yet</li> : null}
          </ul>
        </Card>
        <Card className="p-4 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-900">Attribution rules</h3>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Deduplicate by workspace + normalized phone/email + external source lead ID</li>
            <li>Original submission payloads retained on lead custom attributes</li>
            <li>Ingest endpoint: <code>POST /api/v1/leads/ingest</code></li>
          </ul>
          <Btn className="mt-4" variant="secondary" onClick={() => api('/api/v1/sources').then(setData)}>
            Refresh
          </Btn>
        </Card>
      </div>
    </div>
  );
}
