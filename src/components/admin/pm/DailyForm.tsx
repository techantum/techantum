'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminButton from '@/components/admin/AdminButton';
import { Field, inputClass } from './ui';

export default function DailyForm({ updateId }: { updateId?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [lookups, setLookups] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState<Record<string, any>>({ project_id: search?.get('projectId') || '', escalate: false });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/pm/lookups').then((r) => r.json()).then(setLookups);
    if (updateId) fetch(`/api/admin/pm/daily/${updateId}`).then((r) => r.json()).then(setForm);
  }, [updateId]);

  useEffect(() => {
    if (!form.project_id || updateId) return;
    fetch(`/api/admin/pm/daily/prefill?projectId=${form.project_id}`).then((r) => r.json()).then((body) => {
      setForm((current) => ({
        ...current,
        update_date: body.update_date,
        work_done: current.work_done || body.suggested_work_done,
        completion_percent: current.completion_percent || body.suggested_completion,
      }));
    });
  }, [form.project_id, updateId]);

  const project = (lookups.projects || []).find((item) => item.id === form.project_id);
  const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value, ...(key === 'rag' && value === 'red' ? { escalate: true } : {}) }));
  const employees = (lookups.employees || []).filter((employee) => employee.status === 'active' || employee.id === form.blocker_owner_id || employee.id === form.action_owner_id);

  const save = async () => {
    const res = await fetch(updateId ? `/api/admin/pm/daily/${updateId}` : '/api/admin/pm/daily', {
      method: updateId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error || 'Could not save the update'); return; }
    router.push('/admin/pm/daily');
  };

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Update Date"><input type="date" className={inputClass} value={form.update_date || ''} onChange={(e) => set('update_date', e.target.value)} /></Field>
        <Field label="Project"><select className={inputClass} value={form.project_id || ''} onChange={(e) => set('project_id', e.target.value)}><option value="">Select</option>{(lookups.projects || []).map((item) => <option key={item.id} value={item.id}>{item.project_code} {item.project_name}</option>)}</select></Field>
        <Field label="Client"><input className={inputClass} readOnly value={project?.client_name || form.client_name || ''} /></Field>
        <Field label="Account Manager"><input className={inputClass} readOnly value={project?.account_manager_name || form.account_manager_name || ''} /></Field>
        <Field label="Category"><input className={inputClass} readOnly value={project?.category || form.category || ''} /></Field>
        <Field label="AM Input Received"><select className={inputClass} value={String(form.am_input_received || false)} onChange={(e) => set('am_input_received', e.target.value === 'true')}><option value="false">No</option><option value="true">Yes</option></select></Field>
        <Field label="RAG"><select className={inputClass} value={form.rag || ''} onChange={(e) => set('rag', e.target.value)}><option value="">Select</option><option value="green">Green</option><option value="amber">Amber</option><option value="red">Red</option></select></Field>
        <Field label="Completion %"><input type="number" className={inputClass} value={form.completion_percent ?? ''} onChange={(e) => set('completion_percent', e.target.value)} /></Field>
        <Field label="Team Hours Previous Day"><input type="number" className={inputClass} value={form.team_hours ?? ''} onChange={(e) => set('team_hours', e.target.value)} /></Field>
        <Field label="Blocker Owner"><select className={inputClass} value={form.blocker_owner_id || ''} onChange={(e) => set('blocker_owner_id', e.target.value)}><option value="">Select</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></Field>
        <Field label="Action Owner"><select className={inputClass} value={form.action_owner_id || ''} onChange={(e) => set('action_owner_id', e.target.value)}><option value="">Select</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></Field>
        <Field label="Action Due"><input type="date" className={inputClass} value={form.action_due_date || ''} onChange={(e) => set('action_due_date', e.target.value)} /></Field>
        <Field label="Escalate to Manager"><select className={inputClass} value={String(form.escalate || false)} onChange={(e) => set('escalate', e.target.value === 'true')}><option value="false">No</option><option value="true">Yes</option></select></Field>
      </div>
      <Field label="Work Done Previous Day"><textarea className={inputClass} rows={3} value={form.work_done || ''} onChange={(e) => set('work_done', e.target.value)} /></Field>
      <Field label="Plan for Today"><textarea className={inputClass} rows={3} value={form.plan_today || ''} onChange={(e) => set('plan_today', e.target.value)} /></Field>
      <Field label="Blockers / Risks"><textarea className={inputClass} rows={2} value={form.blockers || ''} onChange={(e) => set('blockers', e.target.value)} /></Field>
      <Field label="Client Dependency / Communication"><textarea className={inputClass} rows={2} value={form.client_dependency || ''} onChange={(e) => set('client_dependency', e.target.value)} /></Field>
      <Field label="Next Action"><textarea className={inputClass} rows={2} value={form.next_action || ''} onChange={(e) => set('next_action', e.target.value)} /></Field>
      <Field label="Manager Remarks"><textarea className={inputClass} rows={2} value={form.manager_remarks || ''} onChange={(e) => set('manager_remarks', e.target.value)} /></Field>
      <AdminButton variant="primary" onClick={save}>Save Update</AdminButton>
    </div>
  );
}
