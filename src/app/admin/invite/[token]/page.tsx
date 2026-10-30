'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthSplitShell from '@/components/auth/AuthSplitShell';
import { adminInputClass } from '@/components/admin/AdminField';
import AdminButton from '@/components/admin/AdminButton';

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = Array.isArray(params?.token) ? params.token[0] : params?.token || '';
  const router = useRouter();
  const [info, setInfo] = useState<{ email: string; firstName: string; lastName: string; roles: string[] } | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/invite/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Invalid invitation');
        setInfo(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Invalid invitation'));
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const response = await fetch(`/api/admin/invite/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirmPassword }),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not create password');
      return;
    }
    router.push('/admin/login');
  };

  return (
    <AuthSplitShell
      logo={<span className="font-bricolage text-2xl font-bold">Techantum</span>}
      kicker="Admin invitation"
      title="Create your password"
      subtitle="Accept your invitation to the Techantum Admin Portal."
      highlights={[{ icon: 'ShieldCheckIcon', title: 'Secure access', description: 'Passwords are never sent by email.' }]}
    >
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
      {info ? (
        <form className="space-y-4" onSubmit={submit}>
          <p className="text-sm text-slate-600">{info.firstName} {info.lastName}</p>
          <label className="block text-sm font-medium">Email
            <input className={`${adminInputClass} mt-1`} value={info.email} readOnly />
          </label>
          <p className="text-xs text-slate-500">Role: {info.roles.join(', ') || 'Admin'}</p>
          <label className="block text-sm font-medium">Create password
            <input className={`${adminInputClass} mt-1`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">Confirm password
            <input className={`${adminInputClass} mt-1`} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>
          <AdminButton variant="primary" loading={saving} type="submit">Accept invitation</AdminButton>
        </form>
      ) : null}
    </AuthSplitShell>
  );
}
