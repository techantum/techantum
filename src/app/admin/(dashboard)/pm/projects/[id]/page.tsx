'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { WhatsAppModal } from '@/components/admin/ops/OpsShared';
import { Panel, PmBadge, PmShell, Stat, Td, Th } from '@/components/admin/pm/ui';

function Line({ label, value }: { label: string; value?: string | number | null }) {
  return <div><p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p><p className="text-sm text-slate-800">{value || '—'}</p></div>;
}

export default function ProjectViewPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [waOpen, setWaOpen] = useState(false);
  const [wa, setWa] = useState<Record<string, any>>({});
  const [sending, setSending] = useState(false);
  const [waError, setWaError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/pm/projects/${id}`).then((r) => r.json()).then(setData);
  }, [id]);

  const openUpdate = async () => {
    const res = await fetch(`/api/admin/pm/projects/${id}/whatsapp/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'update' }),
    });
    const body = await res.json();
    if (!res.ok) { setWaError(body.error || 'Could not prepare the update'); return; }
    setWa(body);
    setWaOpen(true);
  };

  const sendUpdate = async () => {
    setSending(true);
    const res = await fetch(`/api/admin/pm/projects/${id}/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'update', message: wa.message }),
    });
    const body = await res.json();
    setSending(false);
    if (!res.ok) { setWaError(body.error || 'WhatsApp was not sent'); return; }
    setWaOpen(false);
  };

  const project = data?.project;
  const latest = project?.latest_update || {};
  const snap = data?.snapshot || {};
  if (!project) return <p className="text-sm text-slate-500">Loading project…</p>;

  return (
    <PmShell>
      <AdminPageHeader title={`${project.project_code} · ${project.project_name}`} description={project.client_name} action={<span className="flex gap-3"><button className="text-sm text-secondary" onClick={openUpdate}>Send client update</button><Link className="text-sm text-secondary" href={`/admin/pm/projects/${id}/edit`}>Edit</Link></span>} />
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6">
        <Line label="Type" value={project.type_name} /><Line label="Category" value={String(project.category || '').replaceAll('_', ' ')} />
        <Line label="Priority" value={project.priority} /><Line label="Phase" value={project.phase_name} />
        <Line label="Health" value={project.health} /><Line label="RAG" value={project.latest_rag} />
      </section>
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
        <Line label="Account Manager" value={project.account_manager_name} /><Line label="Sr Engineer" value={project.sr_engineer_name} />
        <Line label="Lead Developer" value={project.lead_developer_name} /><Line label="Junior 1" value={project.junior_1_name} /><Line label="Junior 2" value={project.junior_2_name} />
      </section>
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
        <Line label="Start" value={project.start_date} /><Line label="Planned End" value={project.planned_end_date} />
        <Line label="Revised End" value={project.revised_end_date} /><Line label="Effective End" value={project.effective_end} />
        <Line label="Days to Deadline" value={project.days_to_deadline} />
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Completion" value={project.completion_percent ?? '—'} />
        <Stat label="Planned Hours" value={project.planned_hours} />
        <Stat label="Actual Hours" value={project.actual_hours} />
        <Stat label="Hours Used" value={project.hours_used_percent == null ? '—' : `${project.hours_used_percent}%`} />
        <Stat label="Variance" value={project.hours_variance} />
      </div>
      <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-2">
        <Line label="Last Update" value={project.last_update} /><Line label="Work Completed" value={latest.work_done} />
        <Line label="Today's Plan" value={latest.plan_today} /><Line label="Blockers" value={latest.blockers} />
        <Line label="Dependencies" value={latest.client_dependency} /><Line label="Next Action" value={latest.next_action} />
        <Line label="Action Owner" value={latest.action_owner_name} />
      </section>
      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <Line label="Sign-off" value={project.signoff_date} /><Line label="Support Days" value={project.support_days} />
        <Line label="Support End" value={project.support_end} /><Line label="Support Status" value={project.support_status} />
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Active Access" value={snap.activeAccess ?? 0} />
        <Stat label="Production Servers" value={snap.productionServers ?? 0} />
        <Stat label="Open Incidents" value={snap.openIncidents ?? 0} />
        <Stat label="High Vulnerabilities" value={snap.openHighVulnerabilities ?? 0} />
        <Stat label="Open Risks" value={snap.openRisks ?? 0} />
        <Stat label="Pending Changes" value={snap.pendingChanges ?? 0} />
        <Stat label="Corrective Actions" value={snap.openActions ?? 0} />
        <Stat label="Backups" value={(snap.backups || []).length} />
      </div>
      <Panel title="Team" action={<Link className="text-sm text-secondary" href="/admin/pm/team">Allocate</Link>}>
        <table className="min-w-full"><thead><tr><Th>Employee</Th><Th>Department</Th><Th>Role</Th><Th>%</Th><Th>Status</Th></tr></thead>
          <tbody>{(data?.team || []).map((row: Record<string, string>) => <tr key={row.id}><Td>{row.full_name} {row.employee_status !== 'active' ? <PmBadge value="inactive" /> : null}</Td><Td>{row.department}</Td><Td>{row.role_name}</Td><Td>{row.allocation_percent}</Td><Td><PmBadge value={row.status} /></Td></tr>)}</tbody>
        </table>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Requirements" value={data?.requirementSummary?.total ?? 0} />
        <Stat label="In development" value={data?.requirementSummary?.inDevelopment ?? 0} />
        <Stat label="Open tickets" value={(data?.ticketSummary?.open || 0) + (data?.ticketSummary?.inProgress || 0)} />
        <Stat label="Blocked / waiting" value={data?.ticketSummary?.blocked ?? 0} />
      </div>
      <Panel title="Project Requirements">
        <ul className="space-y-1 text-sm">
          {(data?.files || []).map((row: Record<string, string>) => (
            <li key={row.id}>
              {row.kind === 'url'
                ? <a className="text-secondary" href={row.external_url} target="_blank" rel="noreferrer">{row.external_url}</a>
                : <a className="text-secondary" href={`/api/admin/pm/projects/${id}/requirements/${row.id}`}>{row.original_filename || row.label}</a>}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Requirements" action={<Link className="text-sm text-secondary" href="/admin/pm/requirements">All requirements</Link>}>
        <table className="min-w-full"><thead><tr><Th>Code</Th><Th>Title</Th><Th>Module</Th><Th>Priority</Th><Th>Status</Th></tr></thead>
          <tbody>{(data?.requirements || []).map((row: Record<string, string>) => <tr key={row.id}><Td>{row.requirement_code}</Td><Td>{row.title}</Td><Td>{row.module_name}</Td><Td><PmBadge value={row.priority} /></Td><Td><PmBadge value={row.status} /></Td></tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Tickets" action={<Link className="text-sm text-secondary" href="/admin/pm/tickets">All tickets</Link>}>
        <table className="min-w-full"><thead><tr><Th>Ticket</Th><Th>Type</Th><Th>Priority</Th><Th>Due</Th><Th>Status</Th></tr></thead>
          <tbody>{(data?.tickets || []).map((row: Record<string, string>) => <tr key={row.id}><Td>{row.ticket_code} {row.title}</Td><Td>{row.ticket_type}</Td><Td><PmBadge value={row.priority} /></Td><Td>{row.due_date}</Td><Td><PmBadge value={row.status} /></Td></tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Activity">
        <table className="min-w-full"><thead><tr><Th>When</Th><Th>Action</Th><Th>Record</Th></tr></thead>
          <tbody>{(data?.activity || []).map((row: Record<string, string>) => <tr key={row.id}><Td>{String(row.created_at || '').slice(0, 16).replace('T', ' ')}</Td><Td>{row.action}</Td><Td>{row.entity_type}</Td></tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Changes">
        <table className="min-w-full"><thead><tr><Th>Change</Th><Th>Environment</Th><Th>Status</Th><Th>Implementation</Th></tr></thead>
          <tbody>{(data?.changes || []).map((row: Record<string, string>) => <tr key={row.id}><Td>{row.code}</Td><Td>{row.environment}</Td><Td><PmBadge value={row.status} /></Td><Td>{row.implementation_date}</Td></tr>)}</tbody>
        </table>
      </Panel>
      <Panel title="Open Risks">
        <table className="min-w-full"><thead><tr><Th>Risk</Th><Th>Threat</Th><Th>Status</Th></tr></thead>
          <tbody>{(data?.risks || []).map((row: Record<string, string>) => <tr key={row.id}><Td>{row.code}</Td><Td>{row.threat}</Td><Td><PmBadge value={row.status} /></Td></tr>)}</tbody>
        </table>
      </Panel>
      {waError ? <p className="text-sm text-rose-700">{waError}</p> : null}
      <WhatsAppModal open={waOpen} title="Send client update" clientName={String(wa.client_name || '')} whatsapp={wa.whatsapp_number || null} message={String(wa.message || '')} onMessage={(value) => setWa((current) => ({ ...current, message: value }))} onClose={() => setWaOpen(false)} onSend={sendUpdate} sending={sending} error={waError} warning={wa.delivery?.warning} />
    </PmShell>
  );
}
