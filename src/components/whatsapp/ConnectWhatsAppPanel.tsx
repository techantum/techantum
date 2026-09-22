'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

type Waba = { waba_id?: string; name?: string; verification_status?: string; account_status?: string };
type Phone = { display_phone_number?: string; verified_name?: string; quality_rating?: string; registration_status?: string };

type Session = {
  authenticated?: boolean;
  companyName?: string;
  email?: string;
  connected?: boolean;
  error?: string;
  wabas?: Waba[];
  phones?: Phone[];
  templateCount?: number;
};

export default function ConnectWhatsAppPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) setError(params.get('error') || '');
    if (params.get('connected') === '1') setMessage('WhatsApp Business API connected. WABA, phone numbers and templates were imported from Meta.');
    fetch('/api/public/wa-onboard/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        setSession(body);
        if (body?.error) setError(body.error);
      })
      .catch(() => setError('Could not load your workspace.'));
  }, []);

  const startMeta = (mode: 'new' | 'existing') => {
    if (!session?.authenticated) {
      window.location.assign('/login?next=/portal/wa/onboard');
      return;
    }
    window.location.assign(`/api/public/wa-onboard/meta/start?mode=${mode}`);
  };

  if (!session) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Checking your workspace…</div>;
  }

  if (session.connected) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Connected</p>
          <h2 className="font-bricolage text-xl font-bold text-slate-900">WhatsApp Business API</h2>
          <p className="text-sm text-slate-600 mt-1">Imported from Meta for {session.companyName || session.email || 'this workspace'}.</p>
        </div>
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
        <div className="space-y-2">
          {(session.wabas || []).map((waba) => (
            <div key={waba.waba_id || waba.name} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">{waba.name || 'WhatsApp Business Account'}</p>
              <p className="text-slate-500">WABA {waba.waba_id}</p>
              <p className="text-slate-500">{[waba.verification_status, waba.account_status].filter(Boolean).join(' · ')}</p>
            </div>
          ))}
          {(session.phones || []).map((phone) => (
            <div key={phone.display_phone_number} className="rounded-xl border border-slate-200 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">{phone.display_phone_number || 'Phone number'}</p>
              <p className="text-slate-500">{[phone.verified_name, phone.quality_rating, phone.registration_status].filter(Boolean).join(' · ')}</p>
            </div>
          ))}
          <p className="text-sm text-slate-600">{session.templateCount || 0} templates synced from Meta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/wa/phones" className="rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700">
            Phone numbers
          </Link>
          <Link href="/portal/wa/templates" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Templates
          </Link>
          <button type="button" onClick={() => startMeta('existing')} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Connect a different WABA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
      <div>
        <h2 className="font-bricolage text-xl font-bold text-slate-900">Connect with Facebook</h2>
        <p className="text-sm text-slate-600 mt-1">
          Sign in to Facebook with the Meta account that owns the WhatsApp Business Account. TechAntum then fetches the WABA, phone numbers and templates into this portal.
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex gap-2">
          <Icon name="ExclamationCircleIcon" size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}
      {(session.companyName || session.email) && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-900">{session.companyName || 'WhatsApp workspace'}</p>
          <p className="text-slate-500">{session.email}</p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => startMeta('new')}
          className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-left hover:bg-indigo-100"
        >
          <p className="text-sm font-semibold text-indigo-950">I am new to WhatsApp Business API</p>
          <p className="text-xs text-indigo-800 mt-1">Log in with Facebook, add a phone number, and TechAntum imports the new WABA and templates.</p>
        </button>
        <button
          type="button"
          onClick={() => startMeta('existing')}
          className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
        >
          <p className="text-sm font-semibold text-slate-900">I already have a WABA</p>
          <p className="text-xs text-slate-600 mt-1">Log in with Facebook so we can fetch your existing Business account, numbers and templates.</p>
        </button>
      </div>
    </div>
  );
}
