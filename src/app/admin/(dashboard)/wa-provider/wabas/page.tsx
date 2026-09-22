'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function WabasPage() {
  return (
    <ResourcePage
      title="WABA Accounts"
      description="WhatsApp Business Accounts connected through this Tech Provider."
      endpoint="/api/admin/wa-provider/wabas"
      searchHint="WABA name or ID"
      columns={['Name', 'WABA ID', 'Status', 'Webhooks', 'Last sync']}
      render={(row) => [String(row.name || '—'), String(row.waba_id || ''), cellStatus(row.account_status), row.webhook_subscribed ? 'Subscribed' : 'Not subscribed', cellWhen(row.last_synced_at)]}
    />
  );
}
