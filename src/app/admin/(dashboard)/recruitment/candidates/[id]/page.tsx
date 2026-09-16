'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import { OpsGrid, OpsOverviewField, OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import { CANDIDATE_STATUS_LABELS, DECISION_STATUSES } from '@/lib/recruitment/config';
import type { AreaAssessmentResult, RecruitmentCandidate } from '@/lib/recruitment/types';

export default function CandidateAssessmentPage() {
  const id = String(useParams().id);
  const [candidate, setCandidate] = useState<RecruitmentCandidate | null>(null);
  const [areaResults, setAreaResults] = useState<AreaAssessmentResult[]>([]);
  const [history, setHistory] = useState<{ new_status: string; created_at: string; comments: string | null }[]>([]);
  const [hrComments, setHrComments] = useState('');
  const [manualScore, setManualScore] = useState('');
  const [finalScore, setFinalScore] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const load = () => {
    fetch(`/api/admin/recruitment/candidates/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        setCandidate(body.candidate);
        setAreaResults(body.areaResults || []);
        setHistory(body.history || []);
        setHrComments(body.candidate.hr_comments || '');
        setManualScore(body.candidate.manual_screening_score != null ? String(body.candidate.manual_screening_score) : '');
        setFinalScore(body.candidate.final_score != null ? String(body.candidate.final_score) : '');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, [id]);

  const patch = async (payload: Record<string, unknown>) => {
    setWorking(true);
    setError('');
    const res = await fetch(`/api/admin/recruitment/candidates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setWorking(false);
    if (!res.ok) return setError(body.error || 'Update failed');
    setMessage('Saved.');
    load();
  };

  const reassess = async () => {
    setWorking(true);
    setError('');
    const res = await fetch(`/api/admin/recruitment/candidates/${id}/assess`, { method: 'POST' });
    const body = await res.json();
    setWorking(false);
    if (!res.ok) return setError(body.error || 'Assessment failed');
    setMessage('AI assessment completed.');
    load();
  };

  if (!candidate) return <p className="text-sm text-muted-foreground p-4">{error || 'Loading…'}</p>;

  const role = candidate.recruitment_job_roles;

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={candidate.name || 'Candidate'}
        description={role?.title ? `${role.title} · ${role.department}` : 'Assessment detail'}
        action={
          <div className="flex flex-wrap gap-2">
            {role && (
              <Link href={`/admin/recruitment/roles/${candidate.job_role_id}/candidates`} className="text-sm text-muted-foreground hover:text-primary">
                ← Role candidates
              </Link>
            )}
            <AdminButton onClick={reassess} disabled={working}>Re-run AI</AdminButton>
          </div>
        }
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <OpsOverviewField label="Overall fit">
          <span className="text-2xl font-bold text-indigo-700">{candidate.overall_fit_percent != null ? `${candidate.overall_fit_percent}%` : '—'}</span>
        </OpsOverviewField>
        <OpsOverviewField label="Classification">{candidate.ai_classification || '—'}</OpsOverviewField>
        <OpsOverviewField label="Recommendation">{candidate.ai_recommendation || '—'}</OpsOverviewField>
        <OpsOverviewField label="Status"><AdminBadge>{CANDIDATE_STATUS_LABELS[candidate.status] || candidate.status}</AdminBadge></OpsOverviewField>
      </div>

      <OpsGrid>
        <AdminSection title="Candidate summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <OpsOverviewField label="Email">{candidate.email || '—'}</OpsOverviewField>
            <OpsOverviewField label="Phone">{candidate.phone || '—'}</OpsOverviewField>
            <OpsOverviewField label="Experience">{candidate.total_experience || '—'}</OpsOverviewField>
            <OpsOverviewField label="Relevant">{candidate.relevant_experience || '—'}</OpsOverviewField>
            <OpsOverviewField label="Company">{candidate.current_company || '—'}</OpsOverviewField>
            <OpsOverviewField label="Role">{candidate.current_job_title || '—'}</OpsOverviewField>
          </div>
          {candidate.fit_summary && <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed">{candidate.fit_summary}</p>}
        </AdminSection>

        <AdminSection title="HR review">
          <AdminField label="HR comments">
            <textarea className={adminTextareaClass} rows={4} value={hrComments} onChange={(e) => setHrComments(e.target.value)} />
          </AdminField>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <AdminField label="Screening score (manual)">
              <input className={adminInputClass} value={manualScore} onChange={(e) => setManualScore(e.target.value)} />
            </AdminField>
            <AdminField label="Final score">
              <input className={adminInputClass} value={finalScore} onChange={(e) => setFinalScore(e.target.value)} />
            </AdminField>
          </div>
          <AdminButton className="mt-2" disabled={working} onClick={() => patch({ hr_comments: hrComments, manual_screening_score: manualScore ? Number(manualScore) : null, final_score: finalScore ? Number(finalScore) : null })}>
            Save review
          </AdminButton>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {DECISION_STATUSES.map((status) => (
              <AdminButton key={status} size="sm" disabled={working} onClick={() => patch({ status, status_comment: `Marked ${status}` })}>
                {CANDIDATE_STATUS_LABELS[status]}
              </AdminButton>
            ))}
          </div>
          <AdminField label="Update status" className="mt-3">
            <select className={adminSelectClass} value={candidate.status} onChange={(e) => patch({ status: e.target.value, status_comment: 'Status updated' })}>
              {Object.entries(CANDIDATE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </AdminField>
        </AdminSection>
      </OpsGrid>

      <AdminSection title="Assessment breakdown">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Area</OpsTh>
                <OpsTh>Evidence</OpsTh>
                <OpsTh>Assessment</OpsTh>
                <OpsTh>Rating</OpsTh>
                <OpsTh>Weighted</OpsTh>
              </tr>
            </thead>
            <tbody>
              {areaResults.map((row) => (
                <tr key={row.assessment_area_id} className="align-top hover:bg-muted/20">
                  <OpsTd className="font-medium">{row.area_name}</OpsTd>
                  <OpsTd className="max-w-xs text-xs">{row.evidence}</OpsTd>
                  <OpsTd className="max-w-xs text-xs">{row.assessment}</OpsTd>
                  <OpsTd>{row.rating}/{row.rating_max}</OpsTd>
                  <OpsTd>{row.weighted_score}/{row.weightage}</OpsTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <OpsGrid>
        <AdminSection title="Strengths">
          <ul className="text-sm list-disc pl-5 space-y-1">{(candidate.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </AdminSection>
        <AdminSection title="Gaps / risks">
          <ul className="text-sm list-disc pl-5 space-y-1">{(candidate.gaps || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
        </AdminSection>
      </OpsGrid>

      <AdminSection title="Suggested screening questions">
        <ol className="text-sm list-decimal pl-5 space-y-1">{(candidate.screening_questions || []).map((q, i) => <li key={i}>{q}</li>)}</ol>
      </AdminSection>

      {candidate.resume_url && (
        <AdminSection title="Resume">
          <a href={candidate.resume_url} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm hover:underline">{candidate.resume_file_name || 'View resume'}</a>
        </AdminSection>
      )}

      {history.length > 0 && (
        <AdminSection title="Status history">
          <ul className="text-xs space-y-1 text-muted-foreground">
            {history.map((h, i) => (
              <li key={i}>{new Date(h.created_at).toLocaleString()} — {h.new_status}{h.comments ? ` · ${h.comments}` : ''}</li>
            ))}
          </ul>
        </AdminSection>
      )}
    </OpsPageShell>
  );
}
