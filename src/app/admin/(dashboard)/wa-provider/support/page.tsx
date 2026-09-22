'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function SupportPage() {
  return (
    <ResourcePage
      title="Support"
      description="Client tickets for onboarding, numbers, templates, API and billing."
      endpoint="/api/admin/wa-provider/support"
      columns={['Subject', 'Category', 'Priority', 'Status', 'Created']}
      render={(row) => [String(row.subject || ''), String(row.category || ''), String(row.priority || ''), cellStatus(row.status), cellWhen(row.created_at)]}
    />
  );
}
