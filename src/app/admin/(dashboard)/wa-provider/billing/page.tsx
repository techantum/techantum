'use client';

import ResourcePage, { cellStatus } from '@/components/admin/wa-provider/ResourcePage';

export default function BillingPage() {
  return (
    <ResourcePage
      title="Billing"
      description="Internal platform fees. These are independent of Meta conversation charges."
      endpoint="/api/admin/wa-provider/billing"
      columns={['Plan', 'Monthly fee', 'Cycle', 'Invoice', 'Outstanding']}
      render={(row) => [String(row.plan || ''), String(row.monthly_fee ?? 0), String(row.billing_cycle || ''), cellStatus(row.invoice_status), String(row.outstanding_amount ?? 0)]}
    />
  );
}
