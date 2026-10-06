'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { embeddedSignupStartPath } from '@/lib/whatsapp-provider/embedded-signup';
import { PortalModal } from './portal-ui';

type Session = { appId?: string; graphVersion?: string; configId?: string };
type Pending = { phoneNumberId: string; display: string };

const PENDING_KEY = 'wa_pending_phone_verify';

export default function AddWhatsAppNumberDialog({
  session,
  onClose,
  onDone,
  resume,
}: {
  session: Session;
  onClose: () => void;
  onDone: () => void;
  resume?: Pending | null;
}) {
  const [mode, setMode] = useState<'choose' | 'manual' | 'verify'>(resume?.phoneNumberId ? 'verify' : 'choose');
  const [cc, setCc] = useState('91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verifiedName, setVerifiedName] = useState('');
  const [pending, setPending] = useState<Pending | null>(resume || null);
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [method, setMethod] = useState<'SMS' | 'VOICE'>('SMS');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(resume?.phoneNumberId ? `Continue verification for ${resume.display}.` : '');
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (resume?.phoneNumberId) {
      setPending(resume);
      setMode('verify');
    }
  }, [resume?.phoneNumberId, resume?.display]);

  const savePending = (next: Pending | null) => {
    setPending(next);
    if (next) window.sessionStorage.setItem(PENDING_KEY, JSON.stringify(next));
    else window.sessionStorage.removeItem(PENDING_KEY);
  };

  const run = async (fn: () => Promise<void>, key: string) => {
    setBusy(key);
    setError('');
    try {
      await fn();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Something went wrong.';
      setError(text);
      if (/1 hour|temporarily unavailable|locked verification/i.test(text)) setLocked(true);
    } finally {
      setBusy('');
    }
  };

  const addWithMeta = () => {
    window.location.assign(embeddedSignupStartPath('new', 'hosted'));
  };

  const addManual = () =>
    run(async () => {
      const res = await fetch('/api/portal/wa/phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', cc, phoneNumber, verifiedName }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Meta could not add that number.');
      const phoneId = String(body.phoneNumberId || body.phone?.id || '');
      const display = String(body.phone?.display_phone_number || `+${cc}${phoneNumber}`);
      if (!phoneId) throw new Error('Meta created the number but did not return a phone ID. Use Add with Meta.');
      savePending({ phoneNumberId: phoneId, display });
      onDone();
      if (body.alreadyVerified) {
        setMessage(`${display} is already verified on Meta. Register it with a 6-digit PIN only if Cloud API is not live yet.`);
      } else {
        setMessage(`${display} was added in Meta. Send one verification code, then wait if Meta locks the number.`);
      }
      setMode('verify');
    }, 'add');

  const requestCode = () =>
    run(async () => {
      if (locked) throw new Error('Meta is still cooling down. Wait about 1 hour, or add the number with Meta.');
      if (!pending?.phoneNumberId) throw new Error('Meta has not returned a phone number ID yet.');
      const res = await fetch('/api/portal/wa/phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_code', phoneNumberId: pending.phoneNumberId, method }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Meta could not send the code.');
      if (body.alreadyVerified) {
        setMessage(`${pending.display} is already verified. Enter the two-step PIN only if you still need to register Cloud API.`);
        return;
      }
      setMessage(`Verification code sent by ${method} to ${pending.display}.`);
    }, 'code');

  const verify = () =>
    run(async () => {
      if (!pending?.phoneNumberId) throw new Error('Meta has not returned a phone number ID yet.');
      const res = await fetch('/api/portal/wa/phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', phoneNumberId: pending.phoneNumberId, code }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Meta could not verify that code.');
      setMessage('Number verified. Register it with a 6-digit two-step PIN.');
    }, 'verify');

  const register = () =>
    run(async () => {
      if (!pending?.phoneNumberId) throw new Error('Meta has not returned a phone number ID yet.');
      const res = await fetch('/api/portal/wa/phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register', phoneNumberId: pending.phoneNumberId, pin }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Meta could not register that number.');
      savePending(null);
      onDone();
      onClose();
    }, 'register');

  return (
    <PortalModal title="Add WhatsApp Number" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">
        Add another phone number to the WhatsApp Business Account Meta already issued. Prefer Add with Meta — that is the same flow as Business Manager and avoids SMS lockouts.
      </p>
      {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      {mode === 'choose' ? (
        <div className="space-y-3">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={addWithMeta}
            className="flex w-full items-center justify-between rounded-2xl border border-secondary/30 bg-orange-50/50 px-4 py-4 text-left hover:border-secondary"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">Add with Meta</span>
              <span className="mt-1 block text-xs text-slate-500">Recommended. Open Meta to attach an existing or new number to your WABA.</span>
            </span>
            <Icon name="ArrowRightIcon" size={16} className="text-secondary" />
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-4 text-left hover:border-secondary"
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">Enter a number</span>
              <span className="mt-1 block text-xs text-slate-500">Meta will SMS or call the number. If WhatsApp is already on that SIM, use Add with Meta instead.</span>
            </span>
            <Icon name="ArrowRightIcon" size={16} className="text-secondary" />
          </button>
        </div>
      ) : null}

      {mode === 'manual' ? (
        <div className="space-y-3">
          <div className="grid grid-cols-[88px_1fr] gap-2">
            <input value={cc} onChange={(e) => setCc(e.target.value.replace(/\D/g, ''))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="91" />
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Phone number" />
          </div>
          <input value={verifiedName} onChange={(e) => setVerifiedName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Verified display name (required by Meta)" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('choose')} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
              Back
            </button>
            <button type="button" disabled={Boolean(busy) || !phoneNumber || !verifiedName.trim()} onClick={addManual} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy === 'add' ? 'Adding…' : 'Add number'}
            </button>
          </div>
        </div>
      ) : null}

      {mode === 'verify' ? (
        <div className="space-y-3">
          {pending?.display ? <p className="text-sm font-medium text-slate-800">{pending.display}</p> : null}
          <div className="flex flex-wrap gap-2">
            {(['SMS', 'VOICE'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMethod(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${method === item ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {item}
              </button>
            ))}
            <button type="button" disabled={Boolean(busy) || locked} onClick={requestCode} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
              {busy === 'code' ? 'Sending…' : locked ? 'Wait 1 hour' : 'Send code'}
            </button>
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Verification code" />
          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="6-digit two-step PIN" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setMode('choose')} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
              Use Add with Meta
            </button>
            <button type="button" disabled={Boolean(busy) || !code} onClick={verify} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
              {busy === 'verify' ? 'Verifying…' : 'Verify'}
            </button>
            <button type="button" disabled={Boolean(busy) || pin.length !== 6} onClick={register} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy === 'register' ? 'Registering…' : 'Register number'}
            </button>
          </div>
        </div>
      ) : null}
    </PortalModal>
  );
}
