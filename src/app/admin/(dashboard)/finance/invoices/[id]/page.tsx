'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import InvoiceDocument from '@/components/admin/finance/InvoiceDocument';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, PAYMENT_MODES, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import { todayISO } from '@/lib/finance/fy';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [detail, setDetail] = useState<{ invoice: Record<string, string>; items: Record<string, string>[]; payments: Record<string, string>[] } | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
      <FinanceLink href="/admin/finance/invoices">Back to invoices</FinanceLink>
      <AdminPageHeader
        title={invoice?.invoice_number || 'Invoice'}
        description={invoice ? `${invoice.client_name} · ${invoice.financial_year}` : 'Loading…'}
        action={
          invoice && (
            <div className="flex flex-wrap gap-2 print:hidden">
              <a href={`/api/admin/finance/invoices/${id}/pdf?download=1`}>
                <AdminButton variant="primary">Save As PDF</AdminButton>
              </a>
              <a href={`/admin/finance/invoices/${id}/print`}>
                <AdminButton>Print</AdminButton>
              </a>
            </div>
          )
        }
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {message && <AdminAlert>{message}</AdminAlert>}
      {invoice && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <StatusBadge value={invoice.invoice_status} />
          <StatusBadge value={invoice.payment_status} />
          <span className="text-sm text-slate-500">Outstanding {money(invoice.outstanding_amount)}</span>
        </div>
      )}
      {invoice && <InvoiceDocument invoice={invoice} items={detail?.items || []} />}
      {canPay && (
        <AdminSection title="Record payment">
          <div id="payment" className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
                {PAYMENT_MODES.map((m) => (
                  <option key={m}>{m}</option>
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
