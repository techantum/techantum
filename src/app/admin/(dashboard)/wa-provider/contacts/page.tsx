'use client';

import ResourcePage, { cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function ContactsPage() {
  return (
    <ResourcePage
      title="Contacts"
      description="Tenant-isolated WhatsApp contacts. Contacts never cross client boundaries."
      endpoint="/api/admin/wa-provider/contacts"
      searchHint="Name, phone or email"
      columns={['Name', 'Phone', 'Email', 'Opt-in', 'Last interaction']}
      render={(row) => [String(row.name || '—'), String(row.phone || ''), String(row.email || '—'), String(row.opt_in_status || 'UNKNOWN'), cellWhen(row.last_interaction_at)]}
    />
  );
}
