'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function ApiLogsPage() {
  return (
    <ResourcePage
      title="API Logs"
      description="Sanitized Meta Graph API requests. Tokens and secrets are never stored."
      endpoint="/api/admin/wa-provider/api-logs"
      columns={['When', 'Operation', 'Endpoint', 'HTTP', 'Status', 'Duration', 'Retries']}
      render={(row) => [cellWhen(row.created_at), String(row.operation || ''), String(row.endpoint || ''), String(row.http_status || ''), cellStatus(row.status), `${row.duration_ms || 0} ms`, String(row.retry_count ?? 0)]}
    />
  );
}
