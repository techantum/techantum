'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminSelectClass } from '@/components/admin/AdminField';
import { ProviderShell, ProviderTable, Td } from '@/components/admin/wa-provider/ProviderUi';

export default function AnalyticsPage() {
  const [range, setRange] = useState('this_month');
  const [groupBy, setGroupBy] = useState('client_id');
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/admin/wa-provider/analytics?range=${range}&groupBy=${groupBy}`).then((r) => r.json()).then(setData);
  }, [range, groupBy]);
  const exportRows = async () => {
    const res = await fetch('/api/admin/wa-provider/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table: 'wa_messages' }) });
    const body = await res.json();
    const csv = ['id,status,type,created_at', ...(body.rows || []).map((r: any) => [r.id, r.status, r.type, r.created_at].join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wa-messages.csv';
    a.click();
  };
  return (
    <ProviderShell>
      <AdminPageHeader title="Analytics" description="Provider-wide messaging performance with comparison-ready totals." action={<AdminButton onClick={exportRows}>Export CSV</AdminButton>} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <AdminField label="Range">
          <select className={adminSelectClass} value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="today">Today</option>
            <option value="last_7">Last 7 days</option>
            <option value="this_month">This month</option>
            <option value="previous_month">Previous month</option>
          </select>
        </AdminField>
        <AdminField label="Group by">
          <select className={adminSelectClass} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="client_id">Client</option>
            <option value="waba_id">WABA</option>
            <option value="template_id">Template</option>
            <option value="campaign_id">Campaign</option>
            <option value="type">Message type</option>
          </select>
        </AdminField>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <AdminStatCard label="Sent" value={data?.overview?.sent ?? 0} />
        <AdminStatCard label="Delivery %" value={`${data?.overview?.deliveryRate ?? 0}%`} accent="green" />
        <AdminStatCard label="Read %" value={`${data?.overview?.readRate ?? 0}%`} accent="blue" />
        <AdminStatCard label="Failure %" value={`${data?.overview?.failureRate ?? 0}%`} accent="rose" />
      </div>
      <AdminSection title="Breakdown">
        <ProviderTable
          columns={['Key', 'Sent', 'Delivered', 'Read', 'Failed']}
          rows={(data?.breakdown || []).map((row: any) => (
            <tr key={row.key}>
              <Td>{row.key}</Td>
              <Td>{row.sent}</Td>
              <Td>{row.delivered}</Td>
              <Td>{row.read}</Td>
              <Td>{row.failed}</Td>
            </tr>
          ))}
        />
      </AdminSection>
    </ProviderShell>
  );
}
