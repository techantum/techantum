'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminButton from '@/components/admin/AdminButton';
import { WhatsAppModal } from '@/components/admin/ops/OpsShared';
import { staffSlot, type StaffSlot } from '@/lib/pm/calculate';
import { Field, inputClass } from './ui';

const CATEGORIES = [
  ['planned_to_onboard', 'Planned to Onboard'],
  ['onboarded', 'Onboarded'],
  ['ongoing', 'Ongoing'],
  ['delivered', 'Delivered'],
  ['on_hold', 'On Hold'],
  ['cancelled', 'Cancelled'],
];

type Employee = { id: string; full_name: string; status: string; designation?: string | null; department?: string | null; project_role?: string | null };
type RequirementItem = { id: string; kind: string; label?: string | null; external_url?: string | null; original_filename?: string | null };

export default function ProjectForm({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const [lookups, setLookups] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState<Record<string, string>>({ category: 'planned_to_onboard', priority: 'medium' });
  const [developers, setDevelopers] = useState<string[]>(['']);
  const [files, setFiles] = useState<RequirementItem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [url, setUrl] = useState('');
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState('');
  const [waOpen, setWaOpen] = useState(false);
  const [wa, setWa] = useState<Record<string, any>>({});
  const [sending, setSending] = useState(false);
  const [savedId, setSavedId] = useState(projectId || '');

  useEffect(() => {
    fetch('/api/admin/pm/lookups').then((r) => r.json()).then(setLookups);
    if (projectId) {
      fetch(`/api/admin/pm/projects/${projectId}`).then((r) => r.json()).then((body) => {
        const project = body.project || {};
        setForm({
          version: project.version != null ? String(project.version) : '',
          client_id: project.client_id || '',
          project_name: project.project_name || '',
          project_type_id: project.project_type_id || '',
          category: project.category || 'planned_to_onboard',
          priority: project.priority || 'medium',
          account_manager_id: project.account_manager_id || '',
          lead_developer_id: project.lead_developer_id || '',
          start_date: String(project.start_date || '').slice(0, 10),
          actual_start_date: String(project.actual_start_date || '').slice(0, 10),
          planned_end_date: String(project.planned_end_date || '').slice(0, 10),
          revised_end_date: String(project.revised_end_date || '').slice(0, 10),
          phase_id: project.phase_id || '',
          next_milestone: project.next_milestone || '',
          milestone_due_date: String(project.milestone_due_date || '').slice(0, 10),
          signoff_date: String(project.signoff_date || '').slice(0, 10),
          notes: project.notes || '',
        });
        const assigned = (body.team || [])
          .filter((row: { status?: string; responsibility?: string }) => row.status === 'active' && row.responsibility === 'developer')
          .map((row: { employee_id: string }) => row.employee_id);
        setDevelopers(assigned.length ? assigned : ['']);
        setFiles(body.files || []);
      });
    }
  }, [projectId]);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const people = (slot: StaffSlot, selected?: string): Employee[] => (lookups.employees || []).filter((employee) => {
    const active = employee.status === 'active' || employee.id === selected;
    return active && (staffSlot(employee) === slot || employee.id === selected);
  });

  const save = async () => {
    setError('');
    if (!form.lead_developer_id) {
      setError('Choose the lead. Everyone on this project reports to the lead.');
      return;
    }
    const id = savedId;
    const payload = {
      ...form,
      developer_ids: developers.filter(Boolean).filter((employeeId) => employeeId !== form.lead_developer_id),
      confirm_override: override,
      override_reason: reason,
    };
    const res = await fetch(id ? `/api/admin/pm/projects/${id}` : '/api/admin/pm/projects', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Could not save the project');
      return;
    }
    const projectIdSaved = body.id || id;
    setSavedId(projectIdSaved);
    if (body.version != null) setForm((current) => ({ ...current, version: String(body.version) }));
    for (const file of pendingFiles) {
      const data = new FormData();
      data.append('file', file);
      const uploaded = await fetch(`/api/admin/pm/projects/${projectIdSaved}/requirements`, { method: 'POST', body: data });
      const uploadedBody = await uploaded.json();
      if (!uploaded.ok) {
        setError(uploadedBody.error || 'The project was saved, but a requirement file was not uploaded');
        return;
      }
    }
    for (const link of pendingUrls) {
      const uploaded = await fetch(`/api/admin/pm/projects/${projectIdSaved}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link }),
      });
      const uploadedBody = await uploaded.json();
      if (!uploaded.ok) {
        setError(uploadedBody.error || 'The project was saved, but a requirement link was not saved');
        return;
      }
    }
    setPendingFiles([]);
    setPendingUrls([]);
    if (!projectId) {
      const preview = await fetch(`/api/admin/pm/projects/${projectIdSaved}/whatsapp/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'welcome' }),
      });
      const message = await preview.json();
      if (preview.ok && message.whatsapp_number) {
        setWa(message);
        setWaOpen(true);
        return;
      }
    }
    router.push(`/admin/pm/projects/${projectIdSaved}`);
  };

  const sendWelcome = async () => {
    setSending(true);
    const res = await fetch(`/api/admin/pm/projects/${savedId}/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'welcome', message: wa.message }),
    });
    const body = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(body.error || 'WhatsApp was not sent');
      return;
    }
    router.push(`/admin/pm/projects/${savedId}`);
  };

  const removeSaved = async (itemId: string) => {
    if (!savedId) return;
    const res = await fetch(`/api/admin/pm/projects/${savedId}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remove_id: itemId }),
    });
    if (res.ok) setFiles((current) => current.filter((item) => item.id !== itemId));
  };

  const options = (slot: StaffSlot, selected: string, taken: string[] = []) => people(slot, selected)
    .filter((employee) => employee.id === selected || !taken.includes(employee.id))
    .map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>);

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p> : null}
      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Project Basics</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Client"><select className={inputClass} value={form.client_id || ''} onChange={(e) => set('client_id', e.target.value)}><option value="">Select client</option>{(lookups.clients || []).map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
          <Field label="Project Name"><input className={inputClass} value={form.project_name || ''} onChange={(e) => set('project_name', e.target.value)} /></Field>
          <Field label="Project Type"><select className={inputClass} value={form.project_type_id || ''} onChange={(e) => set('project_type_id', e.target.value)}><option value="">Select type</option>{(lookups.types || []).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>
          <Field label="Category"><select className={inputClass} value={form.category || ''} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Priority"><select className={inputClass} value={form.priority || 'medium'} onChange={(e) => set('priority', e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></Field>
          <Field label="Phase"><select className={inputClass} value={form.phase_id || ''} onChange={(e) => set('phase_id', e.target.value)}><option value="">Select phase</option>{(lookups.phases || []).map((phase) => <option key={phase.id} value={phase.id}>{phase.name}</option>)}</select></Field>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Team</h2>
          <p className="text-xs text-slate-500">Each list shows only people in that role. The lead is set here, and the developers report to that lead.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Account Manager">
            <select className={inputClass} value={form.account_manager_id || ''} onChange={(e) => set('account_manager_id', e.target.value)}>
              <option value="">Select account manager</option>
              {options('account_manager', form.account_manager_id || '')}
            </select>
          </Field>
          <Field label="Lead">
            <select className={inputClass} value={form.lead_developer_id || ''} onChange={(e) => set('lead_developer_id', e.target.value)}>
              <option value="">Select lead</option>
              {options('lead', form.lead_developer_id || '')}
            </select>
          </Field>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Developers</p>
          {developers.map((employeeId, index) => (
            <div key={`${index}-${employeeId}`} className="flex gap-2">
              <select className={inputClass} value={employeeId} onChange={(e) => setDevelopers((current) => current.map((value, item) => item === index ? e.target.value : value))}>
                <option value="">Select developer</option>
                {options('developer', employeeId, developers.filter((value) => value && value !== employeeId))}
              </select>
              <button type="button" className="rounded-xl border border-slate-200 px-3 text-sm text-slate-600" onClick={() => setDevelopers((current) => current.filter((_, item) => item !== index).concat(current.length === 1 ? [''] : []))}>Remove</button>
            </div>
          ))}
          <button type="button" className="text-sm font-medium text-secondary" onClick={() => setDevelopers((current) => [...current, ''])}>Add developer</button>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Timeline & Delivery</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Expected Start"><input type="date" className={inputClass} value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value)} /></Field>
          <Field label="Actual Start"><input type="date" className={inputClass} value={form.actual_start_date || ''} onChange={(e) => set('actual_start_date', e.target.value)} /></Field>
          <Field label="Planned End"><input type="date" className={inputClass} value={form.planned_end_date || ''} onChange={(e) => set('planned_end_date', e.target.value)} /></Field>
          <Field label="Revised End"><input type="date" className={inputClass} value={form.revised_end_date || ''} onChange={(e) => set('revised_end_date', e.target.value)} /></Field>
          <Field label="Next Milestone"><input className={inputClass} value={form.next_milestone || ''} onChange={(e) => set('next_milestone', e.target.value)} /></Field>
          <Field label="Milestone Due"><input type="date" className={inputClass} value={form.milestone_due_date || ''} onChange={(e) => set('milestone_due_date', e.target.value)} /></Field>
          <Field label="Sign-off Date"><input type="date" className={inputClass} value={form.signoff_date || ''} onChange={(e) => set('signoff_date', e.target.value)} /></Field>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Project Requirements</h2>
          <p className="text-xs text-slate-500">Upload PDFs and images, or add a link.</p>
        </div>
        <label className="block text-sm text-slate-600">
          Files
          <input className="mt-1 block w-full text-sm" type="file" accept="application/pdf,image/*" multiple onChange={(e) => setPendingFiles(Array.from(e.target.files || []))} />
        </label>
        {pendingFiles.length ? <ul className="text-sm text-slate-600">{pendingFiles.map((file) => <li key={file.name}>{file.name}</li>)}</ul> : null}
        <div className="flex gap-2">
          <input className={inputClass} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="button" className="rounded-xl border border-slate-200 px-3 text-sm text-slate-700" onClick={() => { if (url.trim()) { setPendingUrls((current) => [...current, url.trim()]); setUrl(''); } }}>Add URL</button>
        </div>
        {pendingUrls.length ? <ul className="text-sm text-slate-600">{pendingUrls.map((link) => <li key={link} className="flex items-center justify-between gap-2"><span className="truncate">{link}</span><button type="button" className="text-slate-500" onClick={() => setPendingUrls((current) => current.filter((item) => item !== link))}>Remove</button></li>)}</ul> : null}
        {files.length ? (
          <ul className="space-y-1 text-sm">
            {files.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                {item.kind === 'url' ? <a className="truncate text-secondary" href={item.external_url || '#'} target="_blank" rel="noreferrer">{item.external_url}</a> : <a className="truncate text-secondary" href={`/api/admin/pm/projects/${savedId}/requirements/${item.id}`}>{item.original_filename || item.label}</a>}
                <button type="button" className="text-slate-500" onClick={() => removeSaved(item.id)}>Remove</button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <Field label="Notes"><textarea className={inputClass} rows={3} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Manager confirms onboarding or delivery override</label>
        {override ? <Field label="Justification"><input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field> : null}
        <div className="flex justify-end gap-2">
          <AdminButton onClick={() => router.push('/admin/pm/projects')}>Cancel</AdminButton>
          <AdminButton variant="primary" onClick={save}>{projectId || savedId ? 'Save Project' : 'Create Project'}</AdminButton>
        </div>
      </section>

      <WhatsAppModal
        open={waOpen}
        title="Send project timeline"
        clientName={String(wa.client_name || '')}
        whatsapp={wa.whatsapp_number || null}
        message={String(wa.message || '')}
        onMessage={(value) => setWa((current) => ({ ...current, message: value }))}
        onClose={() => router.push(`/admin/pm/projects/${savedId}`)}
        onSend={sendWelcome}
        sending={sending}
        error={error}
        warning={wa.delivery?.warning}
      />
    </div>
  );
}
