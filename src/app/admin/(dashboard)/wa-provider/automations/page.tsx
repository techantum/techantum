'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function AutomationsPage() {
  return (
    <ResourcePage
      title="Automations"
      description="Trigger → conditions → actions. Execution logs are stored per run."
      endpoint="/api/admin/wa-provider/automations"
      columns={['Name', 'Trigger', 'Status']}
      render={(row) => [String(row.name || ''), String(row.trigger_type || ''), cellStatus(row.status)]}
    />
  );
}
