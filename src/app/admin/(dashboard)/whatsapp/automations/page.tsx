'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import type { AISettings } from '@/lib/whatsapp/types';

const FOLLOWUP_PREVIEW = {
  first: 'Good morning {name}.\n\nJust following up. Are you looking for a website, web application or mobile application?',
  second: 'Good afternoon {name}.\n\nJust checking again — would you like a website, a web application or a mobile application?',
};

export default function WhatsAppAutomationMessagesPage() {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/ai/settings')
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load');
        setSettings(body.settings);
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
        body: JSON.stringify({
          fallback_message: settings.fallback_message,
          out_of_scope_message: settings.out_of_scope_message,
          after_hours_message: settings.after_hours_message,
          followup_enabled: settings.followup_enabled,
          followup_first_hours: settings.followup_first_hours,
          followup_second_hours: settings.followup_second_hours,
          followup_max: settings.followup_max,
          followup_start_hour: settings.followup_start_hour,
          followup_end_hour: settings.followup_end_hour,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setSettings(body);
      setMessage('Automation messages saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Automation Messages"
        description="Manage the WhatsApp AI follow-up, fallback and after-hours messages that go out automatically."
        action={
          <AdminButton variant="primary" disabled={saving || !settings} onClick={save}>
            {saving ? 'Saving…' : 'Save messages'}
          </AdminButton>
        }
      />

      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      {!settings ? (
        <p className="text-sm text-slate-500">Loading automation messages…</p>
      ) : (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bricolage text-lg font-semibold text-slate-900">Follow-up automation</h2>
                <p className="text-sm text-slate-500">Techantum sends these when a lead goes quiet inside the WhatsApp session window.</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.followup_enabled !== false}
                  onChange={(e) => setSettings({ ...settings, followup_enabled: e.target.checked })}
                />
                Automatic follow-ups
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AdminField label="First follow-up after">
                <select
                  className={adminSelectClass}
                  value={settings.followup_first_hours === 24 ? 24 : 12}
                  onChange={(e) => setSettings({ ...settings, followup_first_hours: Number(e.target.value) })}
                >
                  <option value={12}>12 hours</option>
                  <option value={24}>24 hours</option>
                </select>
              </AdminField>
              <AdminField label="Second follow-up after">
                <select
                  className={adminSelectClass}
                  value={settings.followup_second_hours || 20}
                  onChange={(e) => setSettings({ ...settings, followup_second_hours: Number(e.target.value) })}
                >
                  <option value={20}>20 hours (recommended)</option>
                  <option value={24}>24 hours</option>
                  <option value={0}>No second follow-up</option>
                </select>
              </AdminField>
              <AdminField label="Maximum follow-ups">
                <select
                  className={adminSelectClass}
                  value={settings.followup_max || 2}
                  onChange={(e) => setSettings({ ...settings, followup_max: Number(e.target.value) })}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </AdminField>
              <AdminField label="Send window (IST)">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className={adminInputClass}
                    value={settings.followup_start_hour ?? 9}
                    onChange={(e) => setSettings({ ...settings, followup_start_hour: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    min={1}
                    max={24}
                    className={adminInputClass}
                    value={settings.followup_end_hour ?? 20}
                    onChange={(e) => setSettings({ ...settings, followup_end_hour: Number(e.target.value) })}
                  />
                </div>
              </AdminField>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">First follow-up</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{FOLLOWUP_PREVIEW.first}</p>
                <p className="mt-3 text-xs text-slate-500">Personalized from the live chat. Name and service are filled in automatically.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Second follow-up</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{FOLLOWUP_PREVIEW.second}</p>
                <p className="mt-3 text-xs text-slate-500">Sent only if the first follow-up still has no reply.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="font-bricolage text-lg font-semibold text-slate-900">Automated replies</h2>
              <p className="text-sm text-slate-500">These messages are sent by the assistant without a staff reply.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <AdminField label="Fallback message" hint="Used when the assistant cannot answer from knowledge.">
                <textarea
                  className={adminTextareaClass}
                  rows={3}
                  value={settings.fallback_message}
                  onChange={(e) => setSettings({ ...settings, fallback_message: e.target.value })}
                />
              </AdminField>
              <AdminField label="Out-of-scope message" hint="Used when the request is outside Techantum services.">
                <textarea
                  className={adminTextareaClass}
                  rows={3}
                  value={settings.out_of_scope_message}
                  onChange={(e) => setSettings({ ...settings, out_of_scope_message: e.target.value })}
                />
              </AdminField>
              <AdminField label="After-hours message" hint="Used when a visitor writes outside business hours.">
                <textarea
                  className={adminTextareaClass}
                  rows={3}
                  value={settings.after_hours_message}
                  onChange={(e) => setSettings({ ...settings, after_hours_message: e.target.value })}
                />
              </AdminField>
            </div>
            <AdminButton variant="primary" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save automation messages'}
            </AdminButton>
          </section>
        </>
      )}
    </div>
  );
}
