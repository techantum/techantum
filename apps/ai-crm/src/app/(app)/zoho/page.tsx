'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Badge, Btn, Card, Field, PageTitle, inputClass } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

export default function ZohoPage() {
  const [connection, setConnection] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [importJson, setImportJson] = useState('{\n  "id": "ZCRM123",\n  "Last_Name": "Imported Lead",\n  "Phone": "9888877777",\n  "Email": "zoho@example.com",\n  "Lead_Source": "Website"\n}');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [z, leadRes] = await Promise.all([api('/api/v1/zoho'), api('/api/v1/leads?pageSize=50')]);
    setConnection(z.connection);
    setLogs(z.logs || []);
    setLeads(leadRes.items || []);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function saveConnection(e: FormEvent) {
    e.preventDefault();
    await api('/api/v1/zoho', {
      method: 'PATCH',
      body: JSON.stringify({
        apiDomain: connection?.api_domain || 'https://www.zohoapis.in',
        accountsDomain: connection?.accounts_domain || 'https://accounts.zoho.in',
        fieldMap: connection?.field_map || {},
      }),
    });
    setMessage('Zoho connection settings saved. Add CRM_ZOHO_* secrets in .env for live sync.');
    await load();
  }

  async function importLead(e: FormEvent) {
    e.preventDefault();
    const record = JSON.parse(importJson);
    await api('/api/v1/zoho', { method: 'POST', body: JSON.stringify({ action: 'import', record }) });
    setMessage('Zoho lead imported into CRM (deduped).');
    await load();
  }

  async function pushLead(leadId: string) {
    const res = await api('/api/v1/zoho', { method: 'POST', body: JSON.stringify({ action: 'push', leadId }) });
    setMessage(res.queued ? 'Queued offline (Zoho credentials missing)' : `Synced to Zoho ${res.zohoId || ''}`);
    await load();
  }

  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div>
      <PageTitle
        title="Zoho CRM Sync"
        subtitle="Zoho remains the system of record. This CRM imports leads, pushes outcomes, and keeps interaction history aligned."
      />
      <StatusBanner tone={connection?.credentialsPresent ? 'ok' : 'warn'}>
        {connection?.credentialsPresent
          ? 'Zoho OAuth credentials detected in environment.'
          : 'Set CRM_ZOHO_CLIENT_ID, CRM_ZOHO_CLIENT_SECRET, CRM_ZOHO_REFRESH_TOKEN in apps/ai-crm/.env for live sync. Import/push still works offline-queued.'}
      </StatusBanner>
      {message ? <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-semibold">Connection</h3>
          <form onSubmit={saveConnection} className="mt-3 space-y-3">
            <div className="flex gap-2">
              <Badge tone={connection?.credentialsPresent ? 'green' : 'amber'}>{connection?.status || '…'}</Badge>
              <Badge tone="purple">{connection?.api_domain || 'zohoapis.in'}</Badge>
            </div>
            <Field label="API domain">
              <input
                className={inputClass}
                value={connection?.api_domain || ''}
                onChange={(e) => setConnection({ ...connection, api_domain: e.target.value })}
              />
            </Field>
            <Btn type="submit">Save mapping</Btn>
          </form>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Import Zoho leads → CRM (dedupe by phone/email/external id)</li>
            <li>Push qualification, call disposition, notes back to Zoho</li>
            <li>WhatsApp/AI call workflows can trigger after Zoho import</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold">Import Zoho lead JSON</h3>
          <form onSubmit={importLead} className="mt-3 space-y-3">
            <textarea className={`${inputClass} min-h-[180px] font-mono text-xs`} value={importJson} onChange={(e) => setImportJson(e.target.value)} />
            <Btn type="submit">Import into CRM</Btn>
          </form>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 font-semibold">Push CRM leads to Zoho</div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-auto text-sm">
            {leads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 px-4 py-2">
                <div>
                  <div className="font-medium">{l.full_name}</div>
                  <div className="text-[11px] text-slate-400">zoho: {l.zoho_id || '—'} · {l.qualification_status}</div>
                </div>
                <Btn variant="secondary" onClick={() => pushLead(l.id)}>
                  Push
                </Btn>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold">Sync logs</h3>
          <ul className="mt-3 max-h-80 space-y-2 overflow-auto text-sm">
            {logs.map((log) => (
              <li key={log.id} className="rounded-xl border border-slate-100 p-2">
                <div className="flex justify-between gap-2">
                  <span>
                    {log.direction} · {log.entity_type}
                  </span>
                  <Badge tone={log.status === 'synced' || log.status === 'imported' ? 'green' : 'amber'}>{log.status}</Badge>
                </div>
                <div className="text-[11px] text-slate-400">{new Date(log.created_at).toLocaleString()}</div>
                {log.error ? <div className="text-xs text-rose-600">{log.error}</div> : null}
              </li>
            ))}
            {!logs.length ? <li className="text-slate-400">No sync logs yet</li> : null}
          </ul>
        </Card>
      </div>
    </div>
  );
}
