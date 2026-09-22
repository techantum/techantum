'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalAutomationsPage() {
  return <ResourcePage title="Automations" description="Workflows for your organization only." endpoint="/api/portal/wa/campaigns" columns={['Name', 'Status']} render={(row) => [String(row.name || ''), cellStatus(row.status)]} />;
}
