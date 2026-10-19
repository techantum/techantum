'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { PmBadge, PmShell, Td, Th } from '@/components/admin/pm/ui';

const KEYS = ['proposal_sent', 'proposal_accepted', 'scope_signed', 'contract_signed', 'advance_received', 'client_inputs', 'accounts_access', 'team_allocated', 'environment_ready', 'repository_created', 'communication_channel', 'kickoff_completed'];

export default function OnboardingPage() {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/admin/pm/onboarding').then((r) => r.json()).then((body) => setRows(body.rows || [])); }, []);

  const save = async (row: Record<string, any>) => {
    const res = await fetch(`/api/admin/pm/onboarding/${row.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) });
    const body = await res.json();
    if (!res.ok) setError(body.error || 'Could not save');
    else setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...body, id: row.id } : item));
  };

  return (
    <PmShell>
      <AdminPageHeader title="Onboarding" description="Planned projects only. Readiness is Yes divided by the checks that are not N/A. Moving a project to Ongoing warns when this is incomplete." />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="space-y-4">
        {rows.map((row) => (
          <section key={row.id} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between"><div><p className="font-medium">{row.project_code} {row.project_name}</p><p className="text-sm text-slate-500">{row.client_name}</p></div><PmBadge value={row.readiness?.status} /></div>
            <div className="grid gap-2 md:grid-cols-4">
              {KEYS.map((key) => (
                <label key={key} className="text-xs text-slate-500">{key.replaceAll('_', ' ')}
                  <select className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm" value={row[key] || 'not_filled'} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, [key]: e.target.value } : item))}>
                    <option value="not_filled">Pending</option><option value="pending">Pending</option><option value="yes">Yes</option><option value="no">No</option><option value="na">N/A</option>
                  </select>
                </label>
              ))}
              <label className="text-xs text-slate-500">Kickoff<input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-sm" value={row.kickoff_date || ''} onChange={(e) => setRows((current) => current.map((item) => item.id === row.id ? { ...item, kickoff_date: e.target.value } : item))} /></label>
            </div>
            <div className="mt-3 flex items-center justify-between"><p className="text-sm text-slate-500">{row.readiness?.percent ?? 0}% ready</p><AdminButton onClick={() => save(row)}>Save</AdminButton></div>
          </section>
        ))}
        {!rows.length ? <p className="text-sm text-slate-500">No projects are planned to onboard.</p> : null}
      </div>
    </PmShell>
  );
}
