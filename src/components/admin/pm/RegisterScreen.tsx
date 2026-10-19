'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Field, inputClass, PmBadge, Td, Th } from './ui';

type FieldDef = { key: string; label: string; type: string; options?: string[]; required?: boolean; list?: boolean };

export function RegisterList({ registerKey }: { registerKey: string }) {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const load = () => fetch(`/api/admin/pm/registers/${registerKey}?q=${encodeURIComponent(q)}&status=${status}`).then((r) => r.json()).then(setData);
  useEffect(() => { load(); }, [registerKey, status]);
  const fields: FieldDef[] = (data?.register?.fields || []).filter((field: FieldDef) => field.list);
  const names = new Map((data?.employees || []).map((employee: { id: string; full_name: string }) => [employee.id, employee.full_name]));
  const show = (row: Record<string, any>, field: FieldDef) => {
    if (field.type === 'emp') return names.get(row[field.key]) || '—';
    if (field.type === 'project') return row.project_code ? `${row.project_code}` : '—';
    if (field.type === 'bool') return row[field.key] ? 'Yes' : 'No';
    if (field.key === 'status' || field.key === 'current_status' || field.key === 'severity' || field.key === 'criticality') return <PmBadge value={row[field.key]} />;
    return row[field.key] || '—';
  };
  return (
    <div className="space-y-4">
      <AdminPageHeader title={data?.register?.title || 'Register'} description="Operational evidence. Calculated status is shown beside the stored record." action={<Link href={`/admin/pm/registers/${registerKey}/new`}><AdminButton variant="primary">Add</AdminButton></Link>} />
      <div className="flex gap-2">
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Status" value={status} onChange={(e) => setStatus(e.target.value)} />
        <a className="rounded-xl border border-slate-200 px-3 py-2 text-sm" href={`/api/admin/pm/reports/${registerKey}`}>Export</a>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full">
          <thead><tr><Th>ID</Th>{fields.map((field) => <Th key={field.key}>{field.label}</Th>)}<Th>Computed</Th><Th></Th></tr></thead>
          <tbody>
            {(data?.rows || []).map((row: Record<string, any>) => (
              <tr key={row.id}>
                <Td>{row.code || row.area}</Td>
                {fields.map((field) => <Td key={field.key}>{show(row, field)}</Td>)}
                <Td><PmBadge value={row.computed_status || row.due_status || row.risk_level || (row.overdue ? 'Overdue' : '')} /></Td>
                <Td><Link className="text-secondary" href={`/admin/pm/registers/${registerKey}/${row.id}`}>View</Link></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RegisterForm({ registerKey, recordId }: { registerKey: string; recordId?: string }) {
  const router = useRouter();
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [title, setTitle] = useState('Register');
  const [form, setForm] = useState<Record<string, any>>({});
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [projects, setProjects] = useState<Record<string, string>[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/pm/lookups').then((r) => r.json()).then((body) => { setEmployees(body.employees || []); setProjects(body.projects || []); });
    const url = recordId ? `/api/admin/pm/registers/${registerKey}/${recordId}` : `/api/admin/pm/registers/${registerKey}`;
    fetch(url).then((r) => r.json()).then((body) => {
      setFields(body.register?.fields || []);
      setTitle(body.register?.title || 'Register');
      if (body.row) setForm(body.row);
      setWarnings(body.warnings || []);
    });
  }, [registerKey, recordId]);

  const save = async () => {
    const res = await fetch(recordId ? `/api/admin/pm/registers/${registerKey}/${recordId}` : `/api/admin/pm/registers/${registerKey}`, {
      method: recordId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error || 'Could not save'); return; }
    router.push(`/admin/pm/registers/${registerKey}`);
  };

  const activeEmployees = employees.filter((employee) => employee.status === 'active' || Object.values(form).includes(employee.id));
  const project = projects.find((item) => item.id === form.project_id);

  return (
    <div className="space-y-4">
      <AdminPageHeader title={recordId ? title : `Add ${title}`} description="Client is taken from the selected project." />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {warnings.map((warning) => <p key={warning} className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p>)}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        {fields.map((field) => (
          <Field key={field.key} label={field.label}>
            {field.type === 'long' ? <textarea className={inputClass} rows={3} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} /> :
              field.type === 'bool' ? <select className={inputClass} value={String(Boolean(form[field.key]))} onChange={(e) => setForm({ ...form, [field.key]: e.target.value === 'true' })}><option value="false">No</option><option value="true">Yes</option></select> :
              field.type === 'emp' ? <select className={inputClass} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}><option value="">Select</option>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select> :
              field.type === 'project' ? <select className={inputClass} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}><option value="">None</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.project_code} {item.project_name}</option>)}</select> :
              field.options ? <select className={inputClass} value={form[field.key] || ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}><option value="">Select</option>{field.options.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select> :
              <input type={field.type === 'date' ? 'date' : field.type === 'num' ? 'number' : 'text'} className={inputClass} value={form[field.key] ?? ''} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} />}
          </Field>
        ))}
        {registerKey === 'training' ? <Field label="Employees"><select multiple className={`${inputClass} h-28`} value={form.employee_ids || []} onChange={(e) => setForm({ ...form, employee_ids: Array.from(e.target.selectedOptions).map((option) => option.value) })}>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></Field> : null}
        {project ? <Field label="Client"><input className={inputClass} readOnly value="" placeholder="Stored on the project" /></Field> : null}
      </div>
      {project ? <p className="text-sm text-slate-500">Linked client comes from {project.project_code}.</p> : null}
      <AdminButton variant="primary" onClick={save}>Save</AdminButton>
    </div>
  );
}
