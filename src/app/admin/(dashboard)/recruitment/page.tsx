'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import { ROLE_STATUS_LABELS } from '@/lib/recruitment/config';

type DashboardRow = {
  id: string;
  title: string;
  department: string;
  status: string;
  candidates_total: number;
  shortlisted: number;
  interviews: number;
  selected: number;
};

export default function RecruitmentDashboardPage() {
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/recruitment/dashboard')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body)) {
          throw new Error(body?.error || 'Failed to load dashboard. Apply the recruitment migrations in Supabase first.');
        }
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Recruitment"
        description="AI candidate screening and role fit assessment for Techantum hiring."
        action={
          <Link href="/admin/recruitment/roles/new">
            <AdminButton variant="primary">+ Create job role</AdminButton>
          </Link>
        }
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <AdminSection title="Job roles overview">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Role</OpsTh>
                <OpsTh>Department</OpsTh>
                <OpsTh>Candidates</OpsTh>
                <OpsTh>Shortlisted</OpsTh>
                <OpsTh>Interviews</OpsTh>
                <OpsTh>Selected</OpsTh>
                <OpsTh>Status</OpsTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <OpsTd>
                    <Link className="text-indigo-600 font-medium hover:underline" href={`/admin/recruitment/roles/${row.id}/candidates`}>
                      {row.title}
                    </Link>
                  </OpsTd>
                  <OpsTd>{row.department}</OpsTd>
                  <OpsTd>{row.candidates_total}</OpsTd>
                  <OpsTd>{row.shortlisted}</OpsTd>
                  <OpsTd>{row.interviews}</OpsTd>
                  <OpsTd>{row.selected}</OpsTd>
                  <OpsTd><AdminBadge>{ROLE_STATUS_LABELS[row.status] || row.status}</AdminBadge></OpsTd>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No job roles yet.</p>}
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}
