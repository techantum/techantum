'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { PmBadge, PmShell, Stat } from '@/components/admin/pm/ui';

export default function ProcessDashboardPage() {
  const [projects, setProjects] = useState<Record<string, string>[]>([]);
  const [projectId, setProjectId] = useState('');
  const [data, setData] = useState<Record<string, any> | null>(null);

  useEffect(() => { fetch('/api/admin/pm/lookups').then((r) => r.json()).then((body) => setProjects(body.projects || [])); }, []);
  useEffect(() => {
    fetch(`/api/admin/pm/process-dashboard${projectId ? `?projectId=${projectId}` : ''}`).then((r) => r.json()).then(setData);
  }, [projectId]);

  const counts = data?.counts || {};
  return (
    <PmShell>
      <AdminPageHeader title="Process & ISMS" description="Operational and security health for periodic review." />
      <select className="w-full max-w-md rounded-xl border border-slate-200 px-3 py-2 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
        <option value="">All Projects</option>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.project_code} {project.project_name}</option>)}
      </select>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Assigned Assets" value={counts.assignedAssets ?? '—'} />
        <Stat label="Active Access" value={counts.activeAccess ?? '—'} />
        <Stat label="Active Servers" value={counts.activeServers ?? '—'} />
        <Stat label="Open Incidents" value={counts.openIncidents ?? '—'} />
        <Stat label="Open Vulnerabilities" value={counts.openVulnerabilities ?? '—'} />
        <Stat label="Open Risks" value={counts.openRisks ?? '—'} />
        <Stat label="Pending Actions" value={counts.pendingActions ?? '—'} />
        <Stat label="Training Records" value={counts.training ?? '—'} />
        <Stat label="Backup Issues" value={counts.backupIssues ?? '—'} />
        <Stat label="Access Reviews Due" value={counts.accessReviewsDue ?? '—'} />
        <Stat label="Control Checks Due" value={counts.controlChecksDue ?? '—'} />
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Monthly Review</h2>
        <div className="grid gap-2 md:grid-cols-2">{(data?.monthly || []).map((item: { label: string; status: string }) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span>{item.label}</span><PmBadge value={item.status} /></div>)}</div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Alerts</h2>
        <ul className="space-y-2 text-sm">{(data?.alerts || []).map((alert: { kind: string; detail: string }) => <li key={alert.kind}><span className="font-medium">{alert.kind}</span> — {alert.detail}</li>)}{!data?.alerts?.length ? <li className="text-slate-500">No process alerts.</li> : null}</ul>
      </section>
    </PmShell>
  );
}
