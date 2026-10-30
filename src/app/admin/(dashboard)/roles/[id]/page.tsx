'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPageLoader from '@/components/admin/AdminPageLoader';
import AdminButton from '@/components/admin/AdminButton';
import RolePermissionEditor from '@/components/admin/rbac/RolePermissionEditor';
import type { AccessLevel, FeatureNode } from '@/lib/admin/access';
import { adminInputClass } from '@/components/admin/AdminField';
import { StatusBadge } from '@/components/admin/finance/FinanceUi';

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const editMode = useSearchParams().get('edit') === '1';
  const [role, setRole] = useState<any>(null);
  const [tree, setTree] = useState<FeatureNode[]>([]);
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([
      fetch(`/api/admin/rbac/roles/${id}`, { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/admin/rbac/roles', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([detail, list]) => {
      setRole(detail.role);
      setPermissions(detail.role?.permissions || {});
      setTree(list.registry?.tree || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const save = async () => {
    setSaving(true);
    setError('');
    const response = await fetch(`/api/admin/rbac/roles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: role.name,
        description: role.description,
        status: role.status,
        permissions,
      }),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not save');
      return;
    }
    setMessage(body.affectedUsers ? `Saved. This change affects ${body.affectedUsers} users.` : 'Saved.');
    load();
  };

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] space-y-4">
      <AdminPageLoader open={loading || saving || !role} label={saving ? 'Saving role…' : 'Loading role…'} />
      {!role ? null : (
      <>
      <AdminPageHeader title={role.name} backHref="/admin/roles" />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <label className="text-sm font-medium">Role name
          <input className={`${adminInputClass} mt-1`} disabled={role.is_system} value={role.name} onChange={(e) => setRole({ ...role, name: e.target.value })} />
        </label>
        <div className="text-sm">Status <div className="mt-2"><StatusBadge value={role.status} /></div></div>
        <label className="sm:col-span-2 text-sm font-medium">Description
          <textarea className={`${adminInputClass} mt-1`} rows={3} value={role.description || ''} onChange={(e) => setRole({ ...role, description: e.target.value })} />
        </label>
        <p className="sm:col-span-2 text-sm text-slate-500">{role.users?.length || 0} users assigned.</p>
      </div>
      {role.is_system ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Super Admin is unrestricted and cannot be edited.</p>
      ) : (
        <>
          <RolePermissionEditor tree={tree} value={permissions} onChange={setPermissions} />
          <AdminButton variant="primary" loading={saving} onClick={save}>{editMode ? 'Save permissions' : 'Edit permissions'}</AdminButton>
        </>
      )}
      </>
      )}
    </div>
  );
}
