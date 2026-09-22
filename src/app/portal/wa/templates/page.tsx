'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalTemplatesPage() {
  return <ResourcePage title="Templates" description="Your templates only. Internal approval is done by the Tech Provider." endpoint="/api/portal/wa/templates" columns={['Name', 'Language', 'Internal', 'Meta']} render={(row) => [String(row.name || ''), String(row.language || ''), cellStatus(row.internal_status), cellStatus(row.meta_status)]} />;
}
