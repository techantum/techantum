'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalAutomationsPage() {
  return <ResourcePage bare title="Automations" description="Simple workflows for your WhatsApp number." endpoint="/api/portal/wa/campaigns" columns={['Name', 'Status']} render={(row) => [String(row.name || ''), cellStatus(row.status)]} />;
}
