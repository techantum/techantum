'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import {
  PARTNER_NAV_ITEMS,
  defaultPartnerNavAccess,
  normalizePartnerNavAccess,
  type PartnerNavAccess,
  type PartnerNavKey,
} from '@/lib/partner/nav';
import type { PartnerUserRole, PartnerUserStatus } from '@/lib/partner/types';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: PartnerUserRole;
  status: PartnerUserStatus;
  last_login_at: string | null;
  created_at: string;
  nav_access?: Record<string, boolean> | null;
}

interface TeamForm {
  fullName: string;
  email: string;
  role: PartnerUserRole;
  navAccess: PartnerNavAccess;
}

const emptyForm = (leadDiscoveryEnabled: boolean): TeamForm => ({
  fullName: '',
  email: '',
  role: 'partner_user',
  navAccess: {
    ...defaultPartnerNavAccess('partner_user'),
    'lead-discovery': leadDiscoveryEnabled,
  },
});

function applyMembers(payload: unknown, fallback: TeamMember[]): TeamMember[] {
  if (Array.isArray(payload)) return payload as TeamMember[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { members?: unknown }).members)) {
    return (payload as { members: TeamMember[] }).members;
  }
  return fallback;
}

export default function PartnerTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [leadDiscoveryEnabled, setLeadDiscoveryEnabled] = useState(false);
  const [actorRole, setActorRole] = useState<PartnerUserRole>('partner_admin');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamForm>(() => emptyForm(false));

  const applyPayload = (data: Record<string, unknown>) => {
    setMembers(applyMembers(data, []));
    if (typeof data.leadDiscoveryEnabled === 'boolean') setLeadDiscoveryEnabled(data.leadDiscoveryEnabled);
    if (data.actorRole === 'partner_admin' || data.actorRole === 'partner_user') {
      setActorRole(data.actorRole);
    }
  };

  const load = () => {
    setLoading(true);
    fetch('/api/partner/team')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else applyPayload(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(leadDiscoveryEnabled));
    setShowForm(true);
    setError('');
    setMessage('');
  };

  const openEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setForm({
      fullName: member.full_name,
      email: member.email,
      role: member.role,
      navAccess: normalizePartnerNavAccess(member.role, member.nav_access),
    });
    setShowForm(true);
    setError('');
    setMessage('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch(editingId ? `/api/partner/team/${editingId}` : '/api/partner/team', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: form.fullName,
        email: form.email,
        role: form.role,
        navAccess: form.navAccess,
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || (editingId ? 'Update failed' : 'Invite failed'));
      return;
    }

    applyPayload(data);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm(leadDiscoveryEnabled));
    setMessage(editingId ? 'Team member updated.' : 'Invite sent successfully.');
  };

  const remove = async (member: TeamMember) => {
    if (!window.confirm(`Delete ${member.full_name}? They will lose Partner Portal access.`)) return;
    setDeletingId(member.id);
    setError('');
    setMessage('');
    const res = await fetch(`/api/partner/team/${member.id}`, { method: 'DELETE' });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) {
      setError(data.error || 'Delete failed');
      return;
    }
    applyPayload(data);
    if (editingId === member.id) {
      setShowForm(false);
      setEditingId(null);
    }
    setMessage(`${member.full_name} was removed.`);
  };

  const setNav = (key: PartnerNavKey, enabled: boolean) => {
    setForm((prev) => ({ ...prev, navAccess: { ...prev.navAccess, [key]: enabled } }));
  };

  const setRole = (role: PartnerUserRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      navAccess: role === 'partner_admin' ? defaultPartnerNavAccess('partner_admin') : prev.navAccess,
    }));
  };

  const navItems = useMemo(
    () =>
      PARTNER_NAV_ITEMS.map((item) => ({
        ...item,
        locked: 'requiresLeadDiscovery' in item && item.requiresLeadDiscovery && !leadDiscoveryEnabled,
      })),
    [leadDiscoveryEnabled]
  );

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        kicker="Partner portal"
        title="Team members"
        description="Invite colleagues and choose which left-menu pages each person can access."
        action={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary/90"
          >
            <Icon name="PlusIcon" size={16} />
            Invite member
          </button>
        }
      />

      {message && (
        <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      {showForm && (
        <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-5">
          <div>
            <h2 className="font-semibold text-slate-900">{editingId ? 'Edit team member' : 'Invite team member'}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {editingId
                ? 'Update their details and portal menu access.'
                : 'Send an invite and set their portal menu access before they join.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Full name"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <input
              required
              type="email"
              value={form.email}
              disabled={Boolean(editingId)}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email address"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <select
            value={form.role}
            onChange={(e) => setRole(e.target.value as PartnerUserRole)}
            disabled={actorRole !== 'partner_admin'}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="partner_user">Partner User</option>
            <option value="partner_admin">Partner Admin</option>
          </select>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Left menu access</p>
            <p className="text-xs text-slate-500 mt-1 mb-3">
              Enable or disable each Partner Portal page in the left navigation.
            </p>
            {form.role === 'partner_admin' ? (
              <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                Partner admins can access every menu, including Team.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {navItems.map((item) => (
                  <label
                    key={item.key}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${
                      item.locked ? 'border-slate-100 bg-slate-50 text-slate-400' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={item.locked ? false : form.navAccess[item.key]}
                      disabled={item.locked}
                      onChange={(e) => setNav(item.key, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-secondary"
                    />
                  </label>
                ))}
              </div>
            )}
            {!leadDiscoveryEnabled && form.role !== 'partner_admin' && (
              <p className="text-xs text-slate-500 mt-3">
                Lead Discovery stays off until TechAntum enables it for this partner account.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-full bg-secondary text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? (editingId ? 'Saving…' : 'Sending…') : editingId ? 'Save changes' : 'Send Invite'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading team…</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Access</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isAdmin = m.role === 'partner_admin';
                const access = normalizePartnerNavAccess(m.role, m.nav_access);
                const enabledCount = PARTNER_NAV_ITEMS.filter((item) => access[item.key]).length;
                return (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{m.full_name}</p>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </td>
                    <td className="px-5 py-3 capitalize">{m.role.replace('_', ' ')}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {isAdmin ? 'All menus' : `${enabledCount} of ${PARTNER_NAV_ITEMS.length} menus`}
                    </td>
                    <td className="px-5 py-3">
                      {isAdmin ? (
                        <p className="text-xs text-slate-400 text-right">Admin</p>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Icon name="PencilSquareIcon" size={14} />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === m.id}
                            onClick={() => remove(m)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Icon name="TrashIcon" size={14} />
                            {deletingId === m.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
