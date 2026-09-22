'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function MetaAdsLogsPage() {
  return (
    <ResourcePage
      title="Meta Ads API logs"
      description="Every Marketing API request from Techantum’s ads sync: endpoint, ad account, HTTP status, Meta error code, success/fail, timestamp and duration. Tokens are never stored."
      endpoint="/api/admin/meta-ads/logs"
      searchHint="Search endpoint, operation, ad account or error code"
      columns={['When', 'Operation', 'Endpoint', 'Ad account', 'HTTP', 'Meta code', 'Result', 'Duration']}
      render={(row) => [
        cellWhen(row.created_at),
        String(row.operation || ''),
        String(row.endpoint || ''),
        String(row.ad_account_id || '—'),
        String(row.http_status || ''),
        String(row.meta_error_code || '—'),
        cellStatus(row.success ? 'SUCCESS' : 'FAILED'),
        `${row.duration_ms || 0} ms`,
      ]}
    />
  );
}
