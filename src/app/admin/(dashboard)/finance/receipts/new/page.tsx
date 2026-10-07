'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import { FinanceLink, FinanceShell, PAYMENT_MODES } from '@/components/admin/finance/FinanceUi';
import { BILLING_CURRENCIES, GST_RATES } from '@/lib/finance/gst';
import { todayISO } from '@/lib/finance/fy';

export default function NewReceiptPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Record<string, string>[]>([]);
  const [categories, setCategories] = useState<Record<string, string>[]>([]);
  const [clients, setClients] = useState<Record<string, string>[]>([]);
  const [projects, setProjects] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    expense_date: todayISO(),
    vendor_id: '',
    category_id: '',
    description: '',
    vendor_invoice_date: '',
    currency: 'INR',
    taxable_amount: '',
    cgst: '0',
    sgst: '0',
    igst: '0',
    other_tax: '0',
    tds_amount: '0',
    amount_paid: '',
    payment_date: todayISO(),
    payment_mode: 'Bank Transfer',
    bank_account: '',
    transaction_reference: '',
    project_id: '',
    client_id: '',
    notes: '',
    gst_rate: '18',
    split: 'igst',
  });

  useEffect(() => {
    fetch('/api/admin/finance/vendors?pageSize=100').then((r) => r.json()).then((b) => {
      const rows = b.rows || [];
      setVendors(rows);
      const general = rows.find((v: Record<string, string>) => v.vendor_name === 'General / Other');
      if (general && !form.vendor_id) setForm((f) => ({ ...f, vendor_id: general.id }));
    });
    fetch('/api/admin/finance/receipt-categories?active=1').then((r) => r.json()).then((b) => setCategories(Array.isArray(b) ? b : []));
    fetch('/api/admin/finance/clients').then((r) => r.json()).then((b) => setClients(Array.isArray(b) ? b : []));
    fetch('/api/admin/finance/projects').then((r) => r.json()).then((b) => setProjects(Array.isArray(b) ? b : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyGst = (taxable: string, rate: string, split: string) => {
    const t = Number(taxable || 0);
    const r = Number(rate || 0);
    const tax = Math.round(t * r) / 100;
    if (split === 'cgst_sgst') setForm((f) => ({ ...f, taxable_amount: taxable, gst_rate: rate, split, cgst: String(tax / 2), sgst: String(tax / 2), igst: '0' }));
    else if (split === 'none') setForm((f) => ({ ...f, taxable_amount: taxable, gst_rate: rate, split, cgst: '0', sgst: '0', igst: '0' }));
    else setForm((f) => ({ ...f, taxable_amount: taxable, gst_rate: rate, split, cgst: '0', sgst: '0', igst: String(tax) }));
  };

  const save = async () => {
    setError('');
    if (!form.vendor_id) return setError('Vendor is required');
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, String(value)));
    if (file) data.set('file', file);
    const res = await fetch('/api/admin/finance/receipts', { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Failed');
    router.push(`/admin/finance/receipts/${body.id}`);
  };

  const total = Number(form.taxable_amount || 0) + Number(form.cgst || 0) + Number(form.sgst || 0) + Number(form.igst || 0) + Number(form.other_tax || 0);

  return (
    <FinanceShell>
      <FinanceLink href="/admin/finance/receipts">Back to receipts</FinanceLink>
      <AdminPageHeader title="Add Receipt" description="A receipt records money spent by Techantum and must be linked to a vendor." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <AdminSection title="Receipt">
        <AdminFormGrid>
          <AdminField label="Receipt Date"><input type="date" className={adminInputClass} value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} /></AdminField>
          <AdminField label="Vendor">
            <select className={adminSelectClass} value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
              <option value="">Select vendor</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Receipt Category">
            <select className={adminSelectClass} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.category_name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Description" span={3}><input className={adminInputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></AdminField>
          <AdminField label="Vendor Invoice / Bill Number">
            <input className={adminInputClass} readOnly value="" placeholder="Auto-generated on save (VBL-YY-YY-001)" />
          </AdminField>
          <AdminField label="Vendor Invoice Date"><input type="date" className={adminInputClass} value={form.vendor_invoice_date} onChange={(e) => setForm({ ...form, vendor_invoice_date: e.target.value })} /></AdminField>
          <AdminField label="Currency">
            <select className={adminSelectClass} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {BILLING_CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </AdminField>
          <AdminField label="Taxable Amount"><input className={adminInputClass} value={form.taxable_amount} onChange={(e) => applyGst(e.target.value, form.gst_rate, form.split)} /></AdminField>
          <AdminField label="GST %">
            <select className={adminSelectClass} value={form.gst_rate} onChange={(e) => applyGst(form.taxable_amount, e.target.value, form.split)}>
              {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </AdminField>
          <AdminField label="Tax split">
            <select className={adminSelectClass} value={form.split} onChange={(e) => applyGst(form.taxable_amount, form.gst_rate, e.target.value)}>
              <option value="igst">IGST</option>
              <option value="cgst_sgst">CGST + SGST</option>
              <option value="none">No GST</option>
            </select>
          </AdminField>
          <AdminField label="CGST"><input className={adminInputClass} value={form.cgst} onChange={(e) => setForm({ ...form, cgst: e.target.value })} /></AdminField>
          <AdminField label="SGST"><input className={adminInputClass} value={form.sgst} onChange={(e) => setForm({ ...form, sgst: e.target.value })} /></AdminField>
          <AdminField label="IGST"><input className={adminInputClass} value={form.igst} onChange={(e) => setForm({ ...form, igst: e.target.value })} /></AdminField>
          <AdminField label="Other Tax"><input className={adminInputClass} value={form.other_tax} onChange={(e) => setForm({ ...form, other_tax: e.target.value })} /></AdminField>
          <AdminField label="Total Amount"><input className={adminInputClass} readOnly value={total.toFixed(2)} /></AdminField>
          <AdminField label="TDS"><input className={adminInputClass} value={form.tds_amount} onChange={(e) => setForm({ ...form, tds_amount: e.target.value })} /></AdminField>
          <AdminField label="Amount Paid"><input className={adminInputClass} value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></AdminField>
          <AdminField label="Payment Date"><input type="date" className={adminInputClass} value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></AdminField>
          <AdminField label="Payment Mode">
            <select className={adminSelectClass} value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
              {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </AdminField>
          <AdminField label="Bank / Card"><input className={adminInputClass} value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} /></AdminField>
          <AdminField label="Transaction Reference"><input className={adminInputClass} value={form.transaction_reference} onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })} /></AdminField>
          <AdminField label="Project Reference">
            <select className={adminSelectClass} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">None</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Client Reference">
            <select className={adminSelectClass} value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">None</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Notes" span={3}><textarea className={adminTextareaClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></AdminField>
          <AdminField label="Supporting Document" span={3}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </AdminField>
        </AdminFormGrid>
        <AdminButton className="mt-4" variant="primary" onClick={save}>Save receipt</AdminButton>
      </AdminSection>
    </FinanceShell>
  );
}
