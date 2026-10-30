'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AdminPageLoader from '@/components/admin/AdminPageLoader';
import { flattenFeatures, inheritAccess, type AccessLevel, type FeatureNode } from '@/lib/admin/access';

type RoleRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: string;
  is_system: boolean;
  user_count: number;
  module_count: number;
  created_by_email: string | null;
  created_at: string;
};

type RoleDetail = RoleRow & {
  permissions?: Record<string, AccessLevel>;
  users?: { user_id: string; email: string; first_name: string | null; last_name: string | null }[];
};

const ROLE_STYLE: Record<string, { icon: string; wrap: string }> = {
  SUPER_ADMIN: { icon: 'SparklesIcon', wrap: 'bg-orange-50 text-secondary' },
  FINANCE_ADMIN: { icon: 'BanknotesIcon', wrap: 'bg-violet-50 text-violet-500' },
  HR_ADMIN: { icon: 'UserGroupIcon', wrap: 'bg-emerald-50 text-emerald-500' },
  PROJECT_MANAGER: { icon: 'ClipboardDocumentCheckIcon', wrap: 'bg-indigo-50 text-indigo-500' },
  VIEWER: { icon: 'EyeIcon', wrap: 'bg-slate-100 text-slate-500' },
};

function styleFor(code?: string) {
  return ROLE_STYLE[code || ''] || { icon: 'ShieldCheckIcon', wrap: 'bg-violet-50 text-violet-500' };
}

function moduleAccess(node: FeatureNode, permissions: Record<string, AccessLevel>, superAdmin: boolean): AccessLevel {
  if (superAdmin) return 'FULL';
  if (permissions[node.key] === 'FULL' || permissions[node.key] === 'READ') return permissions[node.key];
  const leaves = flattenFeatures([node]);
  const levels = leaves.map((leaf) => permissions[leaf.key] || 'NONE');
  if (levels.includes('FULL')) return 'FULL';
  if (levels.includes('READ')) return 'READ';
  return 'NONE';
}

const ACCESS_TONE: Record<AccessLevel, string> = {
  FULL: 'bg-emerald-50 text-emerald-600',
  READ: 'bg-amber-50 text-amber-600',
  NONE: 'bg-slate-100 text-slate-500',
};

