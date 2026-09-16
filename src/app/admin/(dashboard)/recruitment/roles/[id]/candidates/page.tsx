'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminAlert from '@/components/admin/AdminAlert';
import { adminInputClass } from '@/components/admin/AdminField';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';
import { CANDIDATE_STATUS_LABELS } from '@/lib/recruitment/config';
import type { RecruitmentCandidate, RecruitmentJobRole } from '@/lib/recruitment/types';

export default function RoleCandidatesPage() {
  const roleId = String(useParams().id);
  const [role, setRole] = useState<RecruitmentJobRole | null>(null);
  const [rows, setRows] = useState<RecruitmentCandidate[]>([]);
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const load = () => {
    fetch(`/api/admin/recruitment/roles/${roleId}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !body?.role) throw new Error(body?.error || 'Role not found');
        setRole(body.role);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load role'));
    fetch(`/api/admin/recruitment/roles/${roleId}/candidates`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !Array.isArray(body)) throw new Error(body?.error || 'Failed to load candidates');
        setRows(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load candidates'));
  };

  useEffect(() => {
    load();
  }, [roleId]);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('job_role_id', roleId);
      body.append('resume', file);
      body.append('run_ai', 'true');
      if (source) body.append('source', source);
      const res = await fetch('/api/admin/recruitment/candidates', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMessage(`Candidate uploaded${data.candidate?.overall_fit_percent != null ? ` — AI fit ${data.candidate.overall_fit_percent}%` : ''}.`);
      setFile(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 5)));
  };

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={role?.title || 'Candidates'}
        description="Upload resumes and run AI role-fit assessment."
        action={<Link href={`/admin/recruitment/roles/${roleId}`} className="text-sm text-indigo-600 hover:underline">Edit role</Link>}
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="Upload candidate resume">
        <div className="flex flex-wrap gap-2 items-end">
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input className={`${adminInputClass} max-w-xs`} placeholder="Source (LinkedIn, Referral…)" value={source} onChange={(e) => setSource(e.target.value)} />
          <AdminButton variant="primary" disabled={!file || uploading} onClick={upload}>{uploading ? 'Processing…' : 'Upload & assess'}</AdminButton>
        </div>
        <p className="text-xs text-muted-foreground mt-2">PDF recommended. AI uses resume evidence only — no invented details.</p>
      </AdminSection>

      {compareIds.length >= 2 && (
        <AdminSection title="Compare selected">
          <Link className="text-sm text-indigo-600 hover:underline" href={`/admin/recruitment/compare?ids=${compareIds.join(',')}`}>
            Open comparison ({compareIds.length} candidates)
          </Link>
        </AdminSection>
      )}

      <AdminSection title={`${rows.length} candidate(s)`}>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Compare</OpsTh>
                <OpsTh>Name</OpsTh>
                <OpsTh>Fit %</OpsTh>
                <OpsTh>Recommendation</OpsTh>
                <OpsTh>Status</OpsTh>
                <OpsTh>Applied</OpsTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <OpsTd>
                    <input type="checkbox" checked={compareIds.includes(row.id)} onChange={() => toggleCompare(row.id)} />
                  </OpsTd>
                  <OpsTd>
                    <Link href={`/admin/recruitment/candidates/${row.id}`} className="text-indigo-600 font-medium hover:underline">
                      {row.name || row.resume_file_name || 'Candidate'}
                    </Link>
                  </OpsTd>
                  <OpsTd>{row.overall_fit_percent != null ? `${row.overall_fit_percent}%` : '—'}</OpsTd>
                  <OpsTd className="max-w-[200px] truncate">{row.ai_recommendation || '—'}</OpsTd>
                  <OpsTd><AdminBadge>{CANDIDATE_STATUS_LABELS[row.status] || row.status}</AdminBadge></OpsTd>
                  <OpsTd>{row.application_date}</OpsTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}
