'use client';

import { useEffect, useState } from 'react';
import { Btn, Card, Field, MetricCard, PageTitle, inputClass } from '@/components/ui';
import { StatusBanner } from '@/components/StatusBanner';
import { api } from '@/lib/api-client';

export default function CostsPage() {
  const [callsPerDay, setCallsPerDay] = useState(200);
  const [marketing, setMarketing] = useState(10000);
  const [utility, setUtility] = useState(6000);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  async function load() {
    const qs = new URLSearchParams({
      callsPerDay: String(callsPerDay),
      marketingTemplates: String(marketing),
      utilityTemplates: String(utility),
    });
    const body = await api(`/api/v1/costs?${qs}`);
    setData(body);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div>
      <PageTitle
        title="Cost & Capacity"
        subtitle="Indicative monthly estimates for AI voice, WhatsApp, docs and platform — planning only."
        actions={<Btn onClick={() => load()}>Recalculate</Btn>}
      />
      <StatusBanner tone="warn">{data?.disclaimer || 'Estimates are not commercial quotes.'}</StatusBanner>

      <Card className="mb-4 grid gap-3 p-4 md:grid-cols-3">
        <Field label="AI calls / day">
          <input className={inputClass} type="number" value={callsPerDay} onChange={(e) => setCallsPerDay(Number(e.target.value))} />
        </Field>
        <Field label="WhatsApp marketing templates / month">
          <input className={inputClass} type="number" value={marketing} onChange={(e) => setMarketing(Number(e.target.value))} />
        </Field>
        <Field label="WhatsApp utility templates / month">
          <input className={inputClass} type="number" value={utility} onChange={(e) => setUtility(Number(e.target.value))} />
        </Field>
      </Card>

      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="Voice (INR/mo)" value={`₹${data.monthly.voiceInr.toLocaleString('en-IN')}`} hint={`${data.monthly.minutes} min`} />
            <MetricCard label="WhatsApp (INR/mo)" value={`₹${data.monthly.whatsappInr.toLocaleString('en-IN')}`} />
            <MetricCard label="Docs/storage" value={`₹${data.monthly.documentsInr.toLocaleString('en-IN')}`} />
            <MetricCard label="Platform" value={`₹${data.monthly.platformInr.toLocaleString('en-IN')}`} />
            <MetricCard label="Total (ex-GST)" value={`₹${data.monthly.totalInr.toLocaleString('en-IN')}`} tone="ok" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="p-4 text-sm">
              <h3 className="font-semibold">Assumptions (editable via API)</h3>
              <ul className="mt-3 space-y-1 text-slate-600">
                <li>Blended AI voice: ₹{data.assumptions.voiceBlendedPerMin}/min</li>
                <li>WA marketing: ₹{data.assumptions.whatsappMarketing}/msg</li>
                <li>WA utility: ₹{data.assumptions.whatsappUtility}/msg</li>
                <li>Avg call length: {data.assumptions.avgCallMinutes} min</li>
              </ul>
            </Card>
            <Card className="p-4 text-sm">
              <h3 className="font-semibold">Concurrent capacity</h3>
              <p className="mt-2 text-slate-600">
                App max concurrency: <b>{data.capacity.maxConcurrency}</b>
              </p>
              <p className="mt-2 text-slate-500">{data.capacity.note}</p>
              <p className="mt-3 text-slate-500">
                Pilot 5 · Growth 25 · Scale 100+ channels (limited by your IVR contract).
              </p>
            </Card>
          </div>
        </>
      ) : (
        <p className="text-slate-500">Loading estimates…</p>
      )}
    </div>
  );
}
