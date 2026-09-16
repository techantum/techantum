'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import RoleForm from '@/components/admin/recruitment/RoleForm';
import { OpsPageShell } from '@/components/admin/ops/OpsUi';
import type { RecruitmentAssessmentArea, RecruitmentJobRole } from '@/lib/recruitment/types';

export default function EditRecruitmentRolePage() {
  const id = String(useParams().id);
  const [role, setRole] = useState<RecruitmentJobRole | null>(null);
  const [areas, setAreas] = useState<RecruitmentAssessmentArea[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
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

  if (!role) return <p className="text-sm text-muted-foreground p-4">{error || 'Loading…'}</p>;

  return (
    <OpsPageShell>
      <AdminPageHeader
        title={role.title}
        description={role.role_code || 'Edit role assessment template'}
        action={
          <Link href={`/admin/recruitment/roles/${id}/candidates`}>
            <AdminButton variant="primary">View candidates</AdminButton>
          </Link>
        }
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <AdminSection title="Role configuration">
        <RoleForm initialRole={role} initialAreas={areas} onSubmit={submit} saving={saving} />
      </AdminSection>
    </OpsPageShell>
  );
}
