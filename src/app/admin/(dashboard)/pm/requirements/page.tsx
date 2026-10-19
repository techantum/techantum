'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { Field, inputClass, PmBadge, PmShell, Td, Th } from '@/components/admin/pm/ui';

export default function RequirementLinksPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [scope, setScope] = useState<Record<string, any>[]>([]);
  const [projects, setProjects] = useState<Record<string, string>[]>([]);
  const [scopeForm, setScopeForm] = useState<Record<string, string>>({ category: 'functional', priority: 'must_have', source: 'client' });
  const [form, setForm] = useState<Record<string, string>>({});
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = () => {
    fetch('/api/admin/pm/requirements').then((r) => r.json()).then((body) => setRows(body.rows || []));
    fetch('/api/admin/pm/requirements/scope').then((r) => r.json()).then((body) => setScope(body.rows || []));
  };
  useEffect(() => {
    load();
    fetch('/api/admin/pm/lookups').then((r) => r.json()).then((body) => setProjects(body.projects || []));
  }, []);

  const addScope = async () => {
    setError('');
    const res = await fetch('/api/admin/pm/requirements/scope', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scopeForm) });
    const body = await res.json();
    if (!res.ok) { setError(body.error || 'Could not save the requirement'); return; }
    setScopeForm({ ...scopeForm, title: '', description: '', module_name: '' });
    load();
  };

  const create = async () => {
    setError('');
    const res = await fetch('/api/admin/pm/requirements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const body = await res.json();
    if (!res.ok) { setError(body.error || 'Could not create the link'); return; }
    setLink(body.share_url);
    load();
  };

  const useSubmission = async (id: string) => {
    setBusy(id);
    setError('');
    const res = await fetch(`/api/admin/pm/requirements/${id}/create-project`, { method: 'POST' });
    const body = await res.json();
    setBusy('');
    if (!res.ok) { setError(body.error || 'Could not create the project'); return; }
    router.push(`/admin/pm/projects/${body.id}`);
  };

  return (
    <PmShell>
      <AdminPageHeader title="Requirements" description="Scope items belong to an existing project. Client intake links stay below and are used only to collect a new project brief." />
      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Project"><select className={inputClass} value={scopeForm.project_id || ''} onChange={(e) => setScopeForm({ ...scopeForm, project_id: e.target.value })}><option value="">Select</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} {project.project_name}</option>)}</select></Field>
        <Field label="Module"><input className={inputClass} value={scopeForm.module_name || ''} onChange={(e) => setScopeForm({ ...scopeForm, module_name: e.target.value })} /></Field>
        <Field label="Category"><select className={inputClass} value={scopeForm.category} onChange={(e) => setScopeForm({ ...scopeForm, category: e.target.value })}><option value="business">Business</option><option value="functional">Functional</option><option value="non_functional">Non-functional</option><option value="technical">Technical</option><option value="integration">Integration</option><option value="ui_ux">UI/UX</option><option value="security">Security</option><option value="change">Change</option></select></Field>
        <Field label="Priority"><select className={inputClass} value={scopeForm.priority} onChange={(e) => setScopeForm({ ...scopeForm, priority: e.target.value })}><option value="must_have">Must have</option><option value="should_have">Should have</option><option value="could_have">Could have</option><option value="future">Future</option></select></Field>
        <div className="md:col-span-2"><Field label="Title"><input className={inputClass} value={scopeForm.title || ''} onChange={(e) => setScopeForm({ ...scopeForm, title: e.target.value })} /></Field></div>
        <div className="md:col-span-2"><Field label="Description"><textarea className={inputClass} rows={2} value={scopeForm.description || ''} onChange={(e) => setScopeForm({ ...scopeForm, description: e.target.value })} /></Field></div>
        <AdminButton variant="primary" onClick={addScope}>Add requirement</AdminButton>
      </section>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full"><thead><tr><Th>Requirement</Th><Th>Project</Th><Th>Module</Th><Th>Priority</Th><Th>Status</Th><Th>Owner</Th><Th>Approval</Th><Th>Tickets</Th></tr></thead>
          <tbody>{scope.map((row) => <tr key={row.id}><Td>{row.requirement_code} {row.title}</Td><Td>{row.project_code}</Td><Td>{row.module_name}</Td><Td><PmBadge value={row.priority} /></Td><Td><PmBadge value={row.status} /></Td><Td>{row.owner_name} {row.owner_status === 'inactive' ? <PmBadge value="inactive" /> : null}</Td><Td><PmBadge value={row.client_approval_status} /></Td><Td>{row.ticket_count}</Td></tr>)}</tbody>
        </table>
      </div>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {link ? <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3"><input readOnly className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" value={link} /><AdminButton onClick={() => navigator.clipboard.writeText(link)}>Copy link</AdminButton></div> : null}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Client name"><input className={inputClass} value={form.client_name || ''} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></Field>
        <Field label="Company"><input className={inputClass} value={form.company_name || ''} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></Field>
        <Field label="WhatsApp"><input className={inputClass} value={form.whatsapp_number || ''} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></Field>
        <Field label="Email"><input className={inputClass} value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Project name"><input className={inputClass} value={form.project_name || ''} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></Field>
        <Field label="Project type"><input className={inputClass} value={form.project_type || ''} onChange={(e) => setForm({ ...form, project_type: e.target.value })} placeholder="CMS Website" /></Field>
        <AdminButton variant="primary" onClick={create}>Create link</AdminButton>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full"><thead><tr><Th>Client</Th><Th>Project</Th><Th>Status</Th><Th>Submitted</Th><Th></Th></tr></thead>
          <tbody>{rows.map((row) => (
            <tr key={row.id}>
              <Td>{row.client_name || '—'}<div className="text-xs text-slate-400">{row.company_name}</div></Td>
              <Td>{row.project_name}</Td>
              <Td><PmBadge value={row.status} /></Td>
              <Td>{row.submitted_at ? String(row.submitted_at).slice(0, 10) : '—'}</Td>
              <Td>
                <button className="mr-3 text-secondary" onClick={() => navigator.clipboard.writeText(row.share_url)}>Copy</button>
                {row.status === 'submitted' ? <button className="text-secondary" disabled={busy === row.id} onClick={() => useSubmission(row.id)}>{busy === row.id ? 'Creating…' : 'Create project'}</button> : null}
                {row.pm_project_id ? <a className="text-secondary" href={`/admin/pm/projects/${row.pm_project_id}`}>Open project</a> : null}
              </Td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </PmShell>
  );
}
