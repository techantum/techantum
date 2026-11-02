'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Btn, Card, MetricCard, PageTitle, SkeletonRows } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api, qualTone } from '@/lib/api-client';

export default function PipelinePage() {
  const [stages, setStages] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const body = await api('/api/v1/pipelines');
      setStages(body.stages || []);
      setLeads(body.leads || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function move(leadId: string, stageCode: string) {
    await api(`/api/v1/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify({ stageCode }) });
    await load();
  }

  const open = useMemo(() => leads.filter((l) => !['CONVERTED', 'LOST'].includes(l.stage_code)), [leads]);
  const won = useMemo(() => leads.filter((l) => l.stage_code === 'CONVERTED').length, [leads]);

  if (loading) return <SkeletonRows rows={8} />;
  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div>
      <PageTitle
        title="Sales Pipeline"
        subtitle="Track opportunities through AI qualification into human sales ownership."
        actions={
          <>
            <Btn variant={view === 'kanban' ? 'primary' : 'secondary'} onClick={() => setView('kanban')}>
              Kanban
            </Btn>
            <Btn variant={view === 'table' ? 'primary' : 'secondary'} onClick={() => setView('table')}>
              Table
            </Btn>
            <Link href="/leads" className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium text-white">
              + Add opportunity
            </Link>
          </>
        }
      />
      <StatusBanner>
        Stage movement updates the CRM database and activity history. Calling eligibility remains policy-driven — not inferred from stage alone.
      </StatusBanner>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Open opportunities" value={open.length} />
        <MetricCard label="Won" value={won} tone="ok" />
        <MetricCard label="In pipeline" value={leads.length} />
        <MetricCard label="Stages" value={stages.length} />
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {stages.map((s) => {
          const count = leads.filter((l) => l.pipeline_stage_id === s.id || l.stage_code === s.code).length;
          return (
            <div key={s.id} className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
              {s.label} <b className="text-slate-900">{count}</b>
            </div>
          );
        })}
      </div>

      {view === 'kanban' ? (
        <div className="crm-kanban crm-scroll pb-2">
          {stages.map((stage) => {
            const column = leads.filter((l) => l.pipeline_stage_id === stage.id || l.stage_code === stage.code);
            return (
              <Card key={stage.id} className="flex max-h-[70vh] flex-col p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{stage.label}</div>
                    <div className="text-[11px] text-slate-400">{column.length} leads</div>
                  </div>
                </div>
                <div className="crm-scroll space-y-2 overflow-y-auto">
                  {column.map((lead) => (
                    <div key={lead.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-secondary">
                        {lead.full_name || lead.phone}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone="purple">{lead.source}</Badge>
                        <Badge tone={qualTone(lead.qualification_status)}>
                          {lead.lead_score ?? 0}/100
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {stages.slice(0, 6).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => move(lead.id, s.code)}
                            className={`rounded-md px-1.5 py-0.5 text-[10px] ${
                              s.code === stage.code ? 'bg-secondary text-white' : 'bg-white text-slate-500'
                            }`}
                          >
                            {s.code.replaceAll('_', ' ').slice(0, 10)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {!column.length ? <div className="py-8 text-center text-xs text-slate-400">Empty stage</div> : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:text-secondary">
                      {lead.full_name || lead.phone}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{lead.stage_code}</td>
                  <td className="px-4 py-3">{lead.lead_score}</td>
                  <td className="px-4 py-3 capitalize">{lead.source || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
