'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalMessagesPage() {
  return <ResourcePage title="Messages" description="Your message history." endpoint="/api/portal/wa/messages" columns={['WAMID', 'Type', 'Status', 'Created']} render={(row) => [String(row.wamid || ''), String(row.type || ''), cellStatus(row.status), cellWhen(row.created_at)]} />;
}
