'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { AdminBackLink } from '@/components/admin/DetailFacts';
import DeleteInvoiceButton from '@/components/admin/finance/DeleteInvoiceButton';
import InvoiceDocument from '@/components/admin/finance/InvoiceDocument';
import { FinanceShell, FinanceTd, FinanceTh, PAYMENT_MODES, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import { useMasterItems } from '@/components/admin/useMasterItems';
import Icon from '@/components/ui/AppIcon';
import { todayISO } from '@/lib/finance/fy';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id || '';
  const [detail, setDetail] = useState<{ invoice: Record<string, string>; items: Record<string, string>[]; payments: Record<string, string>[] } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const paymentModes = useMasterItems('payment_mode', PAYMENT_MODES.map((mode) => ({ value: mode, label: mode })));
  const [pay, setPay] = useState({
    payment_date: todayISO(),
    amount_received: '',
    tds_deducted: '0',
    other_deduction: '0',
    payment_mode: 'Bank Transfer',
    transaction_reference: '',
    notes: '',
    tds_section: '',
  });

  const load = () => {
    fetch(`/api/admin/finance/invoices/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Not found');
        setDetail(body);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  };

  useEffect(() => {
    load();
  }, [id]);

  const recordPay = async () => {
    try {
      const res = await fetch('/api/admin/finance/invoice-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pay, invoice_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Payment failed');
      setMessage('Payment recorded. Outstanding was updated from invoice payments.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  const invoice = detail?.invoice;
  const canPay = invoice && invoice.invoice_status !== 'cancelled' && invoice.invoice_status !== 'draft';

  return (
    <FinanceShell>
      <AdminBackLink href="/admin/finance/invoices">Back to invoices</AdminBackLink>
      <AdminPageHeader
        title={invoice?.invoice_number || 'Invoice'}
        description={invoice ? `${invoice.client_name} · ${invoice.financial_year}` : 'Loading…'}
        action={
          invoice && (
            <div className="flex flex-wrap gap-2 print:hidden">
              <a href={`/api/admin/finance/invoices/${id}/pdf?download=1`}>
                <AdminButton variant="primary"><Icon name="ArrowDownTrayIcon" size={16} />Save as PDF</AdminButton>
              </a>
              <a href={`/admin/finance/invoices/${id}/print`}>
                <AdminButton><Icon name="PrinterIcon" size={16} />Print</AdminButton>
              </a>
              <DeleteInvoiceButton
                id={id}
                invoiceNumber={invoice.invoice_number}
                label="Delete invoice"
                onDeleted={() => router.push('/admin/finance/invoices')}
              />
            </div>
          )
        }
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {message && <AdminAlert>{message}</AdminAlert>}
      {invoice && (
        <div className="grid grid-cols-2 gap-3 print:hidden xl:grid-cols-4">
          <AdminStatCard label="Total" value={money(invoice.total_amount)} accent="blue" icon="DocumentTextIcon" />
          <AdminStatCard label="Received" value={money(invoice.amount_received || invoice.total_received || 0)} accent="green" icon="CurrencyRupeeIcon" />
          <AdminStatCard label="Outstanding" value={money(invoice.outstanding_amount)} accent="amber" icon="ClockIcon" />
          <AdminStatCard label="Status" value={<span className="inline-flex flex-wrap gap-1"><StatusBadge value={invoice.invoice_status} /><StatusBadge value={invoice.payment_status} /></span>} icon="CheckCircleIcon" />
        </div>
      )}
      {invoice && <InvoiceDocument invoice={invoice} items={detail?.items || []} />}
      {canPay && (
        <AdminSection title="Record payment" icon="CreditCardIcon">
          <div id="payment" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminField label="Date">
              <input type="date" className={adminInputClass} value={pay.payment_date} onChange={(e) => setPay({ ...pay, payment_date: e.target.value })} />
            </AdminField>
            <AdminField label="Amount received">
              <input className={adminInputClass} value={pay.amount_received} onChange={(e) => setPay({ ...pay, amount_received: e.target.value })} />
            </AdminField>
            <AdminField label="TDS deducted">
              <input className={adminInputClass} value={pay.tds_deducted} onChange={(e) => setPay({ ...pay, tds_deducted: e.target.value })} />
            </AdminField>
            <AdminField label="Other deduction">
              <input className={adminInputClass} value={pay.other_deduction} onChange={(e) => setPay({ ...pay, other_deduction: e.target.value })} />
            </AdminField>
            <AdminField label="TDS section">
              <input className={adminInputClass} value={pay.tds_section} onChange={(e) => setPay({ ...pay, tds_section: e.target.value })} placeholder="Optional" />
            </AdminField>
            <AdminField label="Mode">
              <select className={adminSelectClass} value={pay.payment_mode} onChange={(e) => setPay({ ...pay, payment_mode: e.target.value })}>
                {paymentModes.map((mode) => (
                  <option key={mode.value}>{mode.label}</option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Reference" span={2}>
              <input className={adminInputClass} value={pay.transaction_reference} onChange={(e) => setPay({ ...pay, transaction_reference: e.target.value })} />
            </AdminField>
          </div>
          <AdminButton variant="primary" className="mt-3" onClick={recordPay}>
            Record payment
          </AdminButton>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr>
                <FinanceTh>Date</FinanceTh>
                <FinanceTh>Received</FinanceTh>
                <FinanceTh>TDS</FinanceTh>
                <FinanceTh>Other</FinanceTh>
                <FinanceTh>Status</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {(detail?.payments || []).map((p) => (
                <tr key={p.id}>
                  <FinanceTd>{p.payment_date}</FinanceTd>
                  <FinanceTd>{money(p.amount_received)}</FinanceTd>
                  <FinanceTd>{money(p.tds_deducted)}</FinanceTd>
                  <FinanceTd>{money(p.other_deduction)}</FinanceTd>
                  <FinanceTd>
                    <StatusBadge value={p.status} />
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminSection>
      )}
    </FinanceShell>
  );
}
