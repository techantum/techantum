'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminTabs from '@/components/admin/AdminTabs';
import CandidatesTable, { type CandidateListRow } from '@/components/admin/recruitment/CandidatesTable';
import { OpsPageShell } from '@/components/admin/ops/OpsUi';
import { CANDIDATE_PIPELINE_TABS, candidateMatchesTab } from '@/lib/recruitment/config';
import type { RecruitmentJobRole } from '@/lib/recruitment/types';

export default function RecruitmentRolesPage() {
  const [roles, setRoles] = useState<RecruitmentJobRole[]>([]);
  const [candidates, setCandidates] = useState<CandidateListRow[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusTab, setStatusTab] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/recruitment/roles').then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body)) throw new Error(body?.error || 'Failed to load roles.');
        return body as RecruitmentJobRole[];
      }),
      fetch('/api/admin/recruitment/candidates').then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body)) throw new Error(body?.error || 'Failed to load candidates.');
        return body as CandidateListRow[];
      }),
    ])
      .then(([roleRows, candidateRows]) => {
        setRoles(roleRows);
        setCandidates(candidateRows);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const roleCandidates = useMemo(
    () => (roleFilter === 'all' ? candidates : candidates.filter((row) => row.job_role_id === roleFilter)),
    [candidates, roleFilter],
  );

  const tabs = CANDIDATE_PIPELINE_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: tab.id === 'all' ? roleCandidates.length : roleCandidates.filter((row) => candidateMatchesTab(row.status, tab.id)).length,
  }));

  const visible = roleCandidates.filter((row) => candidateMatchesTab(row.status, statusTab));
  const selectedRole = roles.find((role) => role.id === roleFilter);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="Job roles"
        description="Review candidates by status, or jump into a role to upload resumes."
        action={
          <div className="flex flex-wrap gap-2">
            {selectedRole && (
              <Link href={`/admin/recruitment/roles/${selectedRole.id}`}>
                <AdminButton>Edit role</AdminButton>
              </Link>
            )}
            <Link href="/admin/recruitment/roles/new">
              <AdminButton variant="primary">+ Create role</AdminButton>
            </Link>
          </div>
        }
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
            roleFilter === 'all'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
          }`}
        >
          All roles
          <span className="ml-2 text-xs opacity-80">{candidates.length}</span>
        </button>
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => setRoleFilter(role.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold border transition-colors ${
              roleFilter === role.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
            }`}
          >
            {role.title}
          </button>
        ))}
      </div>

      <AdminTabs tabs={tabs} active={statusTab} onChange={setStatusTab} />

      <div className="rounded-3xl border border-white/80 bg-white/90 shadow-lg shadow-slate-900/5 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              {tabs.find((tab) => tab.id === statusTab)?.label || 'Candidates'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {visible.length} candidate{visible.length === 1 ? '' : 's'}
              {selectedRole ? ` in ${selectedRole.title}` : ''}
            </p>
          </div>
          {selectedRole && (
            <Link href={`/admin/recruitment/roles/${selectedRole.id}/candidates`} className="text-sm font-semibold text-indigo-600 hover:underline">
              Open role workspace →
            </Link>
          )}
        </div>
        <CandidatesTable rows={visible} showRole={roleFilter === 'all'} emptyLabel="No candidates in this status." />
      </div>
    </OpsPageShell>
  );
}
