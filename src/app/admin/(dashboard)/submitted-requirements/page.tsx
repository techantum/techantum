'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { REQUIREMENT_STATUS_LABELS } from '@/lib/client-requirements/types';

interface Row {
  id: string;
  status: string;
  completion_percent: number;
  submitted_at: string | null;
  updated_at: string;
  projects: {
    project_name: string;
    company_name: string;
    client_name: string;
    email: string;
    project_type: string;
    package_name: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  reviewed: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  need_clarification: 'bg-rose-100 text-rose-800',
};

export default function SubmittedRequirementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    setLoading(true);
    fetch(`/api/admin/requirements?${params}`)
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRows(data))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 max-w-6xl">
      <AdminPageHeader title="Submitted Requirements" description="Review client submissions, request clarification, and export requirement packs." />
      <AdminSection title="Review Queue" description={`${rows.length} requirement(s)`}>
        <div className="flex flex-wrap gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, project, client..." className="w-72 max-w-full rounded-lg border border-border px-3 py-2 text-sm" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {Object.entries(REQUIREMENT_STATUS_LABELS).filter(([key]) => key !== 'draft').map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Project</th>
                  <th className="pb-3 pr-4 font-medium">Client</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Progress</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-3 pr-4"><p className="font-medium">{row.projects.project_name}</p><p className="text-xs text-muted-foreground">{row.projects.project_type}</p></td>
                    <td className="py-3 pr-4"><p>{row.projects.company_name}</p><p className="text-xs text-muted-foreground">{row.projects.email}</p></td>
                    <td className="py-3 pr-4"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status] ?? 'bg-slate-100 text-slate-700'}`}>{REQUIREMENT_STATUS_LABELS[row.status as keyof typeof REQUIREMENT_STATUS_LABELS] ?? row.status}</span></td>
                    <td className="py-3 pr-4">{row.completion_percent}%</td>
                    <td className="py-3"><Link href={`/admin/submitted-requirements/${row.id}`} className="text-xs text-primary hover:underline">Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No submitted requirements yet.</p>}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
