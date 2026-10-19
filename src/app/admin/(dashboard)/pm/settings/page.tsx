'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { PmShell } from '@/components/admin/pm/ui';

export default function PmSettingsPage() {
  const [data, setData] = useState<Record<string, any[]>>({});
  const [typeName, setTypeName] = useState('');
  const [phaseName, setPhaseName] = useState('');
  const [kind, setKind] = useState('projects');
  const [raw, setRaw] = useState('[]');
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [audit, setAudit] = useState<Record<string, string>[]>([]);

  const load = () => {
    fetch('/api/admin/pm/settings').then((r) => r.json()).then(setData);
    fetch('/api/admin/pm/audit').then((r) => r.json()).then((body) => setAudit(body.rows || []));
  };
  useEffect(() => { load(); }, []);

  const add = async (path: string, name: string) => {
    await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    load();
  };

  const importRows = async () => {
    const rows = JSON.parse(raw);
    const res = await fetch('/api/admin/pm/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, rows }) });
    setReport(await res.json());
  };

  return (
    <PmShell>
      <AdminPageHeader title="Project Settings" description="Project types and phases. Categories stay as system workflow values." />
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Project Types</h2>
          <ul className="mb-3 space-y-1 text-sm">{(data.types || []).map((type) => <li key={type.id}>{type.name}</li>)}</ul>
          <div className="flex gap-2"><input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={typeName} onChange={(e) => setTypeName(e.target.value)} /><AdminButton onClick={() => add('/api/admin/pm/settings/types', typeName)}>Add</AdminButton></div>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold">Phases</h2>
          <ul className="mb-3 space-y-1 text-sm">{(data.phases || []).map((phase) => <li key={phase.id}>{phase.name}</li>)}</ul>
          <div className="flex gap-2"><input className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={phaseName} onChange={(e) => setPhaseName(e.target.value)} /><AdminButton onClick={() => add('/api/admin/pm/settings/phases', phaseName)}>Add</AdminButton></div>
        </section>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Import existing tracker rows</h2>
        <p className="mb-2 text-sm text-slate-500">Paste source rows as JSON. Calculated values such as health, hours used and risk level are ignored.</p>
        <select className="mb-2 rounded-xl border border-slate-200 px-3 py-2 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
          {['projects', 'daily', 'onboarding', 'assets', 'access', 'servers', 'suppliers', 'software', 'backups', 'incidents', 'vulnerabilities', 'training', 'joiner-leaver', 'changes', 'risks', 'actions', 'controls'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <textarea className="mb-2 h-40 w-full rounded-xl border border-slate-200 p-3 font-mono text-xs" value={raw} onChange={(e) => setRaw(e.target.value)} />
        <AdminButton variant="primary" onClick={importRows}>Import</AdminButton>
        {report ? <pre className="mt-3 overflow-auto text-xs">{JSON.stringify(report, null, 2)}</pre> : null}
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Recent audit</h2>
        <ul className="space-y-1 text-sm">{audit.map((row) => <li key={row.id}>{String(row.created_at).slice(0, 16)} · {row.action} · {row.entity_type}</li>)}</ul>
      </section>
    </PmShell>
  );
}
