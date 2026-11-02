'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Badge, Btn, Card, Field, PageTitle, inputClass } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

const SECTIONS = [
  'Workspace & business',
  'Roles & permissions',
  'Calling limits',
  'Consent & compliance',
  'Provider connections',
  'IVR & Zoho',
];

export default function SettingsPage() {
  const [section, setSection] = useState('Calling limits');
  const [settings, setSettings] = useState<any>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [providers, setProviders] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState({
    allowedHours: '09:00-19:00',
    days: 'Mon-Sat',
    maxConcurrency: 5,
    maxRetries: 2,
    retryIntervalHours: 4,
    maxDurationMinutes: 6,
  });

  async function load() {
    const [ws, integ, u] = await Promise.all([
      api('/api/v1/settings'),
      api('/api/v1/integrations'),
      api('/api/v1/users').catch(() => []),
    ]);
    setSettings(ws.settings);
    setWorkspace(ws.workspace);
    setPolicy({ ...policy, ...(ws.settings?.calling_policy || {}) });
    setIntegrations(integ);
    setProviders(integ.liveReadiness || {});
    setUsers(Array.isArray(u) ? u : []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function savePolicy(e: FormEvent) {
    e.preventDefault();
    try {
      const body = await api('/api/v1/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          businessName: settings?.business_name,
          timezone: settings?.timezone || 'Asia/Kolkata',
          currency: settings?.currency || 'INR',
          callingPolicy: policy,
        }),
      });
      setSettings(body.settings);
      setMessage('Settings saved to database.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!settings) return <p className="text-slate-500">Loading settings…</p>;

  return (
    <div>
      <PageTitle title="Settings & Integrations" subtitle="Workspace governance and provider configuration backed by the CRM database." />
      <StatusBanner tone="info">
        Using the CRM database (schema <b>crm</b>). Secrets stay server-side and are never rendered.
      </StatusBanner>
      {message ? <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="p-2">
          {SECTIONS.map((item) => (
            <button
              key={item}
              onClick={() => setSection(item)}
              className={`mb-0.5 block w-full rounded-xl px-3 py-2 text-left text-sm ${
                section === item ? 'bg-secondary text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item}
            </button>
          ))}
        </Card>

        <div className="space-y-4">
          {(section === 'Calling limits' || section === 'Consent & compliance' || section === 'Workspace & business') && (
            <Card className="p-4">
              <h3 className="font-semibold">{section}</h3>
              <form onSubmit={savePolicy} className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label="Business name">
                  <input
                    className={inputClass}
                    value={settings.business_name || ''}
                    onChange={(e) => setSettings({ ...settings, business_name: e.target.value })}
                  />
                </Field>
                <Field label="Timezone">
                  <input
                    className={inputClass}
                    value={settings.timezone || 'Asia/Kolkata'}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  />
                </Field>
                <Field label="Allowed hours">
                  <input className={inputClass} value={policy.allowedHours} onChange={(e) => setPolicy({ ...policy, allowedHours: e.target.value })} />
                </Field>
                <Field label="Days">
                  <input className={inputClass} value={policy.days} onChange={(e) => setPolicy({ ...policy, days: e.target.value })} />
                </Field>
                <Field label="Max concurrency">
                  <input
                    type="number"
                    className={inputClass}
                    value={policy.maxConcurrency}
                    onChange={(e) => setPolicy({ ...policy, maxConcurrency: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Max retries">
                  <input
                    type="number"
                    className={inputClass}
                    value={policy.maxRetries}
                    onChange={(e) => setPolicy({ ...policy, maxRetries: Number(e.target.value) })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Btn type="submit">Save to database</Btn>
                </div>
              </form>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3 font-semibold">Provider connections</div>
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Service</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Database', true],
                  ['WhatsApp Business API', providers.whatsapp || integrations?.liveReadiness?.whatsapp],
                  ['LLM provider', providers.llm || integrations?.liveReadiness?.llm],
                  ['Telephony / IVR', providers.telephony || integrations?.liveReadiness?.telephony],
                  ['Zoho CRM OAuth', integrations?.liveReadiness?.zoho],
                  ['Google Ads webhook key', integrations?.liveReadiness?.googleAds],
                ].map(([name, ready]) => (
                  <tr key={String(name)} className="border-t border-slate-100">
                    <td className="px-4 py-2">{name}</td>
                    <td className="px-4 py-2">
                      <Badge tone={ready ? 'green' : 'amber'}>{ready ? 'Connected / present' : 'Not configured'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {(section === 'IVR & Zoho' || section === 'Provider connections') && (
            <Card className="space-y-3 p-4 text-sm text-slate-600">
              <h3 className="font-semibold text-slate-900">IVR / telephony prerequisites</h3>
              <p>
                Set <code>CRM_TELEPHONY_BASE_URL</code>, <code>CRM_TELEPHONY_API_KEY</code>, optional secret, transfer queue, and
                <code>CRM_MAX_CONCURRENCY</code>. Webhook:{' '}
                <code>/api/v1/webhooks/telephony</code>. Demo outbound stays blocked until these are present.
              </p>
              <h3 className="font-semibold text-slate-900">Zoho CRM</h3>
              <p>
                Set <code>CRM_ZOHO_CLIENT_ID</code>, <code>CRM_ZOHO_CLIENT_SECRET</code>, <code>CRM_ZOHO_REFRESH_TOKEN</code>. Manage sync on the Zoho page.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/zoho" className="rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-white">
                  Open Zoho sync
                </Link>
                <Link href="/costs" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                  Cost & capacity
                </Link>
                <Link href="/calls" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                  Campaigns / AI calls
                </Link>
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="font-semibold">Workspace users</h3>
            <div className="mt-2 text-sm text-slate-500">
              {workspace?.name} · {workspace?.slug}
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {users.map((u) => (
                <li key={u.id} className="flex justify-between rounded-xl border border-slate-100 px-3 py-2">
                  <span>
                    {u.full_name} · {u.email}
                  </span>
                  <Badge tone="purple">{u.role}</Badge>
                </li>
              ))}
              {!users.length ? <li className="text-slate-400">No users loaded</li> : null}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
