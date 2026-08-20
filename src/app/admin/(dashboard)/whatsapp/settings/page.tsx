'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import { OpsOverviewField, OpsPageShell } from '@/components/admin/ops/OpsUi';
import type { AISettings } from '@/lib/whatsapp/types';

export default function WhatsAppSettingsPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  if (!settings) {
    return <p className="text-sm text-muted-foreground p-6">{error || 'Loading…'}</p>;
  }

  const whatsapp = (status?.whatsapp || {}) as Record<string, unknown>;
  const openai = (status?.openai || {}) as Record<string, unknown>;

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="WhatsApp AI Settings"
        description="Control assistant behaviour. API keys remain in server environment variables."
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      {whatsapp.receiving === false && (
        <AdminAlert variant="error">
          Meta is not subscribed to the <strong>messages</strong> webhook, so AI never sees incoming chats.
          Open{' '}
          <a
            className="underline"
            href="https://developers.facebook.com/apps/27686807767646135/whatsapp-business/wa-settings/"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp Configuration
          </a>
          , set Callback URL to <code>https://techantum.com/api/webhooks/whatsapp</code>, then click{' '}
          <strong>Subscribe</strong> next to the <strong>messages</strong> field. Verify token:{' '}
          <code>techantum-wa-verify-2026-xK9mP2</code>. After that, message +91 79892 02678 from a different phone.
        </AdminAlert>
      )}
      <AdminSection title="Connection status">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <OpsOverviewField label="WhatsApp configured">{whatsapp.configured ? 'Yes' : 'No'}</OpsOverviewField>
          <OpsOverviewField label="Display number">{String(whatsapp.display_number || '—')}</OpsOverviewField>
          <OpsOverviewField label="OpenAI configured">{openai.configured ? 'Yes' : 'No'}</OpsOverviewField>
          <OpsOverviewField label="Receiving inbound">{whatsapp.receiving ? 'Yes' : 'No'}</OpsOverviewField>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Webhook URL: <code className="bg-muted px-1 rounded">https://techantum.com/api/webhooks/whatsapp</code>
        </p>
      </AdminSection>

      <AdminSection title="Assistant behaviour">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <AdminField label="Max response length">
            <input type="number" min={100} max={2000} className={adminInputClass} value={settings.max_response_length} onChange={(e) => setSettings({ ...settings, max_response_length: Number(e.target.value) })} />
          </AdminField>
          <AdminField label="Fallback message" span={2}>
            <textarea className={adminTextareaClass} rows={2} value={settings.fallback_message} onChange={(e) => setSettings({ ...settings, fallback_message: e.target.value })} />
          </AdminField>
          <AdminField label="Out-of-scope message" span={2}>
            <textarea className={adminTextareaClass} rows={2} value={settings.out_of_scope_message} onChange={(e) => setSettings({ ...settings, out_of_scope_message: e.target.value })} />
          </AdminField>
          <AdminField label="After-hours message" span={2}>
            <textarea className={adminTextareaClass} rows={2} value={settings.after_hours_message} onChange={(e) => setSettings({ ...settings, after_hours_message: e.target.value })} />
          </AdminField>
        </div>
        <AdminButton variant="primary" className="mt-3" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save settings'}</AdminButton>
      </AdminSection>
    </OpsPageShell>
  );
}
