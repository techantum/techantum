'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import { launchEmbeddedSignup } from '@/lib/whatsapp-provider/facebook-sdk';

type Session = {
  authenticated?: boolean;
  membership?: boolean;
  configured?: boolean;
  companyName?: string;
  email?: string;
  connected?: boolean;
};

type SignupConfig = { appId?: string; configId?: string; graphVersion?: string; configured?: boolean };

export default function ConnectWhatsAppPanel() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [config, setConfig] = useState<SignupConfig>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSession = async () => {
    const [sessionRes, configRes] = await Promise.all([
      fetch('/api/public/wa-onboard/session', { cache: 'no-store' }),
      fetch('/api/public/wa-onboard/config', { cache: 'no-store' }),
    ]);
    setSession(await sessionRes.json());
    setConfig(await configRes.json());
  };

  useEffect(() => {
    void loadSession();
  }, []);

  const connect = async () => {
    setError('');
    if (!config.configured || !config.appId || !config.configId || !config.graphVersion) {
      setError('WhatsApp connection is not fully configured yet. Please contact TechAntum.');
      return;
    }
    setBusy(true);
    try {
      const signup = await launchEmbeddedSignup({
        appId: config.appId,
        configId: config.configId,
        graphVersion: config.graphVersion,
      });
      const res = await fetch('/api/public/wa-onboard/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'WhatsApp connection failed.');
      setMessage('WhatsApp connected. Your Business account, WABA and phone number were imported.');
      await loadSession();
      router.push('/portal/wa');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WhatsApp connection failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!session) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Checking your workspace…</div>;
  }

  if (!session.authenticated || !session.membership) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600 mb-4">Sign in first, then connect WhatsApp Business from your workspace.</p>
        <Link href="/login?next=/portal/wa/connect" className="inline-flex rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold">
          Sign in
        </Link>
      </div>
    );
  }

  if (session.connected) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
        {session.companyName} is already connected to WhatsApp Business.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="font-bricolage text-xl font-bold text-slate-900">Connect WhatsApp Business</h2>
        <p className="text-sm text-slate-600 mt-1">
          Continue with Facebook only to import your WhatsApp Business account. You will not type WABA or phone IDs.
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <p className="font-semibold text-slate-900">{session.companyName}</p>
        <p className="text-slate-500">{session.email}</p>
      </div>
      <button type="button" disabled={busy} onClick={connect} className="w-full rounded-xl bg-indigo-600 text-white py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60">
        {busy ? 'Connecting…' : 'Continue with Facebook'}
      </button>
    </div>
  );
}
