'use client';

import { useEffect, useState } from 'react';
import AdminStatCard from '@/components/admin/AdminStatCard';

export default function PortalAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch('/api/portal/wa/dashboard?range=this_month').then((r) => r.json()).then(setData);
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="font-bricolage text-2xl font-bold">Analytics</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AdminStatCard label="Sent" value={data?.analytics?.overview?.sent ?? 0} />
        <AdminStatCard label="Delivered" value={data?.analytics?.overview?.delivered ?? 0} accent="green" />
        <AdminStatCard label="Read" value={data?.analytics?.overview?.read ?? 0} accent="blue" />
        <AdminStatCard label="Failed" value={data?.analytics?.overview?.failed ?? 0} accent="rose" />
      </div>
    </div>
  );
}
