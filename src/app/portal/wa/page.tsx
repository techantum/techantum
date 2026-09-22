'use client';

import { useEffect, useState } from 'react';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { StatusPill } from '@/components/admin/wa-provider/ProviderUi';

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
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-bricolage text-2xl font-bold text-slate-900">{data?.client?.name || 'WhatsApp workspace'}</h1>
        <p className="text-sm text-slate-500">Your organization data only. Other clients are never visible here.</p>
      </div>
      {error && (
        <p className="text-sm text-rose-700">
          {error}{' '}
          <a href="/login" className="text-indigo-700 underline">
            Sign in
          </a>
        </p>
      )}
      {data?.client?.meta_connection_status !== 'CONNECTED' && data?.client && (
        <a href="/portal/wa/connect" className="inline-flex rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold">
          Finish WhatsApp connection
        </a>
      )}
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