const ACCESS_LABEL: Record<AccessLevel, string> = {
  FULL: 'Full Access',
  READ: 'Read Access',
  NONE: 'No Access',
};

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [tree, setTree] = useState<FeatureNode[]>([]);
  const [detail, setDetail] = useState<RoleDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'permissions' | 'users' | 'details'>('permissions');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [moduleSearch, setModuleSearch] = useState('');
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = () => {
    fetch('/api/admin/rbac/roles', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        if (body.error) throw new Error(body.error);
        setRoles(body.roles || []);
        setTree(body.registry?.tree || []);
        setSelectedId((current) => current || body.roles?.[0]?.id || null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load roles'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/admin/rbac/roles/${selectedId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => setDetail(body.role || null))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((role) => {
      if (status !== 'all' && role.status !== status) return false;
      if (q && ![role.name, role.description, role.code].join(' ').toLowerCase().includes(q)) return false;
      if (moduleFilter !== 'all') {
        const superAdmin = role.code === 'SUPER_ADMIN';
        const perms = role.id === detail?.id ? detail.permissions || {} : {};
        const node = tree.find((item) => item.key === moduleFilter || item.label === moduleFilter);
        if (node && !superAdmin && moduleAccess(node, perms, false) === 'NONE' && role.id !== detail?.id) return true;
      }
      return true;
    });
  }, [roles, query, status, moduleFilter, tree, detail]);

  const stats = {
    total: roles.length,
    active: roles.filter((role) => role.status === 'active').length,
    users: roles.reduce((sum, role) => sum + Number(role.user_count || 0), 0),
    modules: tree.length,
  };

  const permissions = useMemo(() => {
    if (!detail) return {};
    if (detail.code === 'SUPER_ADMIN') return inheritAccess(tree, Object.fromEntries(tree.map((node) => [node.key, 'FULL' as AccessLevel])));
    return inheritAccess(tree, detail.permissions || {});
  }, [detail, tree]);

  const visibleModules = tree.filter((node) => !moduleSearch.trim() || node.label.toLowerCase().includes(moduleSearch.trim().toLowerCase()));

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] pb-8">
      <AdminPageLoader open={loading} label="Loading roles…" />
      <p className="text-[12px] text-slate-400">
        <Link href="/admin" className="hover:text-slate-600">Home</Link>
        <span className="px-1.5">›</span>
        Administration
        <span className="px-1.5">›</span>
        Roles & Permissions
      </p>
      <div className="mt-2 mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-slate-400">Manage roles, define permissions for each module, and control access across the platform.</p>
        </div>
        <button type="button" onClick={() => setMatrixOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 text-sm font-semibold text-violet-600">
          <Icon name="Squares2X2Icon" size={16} /> Permission Matrix
        </button>
      </div>

      {error ? <p className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon="UserCircleIcon" wrap="bg-violet-50 text-violet-500" label="Total Roles" value={stats.total} />
        <Kpi icon="CheckBadgeIcon" wrap="bg-emerald-50 text-emerald-500" label="Active Roles" value={stats.active} />
        <Kpi icon="UsersIcon" wrap="bg-orange-50 text-orange-500" label="Total Users Assigned" value={stats.users} />
        <Kpi icon="Squares2X2Icon" wrap="bg-rose-50 text-rose-400" label="Modules Covered" value={stats.modules} />
      </div>

      <div className={`grid gap-4 ${selectedId ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
        <div className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="h-10 w-full rounded-xl border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm ring-1 ring-slate-100 placeholder:text-slate-400" placeholder="Search roles by name or description..." value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="h-10 rounded-xl border-0 bg-white px-3 text-sm text-slate-600 ring-1 ring-slate-100" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
              <option value="all">All</option>
              {tree.map((node) => <option key={node.key} value={node.key}>{node.label}</option>)}
            </select>
            <button type="button" className="inline-flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-slate-500 hover:bg-slate-50" onClick={() => { setQuery(''); setStatus('all'); setModuleFilter('all'); }}>
              <Icon name="ArrowPathIcon" size={16} /> Reset
            </button>
            <Link href="/admin/roles/new" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-semibold text-white">
              + Create Role
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">
                <tr>
                  {['#', 'Role Name', 'Description', 'Users', 'Modules', 'Status', 'Created Date', 'Actions'].map((col) => (
                    <th key={col} className="px-2 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((role, index) => {
                  const look = styleFor(role.code);
                  const modules = role.code === 'SUPER_ADMIN' ? tree.length : role.module_count;
                  const active = selectedId === role.id;
                  return (
                    <tr key={role.id} className={`cursor-pointer border-t border-slate-100 ${active ? 'bg-orange-50/40' : 'hover:bg-slate-50/70'}`} onClick={() => setSelectedId(role.id)}>
                      <td className="px-2 py-3.5 text-slate-400">{index + 1}</td>
                      <td className="px-2 py-3.5">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${look.wrap}`}><Icon name={look.icon} size={15} /></span>
                          {role.name}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-2 py-3.5 text-[13px] text-slate-500">{role.description || '—'}</td>
                      <td className="px-2 py-3.5 text-slate-600">{role.user_count}</td>
                      <td className="px-2 py-3.5 text-slate-600">{modules}</td>
                      <td className="px-2 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${role.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${role.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {role.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3.5 text-[12px] leading-5 text-slate-500">
                        {new Date(role.created_at).toLocaleDateString('en-GB')}
                        <br />by {role.is_system ? 'System' : role.created_by_email || 'Admin'}
                      </td>
                      <td className="px-2 py-3.5">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-500"
                          onClick={(event) => {
                            event.stopPropagation();
                            router.push(`/admin/roles/${role.id}?edit=1`);
                          }}
                        >
                          <Icon name="PencilSquareIcon" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="px-2 pt-3 text-[13px] text-slate-400">Showing 1 to {filtered.length} of {filtered.length} roles</p>
        </div>

        {detail ? (
          <aside className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full ${styleFor(detail.code).wrap}`}>
                    <Icon name={styleFor(detail.code).icon} size={16} />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">{detail.name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${detail.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    {detail.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-slate-400">{detail.description}</p>
              </div>
              <div className="flex items-center gap-1">
                {detail.code !== 'SUPER_ADMIN' ? (
                  <Link href={`/admin/roles/${detail.id}?edit=1`} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-violet-600 hover:bg-violet-50">
                    <Icon name="PencilSquareIcon" size={14} /> Edit Role
                  </Link>
                ) : (
                  <Link href={`/admin/roles/${detail.id}`} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-violet-600 hover:bg-violet-50">
                    <Icon name="PencilSquareIcon" size={14} /> Edit Role
                  </Link>
                )}
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50" onClick={() => setSelectedId(null)}>
                  <Icon name="XMarkIcon" size={16} />
                </button>
              </div>
            </div>

            <div className="mb-4 flex gap-4 border-b border-slate-100 text-sm">
              {(['permissions', 'users', 'details'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`-mb-px border-b-2 pb-2 font-semibold capitalize ${tab === key ? 'border-secondary text-secondary' : 'border-transparent text-slate-400'}`}
                >
                  {key === 'users' ? `Users (${detail.users?.length || detail.user_count || 0})` : key}
                </button>
              ))}
            </div>

            {loadingDetail ? <p className="text-sm text-slate-400">Loading…</p> : null}

            {tab === 'permissions' ? (
              <div>
                <div className="relative mb-3">
                  <Icon name="MagnifyingGlassIcon" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="h-9 w-full rounded-xl border-0 bg-slate-50 pl-8 pr-3 text-sm ring-1 ring-slate-100" placeholder="Search modules..." value={moduleSearch} onChange={(e) => setModuleSearch(e.target.value)} />
                </div>
                <div className="space-y-2">
                  {visibleModules.map((node) => {
                    const access = moduleAccess(node, permissions, detail.code === 'SUPER_ADMIN');
                    const open = openModules[node.key];
                    return (
                      <div key={node.key} className="rounded-2xl ring-1 ring-slate-100">
                        <button type="button" className="flex w-full items-center gap-3 px-3 py-2.5 text-left" onClick={() => setOpenModules((current) => ({ ...current, [node.key]: !open }))}>
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-secondary">
                            <Icon name={node.icon || 'Squares2X2Icon'} size={15} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-800">{node.label}</span>
                            <span className="block text-[11px] text-slate-400">Access to {node.label.toLowerCase()}</span>
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ACCESS_TONE[access]}`}>
                            {ACCESS_LABEL[access]}
                            <Icon name={open ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={12} />
                          </span>
                        </button>
                        {open ? (
                          <div className="space-y-1 border-t border-slate-100 px-3 py-2">
                            {flattenFeatures([node]).filter((leaf) => leaf.key !== node.key || !node.children.length).map((leaf) => (
                              <div key={leaf.key} className="flex items-center justify-between py-1 text-[12px] text-slate-600">
                                <span>{leaf.label}</span>
                                <span className={ACCESS_TONE[moduleAccess(leaf, permissions, detail.code === 'SUPER_ADMIN')]}>{ACCESS_LABEL[moduleAccess(leaf, permissions, detail.code === 'SUPER_ADMIN')]}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {tab === 'users' ? (
              <ul className="space-y-2 text-sm">
                {(detail.users || []).length ? detail.users!.map((user) => (
                  <li key={user.user_id} className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-800">{`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}</p>
                    <p className="text-[12px] text-slate-400">{user.email}</p>
                  </li>
                )) : <li className="text-slate-400">No users assigned yet.</li>}
              </ul>
            ) : null}

            {tab === 'details' ? (
              <dl className="space-y-3 text-sm">
                <div><dt className="text-[11px] uppercase text-slate-400">Code</dt><dd className="font-medium text-slate-800">{detail.code}</dd></div>
                <div><dt className="text-[11px] uppercase text-slate-400">Created</dt><dd className="text-slate-700">{new Date(detail.created_at).toLocaleString('en-IN')} {detail.is_system ? 'by System' : ''}</dd></div>
                <div><dt className="text-[11px] uppercase text-slate-400">Users</dt><dd>{detail.user_count}</dd></div>
              </dl>
            ) : null}
          </aside>
        ) : null}
      </div>

      {matrixOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="max-h-[80vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Permission Matrix</h3>
              <button type="button" onClick={() => setMatrixOpen(false)} className="text-slate-400"><Icon name="XMarkIcon" size={18} /></button>
            </div>
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-3 text-slate-400">Module</th>
                  {roles.map((role) => <th key={role.id} className="px-2 py-2 text-slate-500">{role.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {tree.map((node) => (
                  <tr key={node.key} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-medium">{node.label}</td>
                    {roles.map((role) => {
                      const access = moduleAccess(node, role.id === detail?.id ? permissions : {}, role.code === 'SUPER_ADMIN');
                      return <td key={role.id} className="px-2 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ACCESS_TONE[access]}`}>{ACCESS_LABEL[access]}</span></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[12px] text-slate-400">Select a role in the list to inspect exact feature access. Super Admin is always unrestricted.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ icon, wrap, label, value }: { icon: string; wrap: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${wrap}`}>
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="text-[12px] text-slate-400">{label}</p>
        <p className="text-[26px] font-semibold leading-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}
