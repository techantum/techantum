'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function PortalPhonesPage() {
  return <ResourcePage title="WhatsApp Numbers" description="Numbers belonging to your organization only." endpoint="/api/portal/wa/phones" columns={['Number', 'Verified name', 'Quality', 'Registration']} render={(row) => [String(row.display_phone_number || ''), String(row.verified_name || ''), cellStatus(row.quality_rating), cellStatus(row.registration_status)]} />;
}
