'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPageLoader from '@/components/admin/AdminPageLoader';
import { FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/admin/rbac/audit', { cache: 'no-store' })
      .then((r) => r.json())
      .then((body) => setLogs(body.logs || []))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] space-y-4">
      <AdminPageLoader open={loading} label="Loading audit logs…" />
      <AdminPageHeader title="Audit Logs" />
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="w-full text-left">
          <thead>
            <tr>
              <FinanceTh>Time</FinanceTh>
              <FinanceTh>Actor</FinanceTh>
              <FinanceTh>Action</FinanceTh>
              <FinanceTh>Target</FinanceTh>
              <FinanceTh>IP</FinanceTh>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <FinanceTd className="text-slate-500">{new Date(log.created_at).toLocaleString('en-IN')}</FinanceTd>
                <FinanceTd>{log.actor_email || '—'}</FinanceTd>
                <FinanceTd className="font-medium">{log.action}</FinanceTd>
                <FinanceTd className="text-slate-500">{log.target_email || log.target_role_id || '—'}</FinanceTd>
                <FinanceTd className="text-slate-500">{log.ip || '—'}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
