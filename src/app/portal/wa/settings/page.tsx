'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { embeddedSignupStartPath } from '@/lib/whatsapp-provider/embedded-signup';
import { HelpCard } from '@/components/whatsapp/portal-ui';

export default function PortalSettingsPage() {
  const [session, setSession] = useState<any>({});
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    fetch('/api/public/wa-onboard/session', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => {
        setSession(body);
        setCompanyName(body.companyName || '');
        setWebsite(body.website || '');
        setIndustry(body.businessCategory || '');
      });
  };

  useEffect(load, []);

  const save = async () => {
    setBusy('save');
    setError('');
    try {
      const res = await fetch('/api/public/wa-onboard/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, website, businessCategory: industry }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not save account settings.');
      setMessage('Account settings saved.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy('');
    }
  };

  const requestAccess = () => {
    window.location.assign(embeddedSignupStartPath('existing', 'hosted'));
  };

  const sync = async () => {
    setBusy('sync');
    setError('');
    try {
      const res = await fetch('/api/portal/wa/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not sync from Meta.');
      setMessage('Numbers, templates and account data refreshed from Meta.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Account Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Update your workspace profile and request Meta access for WhatsApp Business API features.</p>
        </div>
        {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        {message ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Business profile</p>
          <div className="mt-4 space-y-3">
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Business name" />
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Website" />
            <input value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Industry" />
            <button type="button" disabled={Boolean(busy)} onClick={save} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy === 'save' ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Meta access</p>
          <p className="mt-1 text-sm text-slate-500">Request WhatsApp Business Management permissions and refresh numbers, templates, and quality from Meta.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={Boolean(busy)} onClick={requestAccess} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              <Icon name="LockClosedIcon" size={14} />
              {busy === 'meta' ? 'Requesting…' : 'Request Meta access'}
            </button>
            <button type="button" disabled={Boolean(busy)} onClick={sync} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-60">
              {busy === 'sync' ? 'Syncing…' : 'Sync from Meta'}
            </button>
          </div>
        </div>
      </div>
      <HelpCard />
    </div>
  );
}
