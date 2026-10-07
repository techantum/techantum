'use client';

import AdminPageHeader from '@/components/admin/AdminPageHeader';
import InvoiceEditor from '@/components/admin/finance/InvoiceEditor';
import { FinanceLink, FinanceShell } from '@/components/admin/finance/FinanceUi';

export default function NewInvoicePage() {
  return (
    <FinanceShell>
      <FinanceLink href="/admin/finance/invoices">Back to invoices</FinanceLink>
      <AdminPageHeader title="New invoice" description="Creating an invoice finalizes it. After that it can only be viewed, saved as PDF, printed or paid." />
      <InvoiceEditor />
    </FinanceShell>
  );
}
