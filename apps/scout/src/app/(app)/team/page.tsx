'use client';

import { useEffect, useState } from 'react';
import { EmailField, NameField, PasswordField, SelectField } from '@/components/ui/FormFields';
import { useProcess } from '@/components/ui/ProcessOverlay';
import { emailError, isStrongPassword, nameError } from '@/lib/forms/rules';

type Member = { user_id: string; email: string; name: string; role: string };

export default function TeamPage() {
  const overlay = useProcess();
  const [rows, setRows] = useState<Member[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'subscriber_user' });

  const load = async () => {
    const response = await fetch('/api/team');
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not load the team');
    setRows(body.rows || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const invite = async () => {
    setShowError(true);
    if (nameError(form.name) || emailError(form.email) || !isStrongPassword(form.password)) {
      setError(nameError(form.name) || emailError(form.email) || 'Enter a password that meets all the conditions.');
      return;
    }
    setError('');
    setMessage('');
    await overlay.run('Adding team member…', async () => {
      try {
        const response = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Could not invite the user');
        setForm({ name: '', email: '', password: '', role: 'subscriber_user' });
        setShowError(false);
        setMessage(`${body.email} can sign in now.`);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not invite the user');
      }
    });
  };

  const changeRole = async (userId: string, role: string) => {
    setError('');
    await overlay.run('Updating role…', async () => {
      const response = await fetch('/api/team', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, role }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || 'Could not update the role');
        return;
      }
      await load();
    });
  };

  const remove = async (userId: string) => {
    setError('');
    await overlay.run('Removing team member…', async () => {
      const response = await fetch('/api/team', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error || 'Could not remove the user');
        return;
      }
      await load();
    });
  };

  return (
    <div className="space-y-5">
      <h1 className="font-bricolage text-3xl font-bold text-slate-900">Team</h1>
      {error ? <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p> : null}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Invite someone</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <NameField value={form.name} onValue={(name) => setForm({ ...form, name })} showError={showError} />
          <EmailField value={form.email} onValue={(email) => setForm({ ...form, email })} showError={showError} />
          <PasswordField value={form.password} onValue={(password) => setForm({ ...form, password })} showError={showError} showRules />
          <SelectField label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="subscriber_user">Subscriber User</option>
            <option value="subscriber_admin">Subscriber Admin</option>
          </SelectField>
        </div>
        <button type="button" onClick={() => void invite()} className="btn-primary mt-3">
          Add to workspace
        </button>
      </section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.user_id} className="border-t border-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800">{row.name || row.email}</p>
                  <p className="text-xs text-slate-500">{row.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select className="h-10 rounded-xl border border-slate-200 px-2" value={row.role} onChange={(event) => changeRole(row.user_id, event.target.value)}>
                    <option value="subscriber_admin">Subscriber Admin</option>
                    <option value="subscriber_user">Subscriber User</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className="btn-danger btn-sm" onClick={() => remove(row.user_id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
