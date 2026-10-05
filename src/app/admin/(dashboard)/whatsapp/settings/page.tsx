'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminTabs from '@/components/admin/AdminTabs';
import AIProviderPanel from '@/components/admin/whatsapp/AIProviderPanel';
import KnowledgeBasePanel from '@/components/admin/whatsapp/KnowledgeBasePanel';
import type { AISettings } from '@/lib/whatsapp/types';

type TabId = 'provider' | 'behaviour' | 'knowledge' | 'conversation';

const TABS = [
  { id: 'provider', label: 'AI Provider' },
  { id: 'behaviour', label: 'Assistant Behaviour' },
  { id: 'knowledge', label: 'Knowledge Base' },
  { id: 'conversation', label: 'Conversation Settings' },
];

function WhatsAppSettingsInner() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabId>('provider');
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = searchParams?.get('tab');
    if (next && TABS.some((item) => item.id === next)) setTab(next as TabId);
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/admin/ai/settings')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setSettings(body.settings);
        setStatus(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setSettings(body);
      setMessage('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const whatsapp = (status?.whatsapp || {}) as Record<string, unknown>;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md">
            <Icon name="Cog6ToothIcon" size={22} />
          </div>
          <div>
            <h1 className="font-bricolage text-2xl font-bold text-slate-900">AI Settings</h1>
            <p className="text-sm text-slate-500">Configure AI providers, assistant behaviour and conversation settings for WhatsApp.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTab('knowledge')}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          <Icon name="BookOpenIcon" size={16} />
          View Documentation
        </button>
      </div>

      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {whatsapp.receiving === false && (
        <AdminAlert variant="error">
          Meta is not subscribed to the <strong>messages</strong> webhook, so AI never sees incoming chats. Callback URL:{' '}
          <code>https://techantum.com/api/webhooks/whatsapp</code>
        </AdminAlert>
      )}

      <AdminTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === 'provider' && <AIProviderPanel />}

      {tab === 'behaviour' && settings && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">Assistant behaviour</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.ai_enabled} onChange={(e) => setSettings({ ...settings, ai_enabled: e.target.checked })} />
              AI enabled
            </label>
            <AdminField label="Default conversation mode">
              <select className={adminSelectClass} value={settings.default_mode} onChange={(e) => setSettings({ ...settings, default_mode: e.target.value as AISettings['default_mode'] })}>
                <option value="AI">AI</option>
                <option value="HYBRID">Hybrid</option>
                <option value="HUMAN">Human</option>
              </select>
            </AdminField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.auto_handoff} onChange={(e) => setSettings({ ...settings, auto_handoff: e.target.checked })} />
              Automatic human handoff
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.auto_lead_creation} onChange={(e) => setSettings({ ...settings, auto_lead_creation: e.target.checked })} />
              Automatic lead creation
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={settings.auto_conversation_summary} onChange={(e) => setSettings({ ...settings, auto_conversation_summary: e.target.checked })} />
              Automatic conversation summary
            </label>
            <AdminField label="Handoff mode">
              <select className={adminSelectClass} value={settings.handoff_mode} onChange={(e) => setSettings({ ...settings, handoff_mode: e.target.value as 'HUMAN' | 'HYBRID' })}>
                <option value="HUMAN">Human</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </AdminField>
            <AdminField label="Knowledge retrieval limit">
              <input type="number" min={1} max={20} className={adminInputClass} value={settings.knowledge_retrieval_limit} onChange={(e) => setSettings({ ...settings, knowledge_retrieval_limit: Number(e.target.value) })} />
            </AdminField>
            <AdminField label="Fallback message" span={2}>
              <textarea className={adminTextareaClass} rows={2} value={settings.fallback_message} onChange={(e) => setSettings({ ...settings, fallback_message: e.target.value })} />
            </AdminField>
            <AdminField label="Out-of-scope message" span={2}>
              <textarea className={adminTextareaClass} rows={2} value={settings.out_of_scope_message} onChange={(e) => setSettings({ ...settings, out_of_scope_message: e.target.value })} />
            </AdminField>
          </div>
          <AdminButton variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save behaviour'}</AdminButton>
        </section>
      )}

      {tab === 'knowledge' && <KnowledgeBasePanel />}

      {tab === 'conversation' && settings && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-slate-900">Conversation settings</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <AdminField label="Max response length">
              <input type="number" min={100} max={2000} className={adminInputClass} value={settings.max_response_length} onChange={(e) => setSettings({ ...settings, max_response_length: Number(e.target.value) })} />
            </AdminField>
            <AdminField label="After-hours message" span={2}>
              <textarea className={adminTextareaClass} rows={2} value={settings.after_hours_message} onChange={(e) => setSettings({ ...settings, after_hours_message: e.target.value })} />
            </AdminField>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input type="checkbox" checked={settings.followup_enabled !== false} onChange={(e) => setSettings({ ...settings, followup_enabled: e.target.checked })} />
              Send follow-up messages automatically
            </label>
            <AdminField label="First follow-up after">
              <select className={adminSelectClass} value={settings.followup_first_hours === 24 ? 24 : 12} onChange={(e) => setSettings({ ...settings, followup_first_hours: Number(e.target.value) })}>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </AdminField>
            <AdminField label="Second follow-up after">
              <select className={adminSelectClass} value={settings.followup_second_hours || 20} onChange={(e) => setSettings({ ...settings, followup_second_hours: Number(e.target.value) })}>
                <option value={20}>20 hours (recommended)</option>
                <option value={24}>24 hours</option>
                <option value={0}>No second follow-up</option>
              </select>
            </AdminField>
            <AdminField label="Maximum follow-ups per chat">
              <select className={adminSelectClass} value={settings.followup_max || 2} onChange={(e) => setSettings({ ...settings, followup_max: Number(e.target.value) })}>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </AdminField>
          </div>
          <AdminButton variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save conversation settings'}</AdminButton>
        </section>
      )}
    </div>
  );
}

export default function WhatsAppSettingsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-slate-500">Loading settings…</p>}>
      <WhatsAppSettingsInner />
    </Suspense>
  );
}
