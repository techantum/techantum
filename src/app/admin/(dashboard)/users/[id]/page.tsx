'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPageLoader from '@/components/admin/AdminPageLoader';
import AdminButton from '@/components/admin/AdminButton';
import { StatusBadge } from '@/components/admin/finance/FinanceUi';
import { adminInputClass } from '@/components/admin/AdminField';
import { inheritAccess, type AccessLevel } from '@/lib/admin/access';
import { permissionTree } from '@/lib/admin/permission-registry';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch(`/api/admin/rbac/users/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        setUser(body.user);
        setRoleId(body.user?.roles?.[0]?.id || '');
      });
    fetch('/api/admin/rbac/roles').then((r) => r.json()).then((body) => setRoles(body.roles || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const saveRole = async () => {
    const response = await fetch(`/api/admin/rbac/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleIds: [roleId] }),
    });
    const body = await response.json();
    if (!response.ok) setError(body.error || 'Could not change role');
    else load();
  };

  if (!user) {
    return (
      <div className="relative min-h-[calc(100dvh-5.5rem)]">
        <AdminPageLoader open label="Loading admin user…" />
      </div>
    );
  }
  const access = user.authorization?.isSuperAdmin
    ? { '*': 'FULL' as AccessLevel }
    : inheritAccess(permissionTree(), user.authorization?.access || {});
  const grouped = Object.entries(access).reduce<Record<string, { key: string; level: AccessLevel }[]>>((acc, [key, level]) => {
    const module = key.split('.')[0];
    acc[module] = acc[module] || [];
    acc[module].push({ key, level });
    return acc;
  }, {});

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] space-y-4">
      <AdminPageLoader open={loading} label="Loading admin user…" />
      <AdminPageHeader title={`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email} backHref="/admin/users" />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 sm:grid-cols-2 text-sm">
        <p><span className="text-slate-500">Email</span><br />{user.email}</p>
        <p><span className="text-slate-500">Status</span><br /><StatusBadge value={user.status} /></p>
        <p><span className="text-slate-500">Last login</span><br />{user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-IN') : '—'}</p>
        <p><span className="text-slate-500">Roles</span><br />{(user.roles || []).map((row: { name: string }) => row.name).join(', ') || '—'}</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold">Change role</p>
        <div className="flex flex-wrap gap-2">
          <select className={adminInputClass} value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
          <AdminButton variant="primary" onClick={saveRole}>Save role</AdminButton>
          <AdminButton onClick={() => fetch(`/api/admin/rbac/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resend: true }) })}>Resend invitation</AdminButton>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold">Effective access</p>
        {user.authorization?.isSuperAdmin ? <p className="text-sm text-slate-600">Unrestricted Super Admin access.</p> : (
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(grouped).map(([module, items]) => (
              <div key={module}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{module}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {items.map((item) => (
                    <li key={item.key} className="flex justify-between gap-2">
                      <span>{item.key}</span>
                      <span className="text-slate-500">{item.level}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold">Invitation history</p>
        <ul className="space-y-2 text-sm">
          {(user.invitations || []).map((row: { id: string; status: string; invited_at: string; expires_at: string }) => (
            <li key={row.id} className="flex justify-between gap-2">
              <StatusBadge value={row.status} />
              <span className="text-slate-500">{new Date(row.invited_at).toLocaleString('en-IN')} · expires {new Date(row.expires_at).toLocaleString('en-IN')}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <p className="mb-3 text-sm font-semibold">Recent security activity</p>
        <ul className="space-y-2 text-sm">
          {(user.activity || []).map((row: { action: string; created_at: string; actor_email: string; ip: string }, index: number) => (
            <li key={`${row.action}-${index}`} className="flex justify-between gap-2 text-slate-600">
              <span>{row.action}</span>
              <span>{row.actor_email} {row.ip || ''} {new Date(row.created_at).toLocaleString('en-IN')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
