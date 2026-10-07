'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminAlert from '@/components/admin/AdminAlert';
import { FinanceShell } from '@/components/admin/finance/FinanceUi';
import { INDIAN_STATES } from '@/lib/finance/gst';

const FLAGS = [
  ['show_logo', 'Logo'],
  ['show_pan', 'PAN'],
  ['show_client_gstin', 'Client GSTIN'],
  ['show_sac', 'SAC/HSN'],
  ['show_po', 'PO number'],
  ['show_project', 'Project'],
  ['show_due_date', 'Due date'],
  ['show_bank_details', 'Bank details'],
  ['show_qr', 'Payment QR'],
  ['show_terms', 'Terms'],
  ['show_notes', 'Notes'],
  ['show_signature', 'Signature'],
  ['show_seal', 'Seal'],
];

export default function FinanceSettingsPage() {
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [services, setServices] = useState<Record<string, string>[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    fetch('/api/admin/finance/settings').then((r) => r.json()).then(setForm);
    fetch('/api/admin/finance/services').then((r) => r.json()).then((rows) => setServices(Array.isArray(rows) ? rows : []));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    const res = await fetch('/api/admin/finance/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Save failed');
    setForm(body);
    setMessage('Settings saved. Existing finalized PDFs stay unchanged until regenerated.');
  };

  const upload = async (field: string, file: File) => {
    const data = new FormData();
    data.set('file', file);
    data.set('field', field);
    const res = await fetch('/api/admin/finance/settings/file', { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Upload failed');
    setForm(body);
    setMessage('File uploaded');
  };

  if (!form) return <p className="text-sm text-slate-500">Loading settings…</p>;

  return (
    <FinanceShell>
      <AdminPageHeader title="Finance settings" description="Company identity, invoice numbering, PDF sections and reusable services." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {message && <AdminAlert>{message}</AdminAlert>}
      <AdminSection title="Company">
        <AdminFormGrid>
          <AdminField label="Company name"><input className={adminInputClass} value={String(form.company_name || '')} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></AdminField>
          <AdminField label="GSTIN"><input className={adminInputClass} value={String(form.gstin || '')} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></AdminField>
          <AdminField label="PAN"><input className={adminInputClass} value={String(form.pan || '')} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></AdminField>
          <AdminField label="CIN"><input className={adminInputClass} value={String(form.cin || '')} onChange={(e) => setForm({ ...form, cin: e.target.value })} /></AdminField>
          <AdminField label="State">
            <select className={adminSelectClass} value={String(form.state_code || '')} onChange={(e) => {
              const st = INDIAN_STATES.find((s) => s.code === e.target.value);
              setForm({ ...form, state_code: e.target.value, state: st?.name || form.state });
            }}>
              <option value="">Select</option>
              {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </AdminField>
          <AdminField label="Phone"><input className={adminInputClass} value={String(form.phone || '')} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></AdminField>
          <AdminField label="Email"><input className={adminInputClass} value={String(form.email || '')} onChange={(e) => setForm({ ...form, email: e.target.value })} /></AdminField>
          <AdminField label="Website"><input className={adminInputClass} value={String(form.website || '')} onChange={(e) => setForm({ ...form, website: e.target.value })} /></AdminField>
          <AdminField label="Registered address" span={3}><textarea className={adminTextareaClass} value={String(form.registered_address || '')} onChange={(e) => setForm({ ...form, registered_address: e.target.value })} /></AdminField>
          <AdminField label="Billing address" span={3}><textarea className={adminTextareaClass} value={String(form.billing_address || '')} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} /></AdminField>
        </AdminFormGrid>
      </AdminSection>
      <AdminSection title="Bank / UPI">
        <AdminFormGrid>
          <AdminField label="Bank"><input className={adminInputClass} value={String(form.bank_name || '')} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></AdminField>
          <AdminField label="Account name"><input className={adminInputClass} value={String(form.account_name || '')} onChange={(e) => setForm({ ...form, account_name: e.target.value })} /></AdminField>
          <AdminField label="Account number"><input className={adminInputClass} value={String(form.account_number || '')} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></AdminField>
          <AdminField label="IFSC"><input className={adminInputClass} value={String(form.ifsc || '')} onChange={(e) => setForm({ ...form, ifsc: e.target.value })} /></AdminField>
          <AdminField label="Branch"><input className={adminInputClass} value={String(form.branch || '')} onChange={(e) => setForm({ ...form, branch: e.target.value })} /></AdminField>
          <AdminField label="UPI ID"><input className={adminInputClass} value={String(form.upi_id || '')} onChange={(e) => setForm({ ...form, upi_id: e.target.value })} /></AdminField>
        </AdminFormGrid>
      </AdminSection>
      <AdminSection title="Invoice numbering">
        <AdminFormGrid>
          <AdminField label="Prefix"><input className={adminInputClass} value={String(form.invoice_number_prefix || '')} onChange={(e) => setForm({ ...form, invoice_number_prefix: e.target.value })} /></AdminField>
          <AdminField label="Separator"><input className={adminInputClass} value={String(form.invoice_number_separator || '')} onChange={(e) => setForm({ ...form, invoice_number_separator: e.target.value })} /></AdminField>
          <AdminField label="Sequence length"><input className={adminInputClass} value={String(form.invoice_number_sequence_length || 3)} onChange={(e) => setForm({ ...form, invoice_number_sequence_length: Number(e.target.value) })} /></AdminField>
          <AdminField label="FY style">
            <select className={adminSelectClass} value={String(form.invoice_number_fy_style || 'short')} onChange={(e) => setForm({ ...form, invoice_number_fy_style: e.target.value })}>
              <option value="short">26-27</option>
              <option value="full">2026-27</option>
            </select>
          </AdminField>
        </AdminFormGrid>
        <p className="text-xs text-slate-500">Example: {String(form.invoice_number_prefix || 'TS')}{String(form.invoice_number_separator || '/')}{form.invoice_number_fy_style === 'full' ? '2026-27' : '26-27'}{String(form.invoice_number_separator || '/')}{'1'.padStart(Number(form.invoice_number_sequence_length || 3), '0')}</p>
      </AdminSection>
      <AdminSection title="PDF sections">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {FLAGS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="Defaults">
        <AdminField label="Terms"><textarea className={adminTextareaClass} value={String(form.default_terms || '')} onChange={(e) => setForm({ ...form, default_terms: e.target.value })} /></AdminField>
        <AdminField label="Notes"><textarea className={adminTextareaClass} value={String(form.default_notes || '')} onChange={(e) => setForm({ ...form, default_notes: e.target.value })} /></AdminField>
      </AdminSection>
      <AdminSection title="Logo, QR, signature, seal">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 text-sm">
          {[['logo_path', 'Company logo'], ['payment_qr_path', 'Payment QR'], ['signature_path', 'Signature'], ['seal_path', 'Seal']].map(([field, label]) => (
            <div key={field}>
              <p className="mb-1 font-medium">{label}</p>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && upload(field, e.target.files[0])} />
            </div>
          ))}
        </div>
      </AdminSection>
      <AdminButton variant="primary" onClick={save}>Save settings</AdminButton>
      <AdminSection title="Service master" description="Selecting a service on an invoice fills defaults. Invoice lines can still be edited.">
        <table className="w-full text-sm">
          <thead><tr><th className="text-left">Name</th><th>SAC</th><th>Rate</th><th>GST</th></tr></thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}><td>{s.service_name}</td><td>{s.sac_hsn}</td><td>{s.default_rate}</td><td>{s.gst_rate}%</td></tr>
            ))}
          </tbody>
        </table>
      </AdminSection>
    </FinanceShell>
  );
}
