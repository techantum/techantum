'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { PmBadge, PmShell, Stat, Td, Th } from '@/components/admin/pm/ui';

export default function DailyBoardPage() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  useEffect(() => { fetch('/api/admin/pm/daily').then((r) => r.json()).then(setData); }, []);
  return (
    <PmShell>
      <AdminPageHeader title="Today's Updates" description={data?.today ? `Operating date ${data.today} (Asia/Kolkata)` : 'One update per project per day.'} />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Requiring" value={data?.requiring ?? '—'} />
        <Stat label="Updated" value={data?.updated ?? '—'} />
        <Stat label="Pending" value={data?.pending ?? '—'} />
        <Stat label="Compliance" value={data?.compliance != null ? `${data.compliance}%` : '—'} hint={data ? `${data.updated} of ${data.requiring} updated` : undefined} />
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full">
          <thead><tr><Th>Project</Th><Th>Client</Th><Th>AM</Th><Th>Category</Th><Th>RAG</Th><Th>%</Th><Th>Last Update</Th><Th>Today</Th><Th></Th></tr></thead>
          <tbody>
            {(data?.rows || []).map((row: Record<string, string>) => (
              <tr key={row.id}>
                <Td>{row.project_code} {row.project_name}</Td><Td>{row.client_name}</Td><Td>{row.account_manager_name}</Td>
                <Td><PmBadge value={row.category} /></Td><Td><PmBadge value={row.latest_rag} /></Td><Td>{row.completion_percent ?? '—'}</Td><Td>{row.last_update}</Td>
                <Td><PmBadge value={row.today_id ? 'Updated' : 'Pending'} /></Td>
                <Td>{row.today_id ? <Link className="text-secondary" href={`/admin/pm/daily/${row.today_id}`}>View / Edit</Link> : <Link className="text-secondary" href={`/admin/pm/daily/new?projectId=${row.id}`}>Add Update</Link>}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PmShell>
  );
}
