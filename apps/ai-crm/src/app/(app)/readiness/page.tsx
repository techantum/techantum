'use client';

import { useEffect, useState } from 'react';
import { Badge, Btn, Card, PageTitle } from '@/components/ui';
import { api } from '@/lib/api-client';

export default function ReadinessPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [owner, setOwner] = useState('');
  const [contact, setContact] = useState('');

  async function load() {
    const body = await api('/api/v1/readiness');
    setData(body);
    setOwner(body.items ? '' : '');
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!data) return <p className="text-slate-500">Checking readiness…</p>;

  return (
    <div>
      <PageTitle
        title="Go-live readiness"
        subtitle={`${data.readyCount} ready · ${data.pendingCount} still open. Items marked “you” need an account, key, or approval.`}
        actions={
          <Btn
            variant="secondary"
            onClick={async () => {
              await api('/api/v1/retention/run', { method: 'POST' });
              await load();
            }}
          >
            Run retention purge
          </Btn>
        }
      />
      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-2">
        <label className="text-sm">
          Service owner
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={owner} onChange={(e) => setOwner(e.target.value)} />
        </label>
        <label className="text-sm">
          Incident contact
          <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" value={contact} onChange={(e) => setContact(e.target.value)} />
        </label>
        <div>
          <Btn
            onClick={async () => {
              await api('/api/v1/readiness', {
                method: 'PATCH',
                body: JSON.stringify({ opsProfile: { serviceOwner: owner, incidentContact: contact, pricingConfirmed: false } }),
              });
              await load();
            }}
          >
            Save ownership
          </Btn>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Area</th>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">What to do</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: any) => (
              <tr key={item.id} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">{item.area}</td>
                <td className="px-4 py-3 font-medium">{item.item}</td>
                <td className="px-4 py-3">
                  <Badge tone={item.status === 'ready' ? 'green' : item.status === 'partial' ? 'amber' : 'rose'}>{item.status}</Badge>
                </td>
                <td className="px-4 py-3 capitalize">{item.owner}</td>
                <td className="px-4 py-3 text-slate-600">{item.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
