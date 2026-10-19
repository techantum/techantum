'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { WhatsAppModal } from '@/components/admin/ops/OpsShared';
import { Field, inputClass, PmBadge, PmShell, Td, Th } from '@/components/admin/pm/ui';

export default function TicketsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [projects, setProjects] = useState<Record<string, string>[]>([]);
  const [employees, setEmployees] = useState<Record<string, any>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({ ticket_type: 'FEATURE' });
  const [error, setError] = useState('');
  const [waOpen, setWaOpen] = useState(false);
  const [wa, setWa] = useState<Record<string, any>>({});
  const [ticketId, setTicketId] = useState('');
  const [sending, setSending] = useState(false);

  const load = () => fetch('/api/admin/pm/tickets').then((r) => r.json()).then((body) => setRows(body.rows || []));
  useEffect(() => {
    load();
    fetch('/api/admin/pm/lookups').then((r) => r.json()).then((body) => { setProjects(body.projects || []); setEmployees(body.employees || []); });
  }, []);

  const save = async () => {
    setError('');
    const res = await fetch('/api/admin/pm/tickets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const body = await res.json();
    if (!res.ok) { setError(body.error || 'Could not create the ticket'); return; }
    const preview = await fetch(`/api/admin/pm/tickets/${body.id}/whatsapp/preview`, { method: 'POST' });
    const message = await preview.json();
    setTicketId(body.id);
    if (preview.ok && message.whatsapp_number) { setWa(message); setWaOpen(true); }
    else load();
  };

  const send = async () => {
    setSending(true);
    const res = await fetch(`/api/admin/pm/tickets/${ticketId}/whatsapp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: wa.message }) });
    const body = await res.json();
    setSending(false);
    if (!res.ok) { setError(body.error || 'WhatsApp was not sent'); return; }
    setWaOpen(false);
    load();
  };

  return (
    <PmShell>
      <AdminPageHeader title="Tickets" description="Use a ticket when a client asks for something new on a project that already exists. The client receives the timeline on WhatsApp." />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Existing project"><select className={inputClass} value={form.project_id || ''} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">Select</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} {project.project_name}</option>)}</select></Field>
        <Field label="Type"><select className={inputClass} value={form.ticket_type || 'issue'} onChange={(e) => setForm({ ...form, ticket_type: e.target.value })}><option value="bug">Bug</option><option value="change_request">Change request</option><option value="support">Support</option><option value="improvement">Improvement</option><option value="task">Task</option><option value="issue">Issue</option><option value="client_request">Client request</option><option value="BUG">Bug (legacy)</option><option value="FEATURE">Feature</option><option value="ENHANCEMENT">Enhancement</option></select></Field>
        <Field label="Priority"><select className={inputClass} value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
        <Field label="Assign to"><select className={inputClass} value={form.assigned_employee_id || ''} onChange={(e) => setForm({ ...form, assigned_employee_id: e.target.value })}><option value="">HR employee</option>{employees.filter((employee) => employee.status === 'active').map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}</select></Field>
        <Field label="Due"><input type="date" className={inputClass} value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
        <Field label="Title"><input className={inputClass} value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Start"><input type="date" className={inputClass} value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
        <Field label="Delivery date"><input type="date" className={inputClass} value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
        <div className="md:col-span-2 xl:col-span-3"><Field label="What the client asked"><textarea className={inputClass} rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
        <AdminButton variant="primary" onClick={save}>Create ticket</AdminButton>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full">          <thead><tr><Th>Ticket</Th><Th>Project</Th><Th>Client</Th><Th>Type</Th><Th>Priority</Th><Th>Assigned</Th><Th>Due</Th><Th>Status</Th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><Td>{row.ticket_code} {row.title}</Td><Td><Link className="text-secondary" href={`/admin/pm/projects/${row.project_id}`}>{row.project_code}</Link></Td><Td>{row.client_name}</Td><Td>{row.ticket_type}</Td><Td><PmBadge value={row.priority} /></Td><Td>{row.assigned_name} {row.assigned_status === 'inactive' ? <PmBadge value="inactive" /> : null}</Td><Td>{row.due_date || row.end_date}</Td><Td><PmBadge value={row.status} /></Td></tr>)}</tbody>
        </table>
      </div>
      <WhatsAppModal open={waOpen} title="Send ticket timeline" clientName={String(wa.client_name || '')} whatsapp={wa.whatsapp_number || null} message={String(wa.message || '')} onMessage={(value) => setWa((current) => ({ ...current, message: value }))} onClose={() => { setWaOpen(false); load(); }} onSend={send} sending={sending} error={error} warning={wa.delivery?.warning} />
    </PmShell>
  );
}
