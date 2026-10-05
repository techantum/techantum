'use client';

import Link from 'next/link';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import { OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import { CANDIDATE_STATUS_LABELS, candidateStatusBadgeVariant } from '@/lib/recruitment/config';
import type { RecruitmentCandidate } from '@/lib/recruitment/types';

export type CandidateListRow = RecruitmentCandidate & {
  recruitment_job_roles?: { id?: string; title?: string; department?: string } | null;
};

export default function CandidatesTable({
  rows,
  showRole = false,
  compareIds,
  onToggleCompare,
  deletingId,
  onDelete,
  emptyLabel = 'No candidates in this status.',
}: {
  rows: CandidateListRow[];
  showRole?: boolean;
  compareIds?: string[];
  onToggleCompare?: (id: string) => void;
  deletingId?: string | null;
  onDelete?: (row: CandidateListRow) => void;
  emptyLabel?: string;
}) {
  const colCount = 6 + (showRole ? 1 : 0) + (onToggleCompare ? 1 : 0) + (onDelete ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {onToggleCompare && <OpsTh>Compare</OpsTh>}
            <OpsTh>Name</OpsTh>
            {showRole && <OpsTh>Role</OpsTh>}
            <OpsTh>Fit %</OpsTh>
            <OpsTh>Recommendation</OpsTh>
            <OpsTh>Status</OpsTh>
            <OpsTh>Applied</OpsTh>
            {onDelete && <OpsTh>Actions</OpsTh>}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="py-10 px-3 text-sm text-muted-foreground text-center">
                {emptyLabel}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-indigo-50/40">
              {onToggleCompare && (
                <OpsTd>
                  <input
                    type="checkbox"
                    checked={compareIds?.includes(row.id)}
                    onChange={() => onToggleCompare(row.id)}
                  />
                </OpsTd>
              )}
              <OpsTd>
                <Link href={`/admin/recruitment/candidates/${row.id}`} className="text-indigo-600 font-medium hover:underline">
                  {row.name || row.resume_file_name || 'Candidate'}
                </Link>
                {(row.email || row.current_company) && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {[row.email, row.current_company].filter(Boolean).join(' · ')}
                  </p>
                )}
              </OpsTd>
              {showRole && <OpsTd>{row.recruitment_job_roles?.title || '—'}</OpsTd>}
              <OpsTd>{row.overall_fit_percent != null ? `${row.overall_fit_percent}%` : '—'}</OpsTd>
              <OpsTd className="max-w-[220px] truncate">{row.ai_recommendation || '—'}</OpsTd>
              <OpsTd>
                <AdminBadge variant={candidateStatusBadgeVariant(row.status)}>
                  {CANDIDATE_STATUS_LABELS[row.status] || row.status}
                </AdminBadge>
              </OpsTd>
              <OpsTd>{row.application_date}</OpsTd>
              {onDelete && (
                <OpsTd>
                  <AdminButton size="sm" variant="danger" disabled={deletingId === row.id} onClick={() => onDelete(row)}>
                    {deletingId === row.id ? 'Deleting…' : 'Delete'}
                  </AdminButton>
                </OpsTd>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
