'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function MessagesPage() {
  return (
    <ResourcePage
      title="Messages"
      description="Normalized sent, delivered, read and failed tracking. Webhook order is not assumed."
      endpoint="/api/admin/wa-provider/messages"
      searchHint="WAMID or status"
      columns={['WAMID', 'Direction', 'Type', 'Status', 'Created']}
      render={(row) => [String(row.wamid || '—'), String(row.direction || ''), String(row.type || ''), cellStatus(row.status), cellWhen(row.created_at)]}
    />
  );
}
