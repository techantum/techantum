'use client';

import ResourcePage, { cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalContactsPage() {
  return <ResourcePage bare title="Contacts" description="People you have messaged on WhatsApp." endpoint="/api/portal/wa/contacts" columns={['Name', 'Phone', 'Opt-in', 'Last interaction']} render={(row) => [String(row.name || ''), String(row.phone || ''), String(row.opt_in_status || ''), cellWhen(row.last_interaction_at)]} />;
}
