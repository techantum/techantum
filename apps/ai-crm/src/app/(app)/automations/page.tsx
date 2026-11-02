'use client';

import { useEffect, useState } from 'react';
import { Badge, Btn, Card, PageTitle, SkeletonRows } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

const BLOCKS = [
  'Trigger',
  'Condition',
  'Wait',
  'WhatsApp',
  'AI conversation',
  'Qualification',
  'AI voice',
  'Update lead',
  'Assign user',
  'Task',
  'Webhook/API',
  'End',
];

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/v1/automations')
      .then((body) => {
        setWorkflows(body.workflows || []);
        setExecutions(body.executions || []);
        setSelected(body.workflows?.[0] || null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRows rows={8} />;

  const steps = selected?.definition?.steps || [];

  return (
    <div>
      <PageTitle
        title="Automation Workflows"
        subtitle="Configurable lead-to-call automation with consent gates and execution history."
        actions={
          <>
            <Btn variant="secondary">Templates</Btn>
            <Btn variant="secondary" onClick={() => api('/api/v1/workers/process', { method: 'POST' })}>
              Process queue
            </Btn>
            <Btn onClick={() => api('/api/v1/automations').then((b) => { setWorkflows(b.workflows || []); setExecutions(b.executions || []); })}>
              Refresh
            </Btn>
          </>
        }
      />
      <StatusBanner tone="info">
        Workflows and execution logs are persisted in <b>crm.workflows</b> / <b>crm.workflow_executions</b>. Opt-out stops outbound branches.
      </StatusBanner>

      <div className="grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_280px]">
        <Card className="p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Block library</div>
          <div className="space-y-1">
            {BLOCKS.map((b) => (
              <div key={b} className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                {b}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-900">{selected?.name || 'No workflow'}</div>
              <div className="text-xs text-slate-500">
                Trigger: {selected?.trigger_type || '—'} · {selected?.status || '—'} · v{selected?.version || 1}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {workflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => setSelected(wf)}
                  className={`rounded-lg px-2 py-1 text-xs ${selected?.id === wf.id ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {wf.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            <span>Entry</span>
            <span>→</span>
            <span>Qualification</span>
            <span>→</span>
            <span>Sales</span>
          </div>

          <div className="space-y-2">
            {steps.map((step: any, idx: number) => (
              <div key={idx} className="relative rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-slate-800">{step.type.replaceAll('_', ' ')}</div>
                  <Badge tone={idx === 0 ? 'purple' : step.type.includes('call') ? 'green' : 'slate'}>Step {idx + 1}</Badge>
                </div>
                <pre className="mt-2 overflow-auto text-[11px] text-slate-500">{JSON.stringify(step, null, 2)}</pre>
                {idx < steps.length - 1 ? <div className="absolute -bottom-3 left-6 text-slate-300">↓</div> : null}
              </div>
            ))}
            {!steps.length ? <p className="text-sm text-slate-400">No steps defined</p> : null}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold">Selected block</h3>
            <p className="mt-2 text-sm text-slate-500">
              Wait / consent / WhatsApp / qualification / AI call steps are executed by the workflow engine with retry and
              audit logs.
            </p>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="rounded-lg bg-slate-50 p-2">Response timeout: 24 hours</div>
              <div className="rounded-lg bg-slate-50 p-2">Opt-out: stop workflow + suppress outreach</div>
              <div className="rounded-lg bg-slate-50 p-2">Provider failures: retry 2 times</div>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold">Execution log</h3>
            <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
              {executions.map((ex) => (
                <li key={ex.id} className="rounded-xl border border-slate-100 p-2">
                  <div className="flex justify-between gap-2">
                    <Badge tone={ex.status === 'completed' ? 'green' : ex.status === 'failed' ? 'rose' : 'amber'}>{ex.status}</Badge>
                    <span className="text-[11px] text-slate-400">{new Date(ex.created_at).toLocaleString()}</span>
                  </div>
                  {ex.error ? <div className="mt-1 text-xs text-rose-600">{ex.error}</div> : null}
                </li>
              ))}
              {!executions.length ? <li className="text-slate-400">No executions yet</li> : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
