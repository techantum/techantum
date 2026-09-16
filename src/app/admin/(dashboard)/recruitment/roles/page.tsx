'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import { ROLE_STATUS_LABELS } from '@/lib/recruitment/config';
import type { RecruitmentJobRole } from '@/lib/recruitment/types';

export default function RecruitmentRolesPage() {
  const [rows, setRows] = useState<RecruitmentJobRole[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/recruitment/roles')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body)) {
          throw new Error(body?.error || 'Failed to load roles. Apply the recruitment migrations in Supabase first.');
        }
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load roles'));
  }, []);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Job roles"
        description="Define role requirements and assessment templates."
        action={<Link href="/admin/recruitment/roles/new"><AdminButton variant="primary">+ Create role</AdminButton></Link>}
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <AdminSection title={`${rows.length} role(s)`}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Title</OpsTh>
                <OpsTh>Code</OpsTh>
                <OpsTh>Department</OpsTh>
                <OpsTh>Min score</OpsTh>
                <OpsTh>Status</OpsTh>
                <OpsTh>Actions</OpsTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <OpsTd className="font-medium">{row.title}</OpsTd>
                  <OpsTd className="font-mono text-xs">{row.role_code || '—'}</OpsTd>
                  <OpsTd>{row.department}</OpsTd>
                  <OpsTd>{row.minimum_screening_score}%</OpsTd>
                  <OpsTd><AdminBadge>{ROLE_STATUS_LABELS[row.status]}</AdminBadge></OpsTd>
                  <OpsTd>
                    <Link className="text-indigo-600 text-xs hover:underline mr-2" href={`/admin/recruitment/roles/${row.id}`}>Edit</Link>
                    <Link className="text-indigo-600 text-xs hover:underline" href={`/admin/recruitment/roles/${row.id}/candidates`}>Candidates</Link>
                  </OpsTd>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && !error && <p className="text-sm text-muted-foreground p-4 text-center">No job roles yet.</p>}
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}
