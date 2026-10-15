'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { AdminBackLink, Fact, FactGrid, SectionEmpty } from '@/components/admin/DetailFacts';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, StatusBadge, money } from '@/components/admin/finance/FinanceUi';
import { clientTypeLabel } from '@/lib/finance/client-types';
import Icon from '@/components/ui/AppIcon';

function addressOf(client: Record<string, string>) {
  return client.billing_address || [client.address_line1, client.address_line2, client.city, client.state, client.pincode, client.country].filter(Boolean).join(', ') || '';
}

function websiteHref(value: string) {
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export default function FinanceClientDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

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
  const address = client ? addressOf(client) : '';

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

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <FinanceShell>
      <AdminBackLink href="/admin/finance/clients">Back to clients</AdminBackLink>
      <AdminPageHeader
        title={client?.name || 'Client'}
        description={client ? `${client.client_code} • ${clientTypeLabel(client.client_type)}` : ''}
        action={
          client && (
            <div className="flex flex-wrap gap-2">
              <a href={`/admin/finance/clients/${id}/edit`}>
                <AdminButton>
                  <Icon name="PencilSquareIcon" size={16} />
                  Edit
                </AdminButton>
              </a>
              <AdminButton variant="outline-danger" onClick={() => setStatus(client.status === 'inactive' ? 'active' : 'inactive')}>
                <Icon name={client.status === 'inactive' ? 'CheckCircleIcon' : 'NoSymbolIcon'} size={16} />
                {client.status === 'inactive' ? 'Enable' : 'Disable'}
              </AdminButton>
            </div>
          )
        }
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminStatCard label="Total invoiced" value={totals ? money(totals.totalInvoiced) : '—'} accent="blue" icon="DocumentTextIcon" />
        <AdminStatCard label="Total received" value={totals ? money(totals.totalReceived) : '—'} accent="green" icon="CurrencyRupeeIcon" />
        <AdminStatCard label="Outstanding" value={totals ? money(totals.outstanding) : '—'} accent="amber" icon="ClockIcon" />
        <AdminStatCard
          label="Status"
          accent={client?.status === 'inactive' ? 'rose' : 'green'}
          icon={client?.status === 'inactive' ? 'NoSymbolIcon' : 'CheckCircleIcon'}
          value={
            <span className="inline-flex items-center gap-2 capitalize">
              <span className={`h-2 w-2 rounded-full ${client?.status === 'inactive' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
              {client?.status || '—'}
            </span>
          }
        />
      </div>
      {client && (
        <>
          <AdminSection title="Basic Information" icon="UserIcon">
            <FactGrid>
              <Fact icon="UserIcon" label="Contact person">{client.contact_person || '—'}</Fact>
              <Fact icon="EnvelopeIcon" label="Email">
                {client.email ? <a className="text-secondary hover:underline" href={`mailto:${client.email}`}>{client.email}</a> : '—'}
              </Fact>
              <Fact icon="PhoneIcon" label="Phone">
                {client.contact_number ? <a className="text-secondary hover:underline" href={`tel:${client.contact_number}`}>{client.contact_number}</a> : '—'}
              </Fact>
              <Fact icon="GlobeAltIcon" label="Website">
                {client.website ? <a className="text-secondary hover:underline" href={websiteHref(client.website)} target="_blank" rel="noreferrer">{client.website.replace(/^https?:\/\//, '')}</a> : '—'}
              </Fact>
              <Fact icon="GlobeAltIcon" label="Country">{client.country || '—'}</Fact>
              <Fact icon="BanknotesIcon" label="Currency">{client.default_currency || 'INR'}</Fact>
            </FactGrid>
          </AdminSection>
          <AdminSection
            title="Billing Address"
            icon="MapPinIcon"
            action={
              <button type="button" onClick={copyAddress} disabled={!address} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-40">
                <Icon name="ClipboardDocumentIcon" size={14} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            }
          >
            <p className="text-sm leading-6 text-slate-700">{address || '—'}</p>
          </AdminSection>
          <AdminSection title="Tax Information" icon="DocumentTextIcon">
            <FactGrid>
              <Fact icon="IdentificationIcon" label="GSTIN">{client.gstin || '—'}</Fact>
              <Fact icon="IdentificationIcon" label="PAN">{client.pan || '—'}</Fact>
              <Fact icon="IdentificationIcon" label="VAT">{client.tax_vat_number || '—'}</Fact>
            </FactGrid>
          </AdminSection>
        </>
      )}
      <AdminSection title="Projects" icon="RectangleStackIcon">
        {projects.length > 0 ? (
          <table className="w-full">
            <thead><tr><FinanceTh>Project</FinanceTh><FinanceTh>Status</FinanceTh></tr></thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <FinanceTd><span className="inline-flex items-center gap-2 font-medium text-slate-800"><Icon name="FolderIcon" size={15} className="text-slate-400" />{p.project_name}</span></FinanceTd>
                  <FinanceTd><StatusBadge value={p.status} /></FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <SectionEmpty icon="FolderIcon" title="No projects yet" description="Projects linked to this client will appear here." />
        )}
      </AdminSection>
      <AdminSection title="Invoice History" icon="DocumentTextIcon">
        {invoices.length > 0 ? (
          <table className="w-full">
            <thead><tr><FinanceTh>Invoice</FinanceTh><FinanceTh>Date</FinanceTh><FinanceTh>Total</FinanceTh><FinanceTh>Outstanding</FinanceTh><FinanceTh>Status</FinanceTh></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <FinanceTd><FinanceLink href={`/admin/finance/invoices/${i.id}`}>{i.invoice_number || '—'}</FinanceLink></FinanceTd>
                  <FinanceTd className="whitespace-nowrap">{i.invoice_date}</FinanceTd>
                  <FinanceTd className="whitespace-nowrap">{money(i.total_amount)}</FinanceTd>
                  <FinanceTd className="whitespace-nowrap">{money(i.outstanding_amount)}</FinanceTd>
                  <FinanceTd><StatusBadge value={i.payment_status} /></FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <SectionEmpty icon="DocumentTextIcon" title="No invoices yet" description="Invoices for this client will appear here." />
        )}
      </AdminSection>
      <AdminSection title="Payment History" icon="CreditCardIcon">
        {payments.length > 0 ? (
          <table className="w-full">
            <thead><tr><FinanceTh>Date</FinanceTh><FinanceTh>Invoice</FinanceTh><FinanceTh>Received</FinanceTh><FinanceTh>Reference</FinanceTh></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <FinanceTd className="whitespace-nowrap">{p.payment_date}</FinanceTd>
                  <FinanceTd>{p.invoice_number}</FinanceTd>
                  <FinanceTd className="whitespace-nowrap">{money(p.amount_received)}</FinanceTd>
                  <FinanceTd>{p.transaction_reference || '—'}</FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <SectionEmpty icon="CreditCardIcon" title="No payments yet" description="Payment records for this client will appear here." />
        )}
      </AdminSection>
    </FinanceShell>
  );
}
