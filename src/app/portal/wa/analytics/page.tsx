'use client';

import { useEffect, useState } from 'react';
import { HelpCard, StatTile } from '@/components/whatsapp/portal-ui';

export default function PortalAnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/portal/wa/dashboard?range=this_month').then((r) => r.json()).then(setData);
  }, []);

  const overview = data?.analytics?.overview || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bricolage text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Delivery, read and failure rates from messages on your connected WhatsApp numbers.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sent" value={overview.sent ?? 0} hint="This month" icon="PaperAirplaneIcon" />
        <StatTile label="Delivered" value={overview.delivered ?? 0} hint={`${overview.deliveryRate ?? 0}%`} icon="CheckCircleIcon" tone="emerald" />
        <StatTile label="Read" value={overview.read ?? 0} hint={`${overview.readRate ?? 0}%`} icon="EyeIcon" tone="sky" />
        <StatTile label="Failed" value={overview.failed ?? 0} hint={`${overview.failureRate ?? 0}%`} icon="ExclamationTriangleIcon" tone="rose" />
      </div>
      <HelpCard />
    </div>
  );
}
