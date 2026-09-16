'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';

type CompareRow = {
  id: string;
  name: string | null;
  overall_fit_percent: number | null;
  final_score: number | null;
  total_experience: string | null;
  relevant_experience: string | null;
  status: string;
  recruitment_job_roles?: { title: string };
};

function RecruitmentCompareInner() {
  const params = useSearchParams();
  const ids = params?.get('ids') || '';
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ids) return;
    fetch(`/api/admin/recruitment/candidates/compare?ids=${encodeURIComponent(ids)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body)) throw new Error(body?.error || 'Failed to load comparison');
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load comparison'));
  }, [ids]);

  return (
    <OpsPageShell>
      <AdminPageHeader title="Compare candidates" description="Side-by-side fit comparison (phase 2)." />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <AdminSection title={`${rows.length} candidates`}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Name</OpsTh>
                <OpsTh>Role</OpsTh>
                <OpsTh>AI fit %</OpsTh>
                <OpsTh>Final score</OpsTh>
                <OpsTh>Experience</OpsTh>
                <OpsTh>Relevant</OpsTh>
                <OpsTh>Status</OpsTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <OpsTd>{row.name || '—'}</OpsTd>
                  <OpsTd>{row.recruitment_job_roles?.title || '—'}</OpsTd>
                  <OpsTd>{row.overall_fit_percent ?? '—'}</OpsTd>
                  <OpsTd>{row.final_score ?? '—'}</OpsTd>
                  <OpsTd>{row.total_experience || '—'}</OpsTd>
                  <OpsTd>{row.relevant_experience || '—'}</OpsTd>
                  <OpsTd>{row.status}</OpsTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}

export default function RecruitmentComparePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground p-4">Loading comparison…</p>}>
      <RecruitmentCompareInner />
    </Suspense>
  );
}
