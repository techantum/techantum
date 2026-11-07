'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminStatCard from '@/components/admin/AdminStatCard';
import RolePipelineCard, { type RolePipelineStats } from '@/components/admin/recruitment/RolePipelineCard';
import { OpsPageShell } from '@/components/admin/ops/OpsUi';

export default function RecruitmentRolesPage() {
  const [rows, setRows] = useState<RolePipelineStats[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/recruitment/dashboard')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body)) {
          throw new Error(body?.error || 'Failed to load job roles. Apply the recruitment migrations in Supabase first.');
        }
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const totals = rows.reduce(
    (acc, row) => ({
      roles: acc.roles + 1,
      candidates: acc.candidates + row.candidates_total,
      shortlisted: acc.shortlisted + row.shortlisted,
      interviewed: acc.interviewed + (row.interviewed ?? row.interviews ?? 0),
      selected: acc.selected + row.selected,
    }),
    { roles: 0, candidates: 0, shortlisted: 0, interviewed: 0, selected: 0 }
  );

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Job roles"
        description="Create and manage hiring roles. Open a role to edit requirements or review its candidates."
        action={
          <Link href="/admin/recruitment/roles/new">
            <AdminButton variant="primary">+ Create Role</AdminButton>
          </Link>
        }
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <AdminStatCard label="Job roles" value={totals.roles} icon="BriefcaseIcon" />
        <AdminStatCard label="Candidates" value={totals.candidates} icon="UsersIcon" accent="blue" />
        <AdminStatCard label="Shortlisted" value={totals.shortlisted} icon="StarIcon" accent="violet" />
        <AdminStatCard label="Interviewed" value={totals.interviewed} icon="ChatBubbleLeftRightIcon" accent="amber" />
        <AdminStatCard label="Selected" value={totals.selected} icon="CheckBadgeIcon" accent="green" />
      </div>

      {rows.length === 0 && !error ? (
        <div className="rounded-3xl border border-dashed border-indigo-200 bg-white/70 px-6 py-12 text-center">
          <p className="font-semibold text-slate-800">No job roles yet</p>
          <p className="mt-1 text-sm text-slate-500">Create a role to start screening candidates.</p>
          <Link href="/admin/recruitment/roles/new" className="mt-4 inline-block">
            <AdminButton variant="primary">Create job role</AdminButton>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((row) => (
            <RolePipelineCard key={row.id} role={row} />
          ))}
        </div>
      )}
    </OpsPageShell>
  );
}
