'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Badge,
  Btn,
  Card,
  Field,
  Modal,
  PageTitle,
  SkeletonRows,
  Tabs,
  inputClass,
  maskEmail,
  maskPhone,
} from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api, qualTone, waTone } from '@/lib/api-client';
import { LEAD_PIPELINE, leadStageLabel } from '@/lib/pipeline';

export default function LeadDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [tab, setTab] = useState('all');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [showCall, setShowCall] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('Site survey follow-up');

  async function load() {
    const body = await api(`/api/v1/leads/${id}`);
    setLead(body.lead);
    setActivities(body.activities || []);
    const [c, t, d] = await Promise.all([
      api('/api/v1/voice-calls'),
      api('/api/v1/tasks'),
      api('/api/v1/documents'),
    ]);
    setCalls((c || []).filter((x: any) => x.lead_id === id));
    setTasks((t || []).filter((x: any) => x.lead_id === id));
    setDocs((d || []).filter((x: any) => x.lead_id === id));
  }

  useEffect(() => {
    if (!id) return;
    load().catch((e) => setError(e.message));
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    await api(`/api/v1/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
    await load();
  }

  async function sendWhatsApp() {
    await api('/api/v1/whatsapp/send-template', {
      method: 'POST',
      body: JSON.stringify({ leadId: id, template: 'welcome' })});
    await load();
  }

  async function scheduleCall() {
    await api('/api/v1/voice-calls', { method: 'POST', body: JSON.stringify({ leadId: id }) });
    await api('/api/v1/workers/process', { method: 'POST' });
    setShowCall(false);
    await load();
  }

  async function createTask(e: FormEvent) {
    e.preventDefault();
    await api('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: taskTitle, leadId: id, priority: 'high', dueAt: new Date(Date.now() + 86400000).toISOString() })});
    setShowTask(false);
    await load();
  }

  async function addNote(e: FormEvent) {
    e.preventDefault();
    await patch({ notes: [lead?.notes, note].filter(Boolean).join('\n') });
    setNote('');
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!lead) return <SkeletonRows rows={8} />;

  const filteredActivities = activities.filter((a) => {
    if (tab === 'all') return true;
    if (tab === 'whatsapp') return String(a.activity_type).includes('whatsapp');
    if (tab === 'calls') return String(a.activity_type).includes('voice');
    if (tab === 'notes') return String(a.activity_type).includes('updated') || a.summary?.includes('note');
    if (tab === 'tasks') return String(a.activity_type).includes('task');
    if (tab === 'documents') return String(a.activity_type).includes('document');
    return true;
  });

  return (
    <div>
      <PageTitle
        title={lead.full_name || 'Lead'}
        subtitle={`Lead ID ${String(lead.id).slice(0, 8)} · ${lead.campaign || lead.source} · Created ${new Date(lead.created_at).toLocaleString()}`}
        actions={
          <>
            <Btn variant="secondary" onClick={sendWhatsApp}>
              Send WhatsApp
            </Btn>
            <Btn variant="secondary" onClick={() => setShowCall(true)}>
              Schedule AI call
            </Btn>
            <Btn
              variant="secondary"
              onClick={async () => {
                await api('/api/v1/documents/request-hot', { method: 'POST', body: JSON.stringify({ leadId: id }) });
                await load();
              }}
            >
              Request docs (Hot)
            </Btn>
            <Btn variant="secondary" onClick={() => setShowTask(true)}>
              Create task
            </Btn>
            <Btn
              variant="danger"
              onClick={async () => {
                await api(`/api/v1/leads/${id}/erase`, { method: 'POST' });
                await load();
              }}
            >
              Erase customer
            </Btn>
            <Link href="/leads" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
              Back
            </Link>
          </>
        }
      />
      <StatusBanner tone="info">
        Lead record, activities, calls, tasks and documents are loaded from the CRM database. Calling requires consent +
        qualification; telephony without credentials will block outbound dials (no fake call outcomes).
      </StatusBanner>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Contact & ownership</div>
          <div className="text-sm text-slate-700">{maskPhone(lead.phone)}</div>
          <div className="text-sm text-slate-700">{maskEmail(lead.email)}</div>
          <div className="mt-2 text-sm">Owner: {lead.assigned_name || 'Unassigned'}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={qualTone(lead.validity_status)}>{lead.validity_status}</Badge>
            <Badge tone={qualTone(lead.qualification_status)}>{lead.qualification_status}</Badge>
            <Badge tone="purple">{leadStageLabel(lead.stage_code)}</Badge>
            <Badge tone={waTone(lead.whatsapp_status)}>{lead.whatsapp_status}</Badge>
          </div>
          <label className="mt-4 block text-sm">
            <span className="text-slate-500">Pipeline stage</span>
            <select
              className={`${inputClass} mt-1`}
              value={lead.stage_code || 'NEW'}
              onChange={(e) => patch({ stageCode: e.target.value })}
            >
              {LEAD_PIPELINE.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">AI assessment</div>
          <div className="text-3xl font-semibold text-slate-900">{lead.lead_score ?? 0}<span className="text-base text-slate-400"> / 100</span></div>
          <div className="mt-2 flex gap-2">
            <Badge tone={qualTone(lead.validity_status)}>Validity: {lead.validity_status}</Badge>
            <Badge tone={qualTone(lead.qualification_status)}>Interest: {lead.qualification_status}</Badge>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {(lead.custom_attributes?.last_qualification?.reasons || []).join(' · ') ||
              lead.notes ||
              'No qualification summary yet.'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Next best action</div>
          <div className="font-medium text-slate-900">{tasks[0]?.title || 'Create sales follow-up'}</div>
          <p className="mt-1 text-sm text-slate-500">
            {tasks[0] ? `Due ${tasks[0].due_at ? new Date(tasks[0].due_at).toLocaleString() : 'soon'}` : 'No open task linked yet.'}
          </p>
          <Btn className="mt-3" variant="secondary" onClick={() => setShowTask(true)}>
            Open follow-up task
          </Btn>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-4">
          <h3 className="font-semibold">Source & custom fields</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Source</dt><dd className="capitalize">{lead.source}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">Campaign</dt><dd>{lead.campaign || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">External ID</dt><dd className="truncate">{lead.external_source_lead_id || '—'}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-slate-500">AI calling</dt><dd className="capitalize">{lead.ai_calling_status}</dd></div>
          </dl>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Consent & preferences</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">WhatsApp consent</dt><dd className="capitalize">{lead.consent_status}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Calling consent</dt><dd>{lead.consent_status === 'granted' ? 'Eligible' : 'Review required'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Window</dt><dd>09:00 – 18:00 IST</dd></div>
          </dl>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Add note</h3>
          <form onSubmit={addNote} className="mt-3 space-y-2">
            <textarea className={inputClass} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note…" />
            <Btn type="submit" variant="secondary">
              + Add note
            </Btn>
          </form>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <h3 className="font-semibold">Unified timeline</h3>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'all', label: 'All activity' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'calls', label: 'Calls' },
            { id: 'notes', label: 'Notes' },
            { id: 'tasks', label: 'Tasks' },
            { id: 'documents', label: 'Documents' },
          ]}
        />
        <ul className="space-y-3">
          {filteredActivities.map((a) => (
            <li key={a.id} className="border-l-2 border-secondary/30 pl-3 text-sm">
              <div className="font-medium text-slate-800">{a.summary || a.activity_type}</div>
              <div className="text-[11px] text-slate-400">{new Date(a.created_at).toLocaleString()}</div>
            </li>
          ))}
          {!filteredActivities.length ? <li className="text-slate-400">No activity in this filter</li> : null}
        </ul>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-4">
          <h3 className="font-semibold">Call record</h3>
          {calls[0] ? (
            <div className="mt-2 text-sm">
              <Badge tone="green">{calls[0].status}</Badge>
              <p className="mt-2 text-slate-600">{calls[0].summary || 'No summary'}</p>
              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-slate-50 p-2 text-[11px] text-slate-600">{calls[0].transcript}</pre>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No calls yet</p>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Linked tasks</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {tasks.map((t) => (
              <li key={t.id} className="rounded-xl border border-slate-100 p-2">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs capitalize text-slate-500">
                  {t.priority} · {t.status}
                </div>
              </li>
            ))}
            {!tasks.length ? <li className="text-slate-400">No tasks</li> : null}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Secure documents</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="rounded-xl border border-slate-100 p-2">
                <div className="font-medium">{d.doc_type}</div>
                <div className="text-xs capitalize text-slate-500">{d.status}</div>
              </li>
            ))}
            {!docs.length ? <li className="text-slate-400">No documents</li> : null}
          </ul>
        </Card>
      </div>

      {showCall ? (
        <Modal title="Schedule AI call" onClose={() => setShowCall(false)}>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="green">Customer replied: {lead.whatsapp_status === 'responded' ? 'Yes' : 'Pending'}</Badge>
            <Badge tone={qualTone(lead.validity_status)}>Valid qualification</Badge>
            <Badge tone="purple">Consent: {lead.consent_status}</Badge>
          </div>
          <Field label="Call purpose / context">
            <textarea className={inputClass} rows={3} defaultValue="Explain offer and arrange follow-up with sales." />
          </Field>
          <p className="mt-2 text-xs text-slate-500">Allowed window 09:00–18:00 IST · Policy check runs before live dial.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setShowCall(false)}>
              Cancel
            </Btn>
            <Btn onClick={scheduleCall}>Schedule call</Btn>
          </div>
        </Modal>
      ) : null}

      {showTask ? (
        <Modal title="Create task" onClose={() => setShowTask(false)}>
          <form onSubmit={createTask} className="space-y-3">
            <Field label="Task title">
              <input className={inputClass} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required />
            </Field>
            <div className="text-sm text-slate-500">Linked lead: {lead.full_name}</div>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" type="button" onClick={() => setShowTask(false)}>
                Cancel
              </Btn>
              <Btn type="submit">Create task</Btn>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
