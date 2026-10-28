'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminAlert from '@/components/admin/AdminAlert';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { useYoutubeAccess, allow } from '@/components/admin/youtube/YoutubeFrame';

export default function HookoohSettingsPage() {
  const access = useYoutubeAccess();
  const allowed = allow(access, 'youtube_research.settings.manage');
  const [enabled, setEnabled] = useState(true);
  const [usage, setUsage] = useState({ conversations: 0, messages: 0, feedback: 0 });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/hookooh/settings')
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load Hookooh settings');
        setEnabled(body.enabled !== false);
        setUsage(body.usage || { conversations: 0, messages: 0, feedback: 0 });
      })
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <PageLoader label="Loading Hookooh…" />;
  if (!allowed) return <AdminAlert variant="error">Only Super Admin can change Hookooh settings.</AdminAlert>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Hookooh</h1>
        <p className="mt-1 text-sm text-slate-500">Your YouTube AI Growth Expert. Super Admin controls availability; Agent Admin manages the knowledge library.</p>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-900">Enable Hookooh</p>
            <p className="text-sm text-slate-500">When off, the floating assistant is hidden for all roles except this settings screen.</p>
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
              setMessage(next ? 'Hookooh is enabled.' : 'Hookooh is disabled.');
            }}
            aria-label="Toggle Hookooh"
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${enabled ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs uppercase text-slate-400">Conversations</p><p className="mt-1 text-2xl font-bold">{usage.conversations}</p></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs uppercase text-slate-400">Messages</p><p className="mt-1 text-2xl font-bold">{usage.messages}</p></div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs uppercase text-slate-400">Feedback</p><p className="mt-1 text-2xl font-bold">{usage.feedback}</p></div>
      </section>
      <p className="text-sm text-slate-600">AI provider and model are configured in Admin → WhatsApp AI → AI Settings. Hookooh uses the same gateway with purpose <code>hookooh_chat</code>.</p>
      <Link href="/youtube/ai-training" className="inline-flex rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white">Open knowledge library</Link>
    </div>
  );
}
