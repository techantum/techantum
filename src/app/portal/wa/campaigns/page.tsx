'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalCampaignsPage() {
  return <ResourcePage title="Campaigns" description="Your template campaigns." endpoint="/api/portal/wa/campaigns" columns={['Name', 'Status', 'Sent', 'Delivered']} render={(row) => [String(row.name || ''), cellStatus(row.status), String(row.sent_count ?? 0), String(row.delivered_count ?? 0)]} />;
}
