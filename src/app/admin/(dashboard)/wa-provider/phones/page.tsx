'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';

export default function PhonesPage() {
  return (
    <ResourcePage
      title="Phone Numbers"
      description="All client WhatsApp numbers, quality and registration state."
      endpoint="/api/admin/wa-provider/phones"
      searchHint="Phone, verified name or phone number ID"
      columns={['Phone', 'Phone Number ID', 'Verified name', 'Quality', 'Registration', 'Messaging', 'Last sync']}
      render={(row) => [String(row.display_phone_number || '—'), String(row.phone_number_id || ''), String(row.verified_name || '—'), cellStatus(row.quality_rating), cellStatus(row.registration_status), String(row.messaging_status || '—'), cellWhen(row.last_synced_at)]}
    />
  );
}
