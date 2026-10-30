'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AdminPageLoader from '@/components/admin/AdminPageLoader';
import RolePermissionEditor from '@/components/admin/rbac/RolePermissionEditor';
import type { AccessLevel, FeatureNode } from '@/lib/admin/access';
import { adminInputClass } from '@/components/admin/AdminField';

function CreateRoleForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [tree, setTree] = useState<FeatureNode[]>([]);
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetch('/api/admin/rbac/roles', { cache: 'no-store' }).then((r) => r.json());
        if (!cancelled) setTree(list.registry?.tree || []);
        if (from) {
          const detail = await fetch(`/api/admin/rbac/roles/${from}`, { cache: 'no-store' }).then((r) => r.json());
          if (!cancelled && detail.role) {
            setName(`Copy of ${detail.role.name}`);
            setDescription(detail.role.description || '');
            setPermissions(detail.role.permissions || {});
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from]);

  const save = async () => {
    setSaving(true);
    setError('');
    const response = await fetch('/api/admin/rbac/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, status, permissions }),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not create role');
      return;
    }
    router.push(`/admin/roles/${body.role.id}`);
  };

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] space-y-4 pb-8">
      <AdminPageLoader open={loading || saving} label={saving ? 'Saving role…' : 'Loading role settings…'} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/roles" className="inline-flex items-center gap-1 text-[12px] text-slate-400 hover:text-slate-600">
            <Icon name="ArrowLeftIcon" size={12} /> Back to Roles
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-secondary">
              <Icon name="UserCircleIcon" size={20} />
            </span>
            <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Create Role</h1>
          </div>
        </div>
        <p className="max-w-sm text-right text-[12px] text-slate-400">Define what this role can access across the platform.</p>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
            <Icon name="ShieldCheckIcon" size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Role Details</p>
            <p className="text-[12px] text-slate-400">Set a name, status and description for this role.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-[12px] font-medium text-slate-600">Role name *
            <input className={`${adminInputClass} mt-1.5`} placeholder="Enter role name (e.g. Marketing Manager)" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-[12px] font-medium text-slate-600">Status
            <div className="relative mt-1.5">
              <span className={`pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <select className={`${adminInputClass} pl-7`} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </label>
          <label className="sm:col-span-2 text-[12px] font-medium text-slate-600">Description
            <textarea className={`${adminInputClass} mt-1.5 min-h-[88px]`} placeholder="Describe the purpose and responsibilities of this role..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-[12px] text-sky-700">This role controls what features and data the selected users can access across the platform.</p>
      </section>

      <RolePermissionEditor tree={tree} value={permissions} onChange={setPermissions} />

      <div className="flex items-center justify-between">
        <Link href="/admin/roles" className="text-sm font-semibold text-slate-500 hover:text-slate-800">Cancel</Link>
        <button type="button" className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-white shadow-sm hover:bg-secondary/90" onClick={save} disabled={saving}>
          Save role
        </button>
      </div>
    </div>
  );
}

export default function CreateRolePage() {
  return (
    <Suspense fallback={<div className="relative min-h-[calc(100dvh-5.5rem)]"><AdminPageLoader open label="Loading role settings…" /></div>}>
      <CreateRoleForm />
    </Suspense>
  );
}
