'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminAlert from '@/components/admin/AdminAlert';
import PageLoader from '@/components/admin/youtube/PageLoader';

export default function HookoohSettingsPanel() {
  const [enabled, setEnabled] = useState(true);
  const [usage, setUsage] = useState({ conversations: 0, messages: 0, feedback: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    fetch('/api/hookooh/settings')
      .then(async (response) => {
        const body = await response.json();
        if (response.status === 403) {
          setForbidden(true);
          return;
        }
        if (!response.ok) throw new Error(body.error || 'Could not load Hookooh settings');
        setEnabled(body.enabled !== false);
        setUsage(body.usage || { conversations: 0, messages: 0, feedback: 0 });
      })
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <PageLoader label="Loading Hookooh…" />;
  if (forbidden) return null;

  return (
    <section id="hookooh" className="space-y-4">
      <div>
        <h2 className="font-bricolage text-xl font-bold text-slate-900">Hookooh settings</h2>
        <p className="mt-1 text-sm text-slate-500">Hookooh AI Agent availability. Super Admin controls the assistant; Agent Admin manages the knowledge library.</p>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-900">Enable Hookooh AI Agent</p>
            <p className="text-sm text-slate-500">When off, the floating assistant is hidden for everyone except this settings screen.</p>
          </div>
          <button
            type="button"
            className={`relative h-7 w-12 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}
            onClick={async () => {
              const next = !enabled;
              const response = await fetch('/api/hookooh/settings', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: next }) });
              const body = await response.json();
              if (!response.ok) {
                setError(body.error || 'Could not update');
                return;
              }
              setEnabled(next);
              setMessage(next ? 'Hookooh AI Agent is enabled.' : 'Hookooh AI Agent is disabled.');
            }}
            aria-label="Toggle Hookooh AI Agent"
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${enabled ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs uppercase text-slate-400">Conversations</p><p className="mt-1 text-2xl font-bold">{usage.conversations}</p></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs uppercase text-slate-400">Messages</p><p className="mt-1 text-2xl font-bold">{usage.messages}</p></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs uppercase text-slate-400">Feedback</p><p className="mt-1 text-2xl font-bold">{usage.feedback}</p></div>
      </div>
      <p className="text-sm text-slate-600">AI provider and model are configured in Admin → WhatsApp AI → AI Settings. Hookooh uses purpose <code>hookooh_chat</code>.</p>
      <Link href="/youtube/ai-training" className="inline-flex rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white">Open Hookooh knowledge library</Link>
    </section>
  );
}
