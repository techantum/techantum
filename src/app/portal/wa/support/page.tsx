'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalSupportPage() {
  return <ResourcePage title="Support" description="Tickets for your WhatsApp account." endpoint="/api/portal/wa/support" columns={['Subject', 'Category', 'Status', 'Created']} render={(row) => [String(row.subject || ''), String(row.category || ''), cellStatus(row.status), cellWhen(row.created_at)]} />;
}
