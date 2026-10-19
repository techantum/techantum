'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { Field, inputClass, PmBadge, PmShell, Td, Th } from '@/components/admin/pm/ui';

export default function TeamPage() {
  const [summary, setSummary] = useState<Record<string, any>[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [capacity, setCapacity] = useState<Record<string, any>[]>([]);
  const [projects, setProjects] = useState<Record<string, any>[]>([]);
  const [employees, setEmployees] = useState<Record<string, any>[]>([]);
  const [roles, setRoles] = useState<Record<string, string>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ allocation_percent: '100' });
  const [error, setError] = useState('');
  const [view, setView] = useState<'projects' | 'people'>('projects');

  const load = () => {
    fetch('/api/admin/pm/team/allocations').then((r) => r.json()).then((body) => {
      setRows(body.rows || []);
      setSummary(body.summary || []);
    });
    fetch('/api/admin/pm/team/capacity').then((r) => r.json()).then((body) => setCapacity(body.rows || []));
  };

  useEffect(() => {
    load();
    fetch('/api/admin/pm/lookups').then((r) => r.json()).then((body) => {
      setProjects(body.projects || []);
      setEmployees(body.employees || []);
      setRoles(body.roles || []);
    });
  }, []);

  const activeEmployees = employees.filter((employee) => employee.status === 'active');
  const selected = projects.find((project) => project.id === form.project_id);

  const save = async () => {
    setError('');
    const res = await fetch('/api/admin/pm/team/allocations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json();
    if (!res.ok) { setError(body.error || 'Could not allocate'); return; }
    setForm({ ...form, employee_id: '', responsibility: '' });
    load();
  };

  const release = async (id: string) => {
    const res = await fetch('/api/admin/pm/team/allocations/release/' + id, { method: 'POST' });
    const body = await res.json();
    if (!res.ok) setError(body.error || 'Could not release');
    else load();
  };

  return (
    <PmShell>
      <AdminPageHeader title="Team Allocation" description="Assign HR employees to an existing project. Names stay on the employee record." />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Project">
          <select className={inputClass} value={form.project_id || ''} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} {project.project_name}</option>)}
          </select>
        </Field>
        <Field label="Account Manager">
          <select className={inputClass} value={form.account_manager_id || ''} onChange={(e) => setForm({ ...form, account_manager_id: e.target.value })}>
            <option value="">Keep current</option>
            {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
          </select>
        </Field>
        <Field label="Project Lead">
          <select className={inputClass} value={form.project_lead_id || ''} onChange={(e) => setForm({ ...form, project_lead_id: e.target.value })}>
            <option value="">Keep current</option>
            {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
          </select>
        </Field>
        <Field label="Employee">
          <select className={inputClass} value={form.employee_id || ''} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}>
            <option value="">Active HR employee</option>
            {activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.designation || employee.department || 'HR'}</option>)}
          </select>
        </Field>
        <Field label="Role in project">
          <select className={inputClass} value={form.role_id || ''} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
            <option value="">Select role</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
        <Field label="Allocation %"><input className={inputClass} value={form.allocation_percent || ''} onChange={(e) => setForm({ ...form, allocation_percent: e.target.value })} /></Field>
        <Field label="Start"><input type="date" className={inputClass} value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
        <Field label="End"><input type="date" className={inputClass} value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
        <div className="md:col-span-2 xl:col-span-3"><Field label="Responsibility"><input className={inputClass} value={form.responsibility || ''} onChange={(e) => setForm({ ...form, responsibility: e.target.value })} /></Field></div>
        <div className="flex items-end"><AdminButton variant="primary" onClick={save}>Allocate</AdminButton></div>
        {selected ? <p className="md:col-span-2 xl:col-span-4 text-sm text-slate-500">{selected.project_code} · {selected.client_name} · {selected.category?.replaceAll('_', ' ')}</p> : null}
      </section>
      <div className="flex gap-2">
        <button type="button" className={`rounded-full px-3 py-1 text-sm ${view === 'projects' ? 'bg-secondary text-white' : 'bg-white'}`} onClick={() => setView('projects')}>By project</button>
        <button type="button" className={`rounded-full px-3 py-1 text-sm ${view === 'people' ? 'bg-secondary text-white' : 'bg-white'}`} onClick={() => setView('people')}>By employee</button>
      </div>
      {view === 'projects' ? (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
          <table className="min-w-full">
            <thead><tr><Th>Project</Th><Th>Client</Th><Th>Lead</Th><Th>Team</Th><Th>Departments</Th><Th>Capacity</Th><Th></Th></tr></thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.id}>
                  <Td><Link className="text-secondary" href={`/admin/pm/projects/${row.id}`}>{row.project_code} {row.project_name}</Link></Td>
                  <Td>{row.client_name}</Td><Td>{row.project_lead_name}</Td><Td>{row.team_size}</Td><Td>{row.departments}</Td><Td>{row.allocated_capacity}%</Td>
                  <Td>{rows.filter((item) => item.project_id === row.id && item.status === 'active').map((item) => item.full_name).join(', ')}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
          <table className="min-w-full">
            <thead><tr><Th>Employee</Th><Th>Department</Th><Th>Designation</Th><Th>Projects</Th><Th>Total</Th><Th>Available</Th><Th>Status</Th></tr></thead>
            <tbody>
              {capacity.map((row) => (
                <tr key={row.id}>
                  <Td>{row.full_name} {row.employee_status !== 'active' ? <PmBadge value="inactive" /> : null}</Td>
                  <Td>{row.department}</Td><Td>{row.designation}</Td>
                  <Td>{(row.projects || []).map((project: { project_code: string; allocation_percent: number }) => `${project.project_code} ${project.allocation_percent}%`).join(', ')}</Td>
                  <Td className={row.overloaded ? 'text-rose-700 font-semibold' : ''}>{row.total_percent}%</Td>
                  <Td>{row.available_percent}%</Td>
                  <Td>{row.overloaded ? <PmBadge value="overallocated" /> : <PmBadge value="active" />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full">
          <thead><tr><Th>Project</Th><Th>Employee</Th><Th>Department</Th><Th>Role</Th><Th>%</Th><Th>Status</Th><Th></Th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.project_code}</Td>
                <Td>{row.full_name} {row.employee_status !== 'active' ? <PmBadge value="inactive" /> : null}</Td>
                <Td>{row.department}</Td><Td>{row.role_name}</Td><Td>{row.allocation_percent}</Td><Td><PmBadge value={row.status} /></Td>
                <Td>{row.status === 'active' ? <button className="text-rose-600" onClick={() => release(row.id)}>Release</button> : null}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PmShell>
  );
}
