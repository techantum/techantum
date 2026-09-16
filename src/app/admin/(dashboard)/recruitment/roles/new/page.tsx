'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import RoleForm from '@/components/admin/recruitment/RoleForm';
import { OpsPageShell } from '@/components/admin/ops/OpsUi';

export default function NewRecruitmentRolePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (role: Record<string, unknown>, areas: Record<string, unknown>[]) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/recruitment/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...role, areas }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      router.push(`/admin/recruitment/roles/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OpsPageShell>
      <AdminPageHeader title="Create job role" description="Define role details and assessment criteria (100% weightage)." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <AdminSection title="Role & assessment template">
        <RoleForm onSubmit={submit} saving={saving} />
      </AdminSection>
    </OpsPageShell>
  );
}
