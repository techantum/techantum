'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';

type DeveloperAdmin = {
  user_id: string;
  email: string;
  created_at: string;
};

export default function SuperAdminProfilePage() {
  const [email, setEmail] = useState('');
  const [admins, setAdmins] = useState<DeveloperAdmin[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [createForm, setCreateForm] = useState({ email: '', password: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadAdmins = async () => {
    const res = await fetch('/api/admin/developer-admins', { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Could not load developer admins');
      return;
    }
    setAdmins(Array.isArray(body.rows) ? body.rows : []);
  };

  useEffect(() => {
    fetch('/api/admin/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((body) => setEmail(body.email || ''))
      .catch(() => undefined);
    void loadAdmins();
  }, []);

  const changePassword = async () => {
    setError('');
    setMessage('');
    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch('/api/admin/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          nextPassword: passwordForm.nextPassword,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Could not change password');
        return;
      }
      setPasswordForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
      setMessage('Password updated. Use the new password the next time you sign in.');
    } finally {
      setSavingPassword(false);
    }
  };

  const createAdmin = async () => {
    setError('');
    setMessage('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/developer-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || 'Could not create developer admin');
        return;
      }
      setCreateForm({ email: '', password: '' });
      setMessage(`Developer admin ${body.email} can sign in now.`);
      await loadAdmins();
    } finally {
      setCreating(false);
    }
  };

  const removeAdmin = async (admin: DeveloperAdmin) => {
    if (!window.confirm(`Remove developer admin ${admin.email}? They will no longer be able to sign in.`)) return;
    setError('');
    setMessage('');
    const res = await fetch(`/api/admin/developer-admins?userId=${encodeURIComponent(admin.user_id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Could not remove developer admin');
      return;
    }
    setMessage(`${admin.email} was removed.`);
    await loadAdmins();
  };

  return (
    <div className="w-full space-y-4">
      <AdminPageHeader
        title="Profile"
        description="The workspace has one super admin. Create developer admins from here. They can use every menu except Finance, HR, Recruitment, and Lead Discovery."
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <AdminSection title="Super admin" description={email || 'Signed-in account'}>
        <p className="text-sm text-slate-600">This is the only super admin account. It can open every module, including Finance, HR, Recruitment, and Lead Discovery.</p>
      </AdminSection>

      <AdminSection title="Change password" description="Update the password for this super admin account.">
        <AdminFormGrid>
          <AdminField label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              className={adminInputClass}
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
            />
          </AdminField>
          <AdminField label="New password">
            <input
              type="password"
              autoComplete="new-password"
              className={adminInputClass}
              value={passwordForm.nextPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, nextPassword: event.target.value })}
            />
          </AdminField>
          <AdminField label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              className={adminInputClass}
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
            />
          </AdminField>
        </AdminFormGrid>
        <AdminButton className="mt-3" variant="primary" disabled={savingPassword} onClick={changePassword}>
          {savingPassword ? 'Saving…' : 'Update password'}
        </AdminButton>
      </AdminSection>

      <AdminSection title="Developer admins" description="Create sign-in accounts for developers. They can open every menu except Finance, HR, Recruitment, and Lead Discovery.">
        <AdminFormGrid>
          <AdminField label="Email">
            <input
              type="email"
              autoComplete="off"
              className={adminInputClass}
              value={createForm.email}
              onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
            />
          </AdminField>
          <AdminField label="Password" hint="At least 8 characters. Share this with the developer.">
            <input
              type="password"
              autoComplete="new-password"
              className={adminInputClass}
              value={createForm.password}
              onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
            />
          </AdminField>
        </AdminFormGrid>
        <AdminButton className="mt-3" variant="primary" disabled={creating} onClick={createAdmin}>
          {creating ? 'Creating…' : 'Create developer admin'}
        </AdminButton>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Created</th>
                <th className="px-3 py-2"> </th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.user_id} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{admin.email}</td>
                  <td className="px-3 py-2 text-slate-500">
                    {new Date(admin.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => removeAdmin(admin)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                    No developer admins yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </div>
  );
}
