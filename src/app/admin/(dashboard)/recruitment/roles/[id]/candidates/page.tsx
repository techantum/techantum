'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminTabs from '@/components/admin/AdminTabs';
import { adminInputClass } from '@/components/admin/AdminField';
import CandidatesTable, { type CandidateListRow } from '@/components/admin/recruitment/CandidatesTable';
import { OpsPageShell } from '@/components/admin/ops/OpsUi';
import { CANDIDATE_PIPELINE_TABS, candidateMatchesTab } from '@/lib/recruitment/config';
import type { RecruitmentJobRole } from '@/lib/recruitment/types';

export default function RoleCandidatesPage() {
  const roleId = String(useParams().id);
  const [role, setRole] = useState<RecruitmentJobRole | null>(null);
  const [rows, setRows] = useState<CandidateListRow[]>([]);
  const [statusTab, setStatusTab] = useState('all');
  const [source, setSource] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const removeCandidate = async (row: CandidateListRow) => {
    const label = row.name || row.resume_file_name || 'this candidate';
    if (!window.confirm(`Delete ${label}? The profile, AI assessment and resume file will be removed. This cannot be undone.`)) {
      return;
    }
    setDeletingId(row.id);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/recruitment/candidates/${row.id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setCompareIds((prev) => prev.filter((id) => id !== row.id));
      setMessage(`${label} deleted.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const tabs = CANDIDATE_PIPELINE_TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    count: tab.id === 'all' ? rows.length : rows.filter((row) => candidateMatchesTab(row.status, tab.id)).length,
  }));
  const visible = useMemo(() => rows.filter((row) => candidateMatchesTab(row.status, statusTab)), [rows, statusTab]);

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={role?.title || 'Candidates'}
        description="Upload resumes and review candidates by hiring status."
        action={
          <Link href={`/admin/recruitment/roles/${roleId}`} className="text-sm text-indigo-600 hover:underline">
            Edit role
          </Link>
        }
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection title="Upload candidate resume">
        <div className="flex flex-wrap gap-2 items-end">
          <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <input
            className={`${adminInputClass} max-w-xs`}
            placeholder="Source (LinkedIn, Referral…)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <AdminButton variant="primary" disabled={!file || uploading} onClick={upload}>
            {uploading ? 'Processing…' : 'Upload & assess'}
          </AdminButton>
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

      <AdminTabs tabs={tabs} active={statusTab} onChange={setStatusTab} />

      <AdminSection title={`${tabs.find((tab) => tab.id === statusTab)?.label || 'Candidates'} · ${visible.length}`}>
        <CandidatesTable
          rows={visible}
          compareIds={compareIds}
          onToggleCompare={toggleCompare}
          deletingId={deletingId}
          onDelete={removeCandidate}
          emptyLabel="No candidates in this status."
        />
      </AdminSection>
    </OpsPageShell>
  );
}
