'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AdminPageLoader from '@/components/admin/AdminPageLoader';

type Role = { id?: string; name: string; code?: string };

type UserRow = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  role?: string;
  invitation_status: string | null;
  last_login_at: string | null;
  created_by_email: string | null;
  created_at: string;
  roles: Role[] | string;
};

const PAGE_SIZE = 10;
const AVATAR = [
  'bg-violet-50 text-violet-600',
  'bg-sky-50 text-sky-600',
  'bg-orange-50 text-secondary',
  'bg-emerald-50 text-emerald-600',
  'bg-pink-50 text-pink-600',
];

function displayName(user: UserRow) {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  if (name) return name;
  const local = user.email?.split('@')[0] || 'User';
  return local.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(user: UserRow) {
  const name = displayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function roleList(user: UserRow): Role[] {
  const raw = user.roles;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  if (user.role === 'SUPER_ADMIN') return [{ name: 'Super Admin', code: 'SUPER_ADMIN' }];
  return [];
}

function isSuperAdmin(user: UserRow) {
  return user.role === 'SUPER_ADMIN' || roleList(user).some((role) => role.code === 'SUPER_ADMIN' || role.name === 'Super Admin');
}

function invitationLabel(user: UserRow) {
  if (user.invitation_status === 'pending') return 'Pending';
  if (user.invitation_status === 'expired') return 'Expired';
  if (user.invitation_status === 'revoked') return 'Revoked';
  if (user.status === 'invited') return 'Pending';
  return 'Accepted';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [checked, setChecked] = useState<string[]>([]);

  const load = () => {
    fetch('/api/admin/rbac/users', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => setUsers(body.users || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, body: object) => {
    const response = await fetch(`/api/admin/rbac/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error || 'Action failed');
      return;
    }
    load();
  };

  const roles = useMemo(() => {
    const names = new Set<string>();
    users.forEach((user) => roleList(user).forEach((role) => names.add(role.name)));
    return [...names];
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      const name = displayName(user).toLowerCase();
      if (q && !`${name} ${user.email}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;
      if (roleFilter !== 'all' && !roleList(user).some((role) => role.name === roleFilter)) return false;
      const created = new Date(user.created_at).getTime();
      if (fromDate && created < new Date(fromDate).getTime()) return false;
      if (toDate && created > new Date(`${toDate}T23:59:59`).getTime()) return false;
      return true;
    });
  }, [users, query, roleFilter, statusFilter, fromDate, toDate]);

  const total = users.length || 1;
  const active = users.filter((user) => user.status === 'active').length;
  const pending = users.filter((user) => user.status === 'invited' || user.invitation_status === 'pending').length;
  const inactive = users.filter((user) => user.status === 'inactive' || user.status === 'suspended').length;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allChecked = pageRows.length > 0 && pageRows.every((row) => checked.includes(row.user_id));

  const reset = () => {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] pb-8">
      <AdminPageLoader open={loading} label="Loading admin users…" />
      <p className="text-[12px] text-slate-400">
        <Link href="/admin" className="hover:text-slate-600">Home</Link>
        <span className="px-1.5">›</span>
        Administration
        <span className="px-1.5">›</span>
        Admin Users
      </p>
      <div className="mt-2 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Admin Users</h1>
          <p className="mt-1 text-sm text-slate-400">Manage administrator accounts, control access and keep your team secure.</p>
        </div>
        <Link href="/admin/users/new" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-semibold text-white shadow-sm">
          <Icon name="UserPlusIcon" size={16} /> Add Admin User
        </Link>
      </div>

      {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="UserGroupIcon" wrap="bg-violet-50 text-violet-500" label="Total Admin Users" value={users.length} />
        <Kpi icon="UserPlusIcon" wrap="bg-emerald-50 text-emerald-500" label="Active Users" value={active} hint={<span className="text-emerald-500">{pct(active)}</span>} />
        <Kpi icon="ClockIcon" wrap="bg-amber-50 text-amber-500" label="Pending Invitations" value={pending} hint={<span className="text-slate-400">{pct(pending)}</span>} />
        <Kpi icon="UserMinusIcon" wrap="bg-rose-50 text-rose-400" label="Inactive Users" value={inactive} hint={<span className="text-slate-400">{pct(inactive)}</span>} />
      </div>

      <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="h-10 w-full rounded-xl border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm ring-1 ring-slate-100 placeholder:text-slate-400" placeholder="Search by name or email..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="all">All roles</option>
            {roles.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <label className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm text-slate-500 ring-1 ring-slate-100">
            <Icon name="CalendarDaysIcon" size={16} />
            <input type="date" className="border-0 bg-transparent p-0 text-sm text-slate-600 focus:ring-0" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            <span className="text-slate-300">–</span>
            <input type="date" className="border-0 bg-transparent p-0 text-sm text-slate-600 focus:ring-0" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
          </label>
          <button type="button" className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-50" onClick={reset}>
            <Icon name="ArrowPathIcon" size={16} /> Reset
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" className="accent-[#EF4323]" checked={allChecked} onChange={(e) => setChecked(e.target.checked ? pageRows.map((row) => row.user_id) : checked.filter((id) => !pageRows.some((row) => row.user_id === id)))} />
                </th>
                {['User', 'Role', 'Status', 'Invitation', 'Last Login', 'Created By', 'Created Date', 'Actions'].map((col) => (
                  <th key={col} className="px-3 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((user, index) => {
                const rolesForUser = roleList(user);
                const superAdmin = isSuperAdmin(user);
                const invite = invitationLabel(user);
                return (
                  <tr key={user.user_id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-3 py-3.5">
                      <input type="checkbox" className="accent-[#EF4323]" checked={checked.includes(user.user_id)} onChange={(e) => setChecked(e.target.checked ? [...checked, user.user_id] : checked.filter((id) => id !== user.user_id))} />
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`relative flex h-10 w-10 items-center justify-center rounded-full text-[11px] font-bold ${superAdmin ? 'bg-orange-50 text-secondary' : AVATAR[index % AVATAR.length]}`}>
                          {superAdmin ? <Icon name="SparklesIcon" size={16} /> : initials(user)}
                        </span>
                        <span>
                          <span className="block font-semibold text-slate-800">{displayName(user)}</span>
                          <span className="block text-[12px] text-slate-400">{user.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      {superAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                          <Icon name="SparklesIcon" size={12} /> Super Admin
                        </span>
                      ) : rolesForUser.length ? (
                        <span className="text-slate-600">{rolesForUser.map((role) => role.name).join(', ')}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${user.status === 'active' ? 'bg-emerald-50 text-emerald-600' : user.status === 'invited' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : user.status === 'invited' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        {user.status === 'active' ? 'Active' : user.status === 'invited' ? 'Invited' : user.status === 'suspended' ? 'Suspended' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-[12px] font-medium ${invite === 'Accepted' ? 'text-emerald-500' : invite === 'Pending' ? 'text-amber-500' : 'text-slate-400'}`}>{invite}</span>
                    </td>
                    <td className="px-3 py-3.5 text-slate-400">{user.last_login_at ? new Date(user.last_login_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                    <td className="px-3 py-3.5 text-slate-400">{user.created_by_email || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-[12px] leading-5 text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('en-GB')}
                      <br />
                      {new Date(user.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-violet-50 hover:text-violet-500" title="View" onClick={() => router.push(`/admin/users/${user.user_id}`)}>
                          <Icon name="EyeIcon" size={16} />
                        </button>
                        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-violet-50 hover:text-violet-500" title="Edit" onClick={() => router.push(`/admin/users/${user.user_id}`)}>
                          <Icon name="PencilSquareIcon" size={16} />
                        </button>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-500"
                          title="Deactivate"
                          onClick={() => {
                            if (window.confirm(`Deactivate ${displayName(user)}? They will no longer be able to sign in.`)) {
                              act(user.user_id, { status: 'inactive' });
                            }
                          }}
                        >
                          <Icon name="TrashIcon" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!pageRows.length ? (
                <tr><td colSpan={9} className="px-3 py-12 text-center text-slate-400">No admin users match these filters.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-slate-400">
          <span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} users</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} className="h-8 w-8 rounded-lg disabled:opacity-30" onClick={() => setPage((n) => n - 1)}>‹</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 6).map((number) => (
              <button key={number} type="button" className={`h-8 w-8 rounded-lg text-sm ${number === page ? 'bg-violet-600 text-white' : 'text-slate-500'}`} onClick={() => setPage(number)}>{number}</button>
            ))}
            <button type="button" disabled={page >= pageCount} className="h-8 w-8 rounded-lg disabled:opacity-30" onClick={() => setPage((n) => n + 1)}>›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, wrap, label, value, hint }: { icon: string; wrap: string; label: string; value: number; hint?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${wrap}`}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="text-[12px] text-slate-400">{label}</p>
        <p className="text-[26px] font-semibold leading-tight text-slate-900">{value}</p>
        {hint ? <p className="text-[11px] font-medium">{hint}</p> : null}
      </div>
    </div>
  );
}
