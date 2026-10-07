'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import { clientTypeLabel } from '@/lib/finance/client-types';

export default function FinanceClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    fetch(`/api/admin/finance/clients/${id}`).then(async (r) => {
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || 'Not found');
      setData(body);
    }).catch((err) => setError(err instanceof Error ? err.message : 'Failed'));
  };

  useEffect(() => { load(); }, [id]);

  const client = data?.client as Record<string, string> | undefined;
  const totals = data?.totals as { totalInvoiced: string; totalReceived: string; outstanding: string } | undefined;
  const invoices = (data?.invoices || []) as Record<string, string>[];
  const payments = (data?.payments || []) as Record<string, string>[];
  const projects = (data?.projects || []) as Record<string, string>[];

  const setStatus = async (status: string) => {
    const res = await fetch(`/api/admin/finance/clients/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Status update failed');
      return;
    }
    load();
  };

  return (
    <FinanceShell>
      <FinanceLink href="/admin/finance/clients">Back to clients</FinanceLink>
      <AdminPageHeader
        title={client?.name || 'Client'}
        description={client ? `${client.client_code} · ${clientTypeLabel(client.client_type)}` : ''}
        action={
          client && (
            <div className="flex flex-wrap gap-2">
              <a href={`/admin/finance/clients/${id}/edit`}>
                <AdminButton>Edit</AdminButton>
              </a>
              <AdminButton onClick={() => setStatus(client.status === 'inactive' ? 'active' : 'inactive')}>
                {client.status === 'inactive' ? 'Enable' : 'Disable'}
              </AdminButton>
            </div>
          )
        }
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStatCard label="Total Invoiced" value={totals ? money(totals.totalInvoiced) : '—'} />
        <AdminStatCard label="Total Received" value={totals ? money(totals.totalReceived) : '—'} accent="green" />
        <AdminStatCard label="Outstanding" value={totals ? money(totals.outstanding) : '—'} accent="amber" />
        <AdminStatCard label="Status" value={client?.status || '—'} />
      </div>
      {client && (
        <>
          <AdminSection title="Basic Information">
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              <p>Contact {client.contact_person || '—'}</p>
              <p>Email {client.email || '—'}</p>
              <p>Phone {client.contact_number || '—'}</p>
              <p>Website {client.website || '—'}</p>
              <p>Country {client.country || '—'}</p>
              <p>Currency {client.default_currency || 'INR'}</p>
            </div>
          </AdminSection>
          <AdminSection title="Billing Address">
            <p className="text-sm whitespace-pre-line">{client.billing_address || [client.address_line1, client.address_line2, client.city, client.state, client.pincode, client.country].filter(Boolean).join(', ') || '—'}</p>
          </AdminSection>
          <AdminSection title="Tax Information">
            <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
              <p>GSTIN {client.gstin || '—'}</p>
              <p>PAN {client.pan || '—'}</p>
              <p>VAT {client.tax_vat_number || '—'}</p>
            </div>
          </AdminSection>
        </>
      )}
      <AdminSection title="Projects">
        <table className="w-full text-sm">
          <thead><tr><FinanceTh>Project</FinanceTh><FinanceTh>Status</FinanceTh></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}><FinanceTd>{p.project_name}</FinanceTd><FinanceTd><StatusBadge value={p.status} /></FinanceTd></tr>
            ))}
          </tbody>
        </table>
        {!projects.length && <p className="text-sm text-slate-500">No projects linked.</p>}
      </AdminSection>
      <AdminSection title="Invoice History">
        <table className="w-full text-sm">
          <thead><tr><FinanceTh>Invoice</FinanceTh><FinanceTh>Date</FinanceTh><FinanceTh>Total</FinanceTh><FinanceTh>Outstanding</FinanceTh><FinanceTh>Status</FinanceTh></tr></thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id}>
                <FinanceTd><FinanceLink href={`/admin/finance/invoices/${i.id}`}>{i.invoice_number || '—'}</FinanceLink></FinanceTd>
                <FinanceTd>{i.invoice_date}</FinanceTd>
                <FinanceTd>{money(i.total_amount)}</FinanceTd>
                <FinanceTd>{money(i.outstanding_amount)}</FinanceTd>
                <FinanceTd><StatusBadge value={i.payment_status} /></FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
      <AdminSection title="Payment History">
        <table className="w-full text-sm">
          <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Invoice</FinanceTh><FinanceTh>Received</FinanceTh><FinanceTh>Reference</FinanceTh></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <FinanceTd>{p.payment_date}</FinanceTd>
                <FinanceTd>{p.invoice_number}</FinanceTd>
                <FinanceTd>{money(p.amount_received)}</FinanceTd>
                <FinanceTd>{p.transaction_reference || '—'}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
    </FinanceShell>
  );
}
