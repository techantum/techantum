'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function FlowsPage() {
  return (
    <ResourcePage
      title="WhatsApp Flows"
      description="Meta Flows for appointments, registration, feedback and qualification."
      endpoint="/api/admin/wa-provider/flows"
      columns={['Name', 'Category', 'Status']}
      render={(row) => [String(row.name || ''), String(row.category || '—'), cellStatus(row.status)]}
    />
  );
}
