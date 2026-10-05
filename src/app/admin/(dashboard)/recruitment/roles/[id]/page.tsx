'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import RoleForm from '@/components/admin/recruitment/RoleForm';
import type { RecruitmentAssessmentArea, RecruitmentJobRole } from '@/lib/recruitment/types';

export default function EditRecruitmentRolePage() {
  const id = String(useParams()?.id || '');
  const [role, setRole] = useState<RecruitmentJobRole | null>(null);
  const [areas, setAreas] = useState<RecruitmentAssessmentArea[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/recruitment/roles/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        setRole(body.role);
        setAreas(body.areas || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [id]);

  const submit = async (payload: Record<string, unknown>, areaRows: Record<string, unknown>[]) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`/api/admin/recruitment/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, areas: areaRows }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setRole(body);
      setMessage('Role saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!role) return <p className="p-4 text-sm text-slate-500">{error || 'Loading…'}</p>;

  return (
    <RoleForm
      mode="edit"
      initialRole={role}
      initialAreas={areas}
      onSubmit={submit}
      saving={saving}
      message={message}
      error={error}
      extraAction={
        <Link
          href={`/admin/recruitment/roles/${id}/candidates`}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          View candidates
        </Link>
      }
    />
  );
}
