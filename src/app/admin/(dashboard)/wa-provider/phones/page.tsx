'use client';

import ResourcePage, { cellStatus, cellWhen } from '@/components/admin/wa-provider/ResourcePage';
import { formatMessagingLimit } from '@/components/whatsapp/portal-ui';
import { resolveMetaPhoneState } from '@/lib/whatsapp-provider/phone-status';

export default function PhonesPage() {
  return (
    <ResourcePage
      title="Phone Numbers"
      description="All client WhatsApp numbers, quality and registration state from Meta."
      endpoint="/api/admin/wa-provider/phones"
      searchHint="Phone, verified name or phone number ID"
      columns={['Phone', 'Phone Number ID', 'Verified name', 'Quality', 'Meta status', 'Messaging', 'Last sync']}
      render={(row) => {
        const state = resolveMetaPhoneState(row);
        return [String(row.display_phone_number || '—'), String(row.phone_number_id || ''), String(row.verified_name || '—'), cellStatus(row.quality_rating), cellStatus(state.label), formatMessagingLimit(String(row.messaging_status || '')), cellWhen(row.last_synced_at)];
      }}
    />
  );
}
