'use client';

import ResourcePage, { cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function AuditPage() {
  return (
    <ResourcePage
      title="Audit Logs"
      description="Immutable history of sensitive provider actions. There is no UI to edit or delete these rows."
      endpoint="/api/admin/wa-provider/audit"
      columns={['When', 'Action', 'Resource', 'Resource ID']}
      render={(row) => [cellWhen(row.created_at), String(row.action || ''), String(row.resource_type || ''), String(row.resource_id || '—')]}
    />
  );
}
