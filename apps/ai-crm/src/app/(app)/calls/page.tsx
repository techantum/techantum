'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Btn, Card, MetricCard, PageTitle, SkeletonRows, Tabs, WarnBanner } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

export default function CallsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [tab, setTab] = useState('dashboard');
  const [selected, setSelected] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [calls, integ, camps] = await Promise.all([
      api('/api/v1/voice-calls'),
      api('/api/v1/integrations'),
      api('/api/v1/campaigns'),
    ]);
    setRows(calls || []);
    setIntegrations(integ);
    setCampaigns(camps);
    setSelected(calls?.[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const metrics = useMemo(() => {
    return {
      scheduled: rows.filter((r) => ['scheduled', 'queued'].includes(r.status)).length,
      active: rows.filter((r) => ['dialing', 'ringing', 'connected'].includes(r.status)).length,
      completed: rows.filter((r) => r.status === 'completed').length,
      failed: rows.filter((r) => r.status === 'failed').length,
      transferred: rows.filter((r) => r.status === 'transferred').length,
      blocked: rows.filter((r) => r.status === 'blocked').length,
    };
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (tab === 'scheduled') return ['scheduled', 'queued'].includes(r.status);
    if (tab === 'active') return ['dialing', 'ringing', 'connected'].includes(r.status);
    if (tab === 'history') return ['completed', 'failed', 'transferred', 'cancelled'].includes(r.status);
    return true;
  });

  async function processJobs() {
    await api('/api/v1/workers/process', { method: 'POST' });
    await load();
  }

  if (loading) return <SkeletonRows rows={8} />;

  return (
    <div>
      <PageTitle
        title="AI Voice Calls"
        subtitle="Schedule and review outbound AI calls with consent, recordings and dispositions."
        actions={
          <>
            <Btn variant="secondary" onClick={processJobs}>
              Process job queue
            </Btn>
            <Link href="/leads" className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-white">
              Schedule real call
            </Link>
          </>
        }
      />
      {!integrations?.liveReadiness?.telephony ? (
        <StatusBanner tone="warn">
          Telephony credentials are not configured. Scheduled AI calls are stored in the DB and marked <b>blocked</b> —
          no fabricated transcripts or fake completions.
        </StatusBanner>
      ) : (
        <StatusBanner tone="ok">Telephony credentials present. Live dial adapter must still be vendor-wired before outbound audio.</StatusBanner>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'dashboard', label: 'Call Dashboard' },
          { id: 'scheduled', label: 'Scheduled Calls' },
          { id: 'active', label: 'Active Calls' },
          { id: 'history', label: 'Call History' },
        ]}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Scheduled" value={metrics.scheduled} />
        <MetricCard label="Active" value={metrics.active} />
        <MetricCard label="Completed" value={metrics.completed} tone="ok" />
        <MetricCard label="Failed" value={metrics.failed} tone="warn" />
        <MetricCard label="Transferred" value={metrics.transferred} />
      </div>

      <Card className="mb-4 border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-900">
        IVR provider: <b>{campaigns?.telephony?.provider || 'unassigned'}</b> · configured:{' '}
        <b>{String(campaigns?.telephony?.configured)}</b> · concurrency cap{' '}
        <b>{campaigns?.telephony?.maxConcurrency || 5}</b> ·{' '}
        <Link href="/settings" className="font-medium underline">
          Edit limits
        </Link>
        <div className="mt-2 flex flex-wrap gap-2">
          <Btn
            variant="secondary"
            onClick={async () => {
              await api('/api/v1/campaigns', {
                method: 'POST',
                body: JSON.stringify({ name: `Campaign ${new Date().toLocaleDateString()}`, languages: ['en', 'hi', 'bn', 'ta', 'te', 'mr'] }),
              });
              await load();
            }}
          >
            Create outbound campaign
          </Btn>
          {(campaigns?.campaigns || []).slice(0, 3).map((c: any) => (
            <span key={c.id} className="rounded-full bg-white px-2 py-1 text-xs text-emerald-800">
              {c.name} · {c.status} · conc {c.concurrency_limit}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <Card className="overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Provider</th>
                <th className="px-3 py-3">Scheduled</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelected(row)}
                  className={`cursor-pointer border-t border-slate-100 hover:bg-violet-50/50 ${selected?.id === row.id ? 'bg-violet-50/70' : ''}`}
                >
                  <td className="px-3 py-3">
                    <div className="font-medium">{row.full_name || row.phone}</div>
                    <div className="text-[11px] text-slate-400">{row.phone}</div>
                  </td>
                  <td className="px-3 py-3">{row.provider}</td>
                  <td className="px-3 py-3 text-xs">{row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : '—'}</td>
                  <td className="px-3 py-3">
                    <Badge tone={row.status === 'completed' ? 'green' : row.status === 'failed' ? 'rose' : 'purple'}>{row.status}</Badge>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{row.disposition || row.summary || '—'}</td>
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-slate-400">
                    No calls in this view
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold">Call detail</h3>
          {selected ? (
            <div className="mt-3 space-y-3 text-sm">
              <div className="font-medium text-slate-900">{selected.full_name}</div>
              <Badge tone="purple">{selected.status}</Badge>
              <p className="text-slate-600">{selected.summary || 'No summary yet.'}</p>
              <div>
                <div className="text-xs uppercase text-slate-500">Transcript</div>
                <pre className="mt-1 max-h-56 overflow-auto rounded-xl bg-slate-50 p-2 text-[11px] text-slate-600">
                  {selected.transcript || 'No transcript'}
                </pre>
              </div>
              <Btn variant="secondary" disabled>
                Play real recording (disabled)
              </Btn>
            </div>
          ) : (
            <p className="mt-3 text-slate-400">Select a call</p>
          )}
        </Card>
      </div>
    </div>
  );
}
