'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CandidateProfileView from '@/components/admin/recruitment/CandidateProfileView';
import type { AreaAssessmentResult, RecruitmentCandidate } from '@/lib/recruitment/types';

export default function CandidateAssessmentPage() {
  const id = String(useParams().id);
  const router = useRouter();
  const [candidate, setCandidate] = useState<RecruitmentCandidate | null>(null);
  const [areaResults, setAreaResults] = useState<AreaAssessmentResult[]>([]);
  const [history, setHistory] = useState<{ new_status: string; created_at: string; comments: string | null }[]>([]);
  const [hrComments, setHrComments] = useState('');
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

  const removeProfile = async () => {
    const label = candidate?.name || candidate?.resume_file_name || 'this candidate';
    if (!window.confirm(`Delete ${label}? The profile, AI assessment and resume file will be removed. This cannot be undone.`)) {
      return;
    }
    setWorking(true);
    setError('');
    const res = await fetch(`/api/admin/recruitment/candidates/${id}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    setWorking(false);
    if (!res.ok) return setError(body.error || 'Delete failed');
    router.push(`/admin/recruitment/roles/${candidate?.job_role_id}/candidates`);
  };

  if (!candidate) return <p className="text-sm text-muted-foreground p-4">{error || 'Loading…'}</p>;

  return (
    <CandidateProfileView
      candidate={candidate}
      areaResults={areaResults}
      history={history}
      hrComments={hrComments}
      onHrCommentsChange={setHrComments}
      working={working}
      message={message}
      error={error}
      onSaveComments={() => patch({ hr_comments: hrComments })}
      onStatus={(status, status_comment) => patch({ status, status_comment })}
      onReassess={reassess}
      onDelete={removeProfile}
      onSaveProfile={(payload) => patch(payload)}
    />
  );
}
