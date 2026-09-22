'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminAlert from '@/components/admin/AdminAlert';
import { ProviderShell, StatusPill } from '@/components/admin/wa-provider/ProviderUi';
const ONBOARDING_STEPS = [
  'Create Client',
  'Client Details',
  'Connect Meta',
  'Select/Create Business Portfolio',
  'Select/Create WABA',
  'Add / Select WhatsApp Phone Number',
  'Verify Number',
  'Register Number',
  'Link WABA',
  'Subscribe Webhooks',
  'Sync Templates',
  'Test Connection',
  'Complete',
];

declare global {
  interface Window {
    FB?: {
      init: (cfg: Record<string, unknown>) => void;
      login: (cb: (res: { authResponse?: { code?: string } }) => void, opts: Record<string, unknown>) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export default function OnboardClientPage() {
  const [form, setForm] = useState({ name: '', legal_name: '', contact_name: '', email: '', phone: '' });
  const [clientId, setClientId] = useState('');
  const [signup, setSignup] = useState<{ appId?: string; configId?: string; graphVersion?: string; configured?: boolean }>({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/admin/wa-provider/signup-config')
      .then((r) => r.json())
      .then(setSignup);
  }, []);

  const create = async () => {
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/wa-provider/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const body = await res.json();
    setBusy(false);
    if (!res.ok) return setError(body.error || 'Failed to create client');
    setClientId(body.id);
    setMessage('Client created. Continue with Meta Embedded Signup.');
    await fetch('/api/admin/wa-provider/onboarding/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: body.id }) });
  };

  const connectMeta = async () => {
    if (!signup.configured || !signup.appId || !signup.configId) {
      setError('Embedded Signup is not configured. Set META_APP_ID, META_APP_SECRET and META_EMBEDDED_SIGNUP_CONFIG_ID.');
      return;
    }
    await loadFacebookSdk(signup.appId, signup.graphVersion || '');
    window.FB?.login(
      async (response) => {
        const code = response.authResponse?.code;
        if (!code) return setError('Meta authorization was cancelled.');
        const session = (window as unknown as { waSignupSession?: Record<string, string> }).waSignupSession || {};
        const res = await fetch('/api/admin/wa-provider/onboarding/embedded-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, code, wabaId: session.waba_id, phoneNumberId: session.phone_number_id, businessId: session.business_id }),
        });
        const body = await res.json();
        if (!res.ok) return setError(body.error || 'Onboarding failed');
        setMessage('WhatsApp connected. WABA, phone and templates were synced server-side.');
      },
      {
        config_id: signup.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: '3' },
      }
    );
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.includes('facebook.com')) return;
      try {
        const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (payload?.type === 'WA_EMBEDDED_SIGNUP') {
          (window as unknown as { waSignupSession?: Record<string, string> }).waSignupSession = payload.data || payload;
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <ProviderShell>
      <AdminPageHeader title="Onboard Client" description="Create the client record, then connect WhatsApp through Meta Embedded Signup. Tokens never leave the server after exchange." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {message && <AdminAlert variant="success">{message}</AdminAlert>}

      <AdminSection title="1. Create client">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries({ name: 'Client name', legal_name: 'Legal / business name', contact_name: 'Contact person', email: 'Email', phone: 'Phone' }).map(([key, label]) => (
            <AdminField key={key} label={label}>
              <input className={adminInputClass} value={(form as Record<string, string>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </AdminField>
          ))}
        </div>
        <AdminButton variant="primary" disabled={busy || !form.name} onClick={create}>
          Create client
        </AdminButton>
      </AdminSection>

      <AdminSection title="2. Connect WhatsApp">
        <p className="text-sm text-slate-600">Launches Meta Embedded Signup. After the client finishes, we store Business, WABA and phone IDs, subscribe webhooks, sync templates and run a health check.</p>
        <AdminButton variant="primary" disabled={!clientId} onClick={connectMeta}>
          Connect WhatsApp
        </AdminButton>
      </AdminSection>

      <AdminSection title="Onboarding checklist">
        <ol className="space-y-2">
          {ONBOARDING_STEPS.map((step, index) => (
            <li key={step} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-sm">
                {index + 1}. {step}
              </span>
              <StatusPill value={index === 0 && clientId ? 'COMPLETED' : clientId && index < 3 ? 'IN PROGRESS' : 'PENDING'} />
            </li>
          ))}
        </ol>
      </AdminSection>
    </ProviderShell>
  );
}

function loadFacebookSdk(appId: string, version: string) {
  return new Promise<void>((resolve) => {
    if (window.FB) return resolve();
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: true, version });
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    document.body.appendChild(script);
  });
}
