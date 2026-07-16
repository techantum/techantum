'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import type { PartnerUserRole, PartnerUserStatus } from '@/lib/partner/types';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: PartnerUserRole;
  status: PartnerUserStatus;
  last_login_at: string | null;
  created_at: string;
}

export default function PartnerTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', role: 'partner_user' as PartnerUserRole });

  const load = () => {
    setLoading(true);
    fetch('/api/partner/team')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMembers(data);
        else setError(data.error || 'Failed to load team');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/partner/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Invite failed');
      return;
    }

    setMembers(data);
    setForm({ fullName: '', email: '', role: 'partner_user' });
    setShowForm(false);
    setMessage('Invite sent successfully.');
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900">Team Members</h1>
          <p className="text-sm text-slate-500 mt-1">
            Invite colleagues to help submit client requirements on behalf of your organization.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          <Icon name="PlusIcon" size={16} />
          Invite Member
        </button>
      </div>

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
        <form onSubmit={invite} className="bg-white rounded-xl border border-slate-200 p-5 mb-6 space-y-4">
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
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email address"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as PartnerUserRole })}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="partner_user">Partner User</option>
            <option value="partner_admin">Partner Admin</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Sending…' : 'Send Invite'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{m.full_name}</p>
                    <p className="text-xs text-slate-500">{m.email}</p>
                  </td>
                  <td className="px-5 py-3 capitalize">{m.role.replace('_', ' ')}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
