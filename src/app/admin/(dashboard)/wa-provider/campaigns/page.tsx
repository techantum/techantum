'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function CampaignsPage() {
  return (
    <ResourcePage
      title="Campaigns"
      description="Template campaigns: draft, audience, schedule, launch and performance."
      endpoint="/api/admin/wa-provider/campaigns"
      columns={['Name', 'Status', 'Sent', 'Delivered', 'Read', 'Failed', 'Schedule']}
      render={(row) => [String(row.name || ''), cellStatus(row.status), String(row.sent_count ?? 0), String(row.delivered_count ?? 0), String(row.read_count ?? 0), String(row.failed_count ?? 0), cellWhen(row.schedule_at)]}
    />
  );
}
