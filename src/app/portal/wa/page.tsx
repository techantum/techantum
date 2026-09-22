'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { StatusPill } from '@/components/admin/wa-provider/ProviderUi';
import { ONBOARDING_STEPS } from '@/lib/whatsapp-provider/config';

export default function PortalDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/portal/wa/dashboard')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Sign in with a client portal user to view this dashboard.');
        setData(body);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  }, []);

  const connected = data?.client?.meta_connection_status === 'CONNECTED';
  const onboardingStatus = data?.client?.onboarding_status || 'CLIENT_CREATED';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-bricolage text-2xl font-bold text-slate-900">{data?.client?.name || 'WhatsApp workspace'}</h1>
        <p className="text-sm text-slate-500">Your organization data only. Other clients are never visible here.</p>
      </div>
      {error && (
        <p className="text-sm text-rose-700">
          {error}{' '}
          <Link href="/login" className="text-indigo-700 underline">
            Sign in
          </Link>
        </p>
      )}

      <section className="rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Required setup</p>
            <h2 className="font-bricolage text-xl font-bold text-slate-900">WhatsApp Business API Onboarding</h2>
            <p className="text-sm text-slate-600 mt-1">
              Sign in to Facebook to add a new WhatsApp number or import an existing WABA. TechAntum then shows numbers, templates and messaging in this portal.
            </p>
          </div>
          <StatusPill value={connected ? 'CONNECTED' : onboardingStatus} />
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ONBOARDING_STEPS.map((step, index) => {
            const done = connected || (index === 0 && Boolean(data?.client));
            return (
              <li key={step} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span>
                  {index + 1}. {step}
                </span>
                <span className={`text-xs font-semibold ${done ? 'text-emerald-700' : 'text-slate-400'}`}>{done ? 'Done' : 'Pending'}</span>
              </li>
            );
          })}
        </ol>
        <Link
          href="/portal/wa/onboard"
          className="inline-flex rounded-xl bg-indigo-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-indigo-700"
        >
          {connected ? 'View WhatsApp Business API connection' : 'Start WhatsApp Business API Onboarding'}
        </Link>
      </section>

      <div className="flex gap-2">
        <StatusPill value={data?.client?.platform_health} />
        <StatusPill value={data?.client?.meta_connection_status} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard label="Sent" value={data?.analytics?.overview?.sent ?? 0} />
        <AdminStatCard label="Delivery %" value={`${data?.analytics?.overview?.deliveryRate ?? 0}%`} accent="green" />
        <AdminStatCard label="Read %" value={`${data?.analytics?.overview?.readRate ?? 0}%`} accent="blue" />
        <AdminStatCard label="Failed" value={data?.analytics?.overview?.failed ?? 0} accent="rose" />
      </div>
    </div>
  );
}
