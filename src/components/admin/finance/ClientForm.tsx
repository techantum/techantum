'use client';

import { useEffect, useState } from 'react';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import Link from 'next/link';
import AdminSection from '@/components/admin/AdminSection';
import { BILLING_CURRENCIES, INDIAN_STATES } from '@/lib/finance/gst';
import { CLIENT_TYPES, isIndianClientType } from '@/lib/finance/client-types';
import { useMasterItems } from '@/components/admin/useMasterItems';

export default function ClientForm({
  initial,
  onSubmit,
  saving,
  submitLabel,
  cancelHref,
}: {
  initial?: Record<string, unknown>;
  onSubmit: (payload: Record<string, unknown>) => void;
  saving?: boolean;
  submitLabel: string;
  cancelHref?: string;
}) {
  const [form, setForm] = useState({
    name: '',
    client_type: 'indian_business',
    contact_person: '',
    email: '',
    contact_number: '',
    alternate_phone: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: '',
    district: '',
    state: '',
    state_code: '',
    pincode: '',
    country: 'India',
    gst_registered: false,
    gstin: '',
    pan: '',
    legal_business_name: '',
    trade_name: '',
    tax_vat_number: '',
    business_registration_number: '',
    company_registration_number: '',
    default_currency: 'INR',
    default_payment_terms: '',
    billing_notes: '',
    status: 'active',
  });

  useEffect(() => {
    if (!initial) return;
    setForm((f) => ({
      ...f,
      ...Object.fromEntries(Object.keys(f).map((key) => [key, initial[key] ?? (f as Record<string, unknown>)[key]])),
      gst_registered: Boolean(initial.gst_registered),
      name: String(initial.name || ''),
    }));
  }, [initial]);

  const clientTypes = useMasterItems('client_type', CLIENT_TYPES.map((type) => ({ value: type.value, label: type.label, parent: type.region })));
  const currencies = useMasterItems('currency', BILLING_CURRENCIES.map((currency) => ({ value: currency, label: currency })));
  const statuses = useMasterItems('record_status', [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ]);
  const selectedType = clientTypes.find((type) => type.value === form.client_type);
  const indian = selectedType ? selectedType.parent === 'india' || selectedType.value.startsWith('indian_') : isIndianClientType(form.client_type);

  return (
    <>
      <AdminSection title="Basic Information" icon="UserIcon">
        <AdminFormGrid>
          <AdminField label="Company / Client Name" span={2}>
            <input className={adminInputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </AdminField>
          <AdminField label="Client Type">
            <select
              className={adminSelectClass}
              value={form.client_type}
              onChange={(e) => {
                const type = e.target.value;
                const nextIndian = isIndianClientType(type);
                setForm({
                  ...form,
                  client_type: type,
                  country: nextIndian ? 'India' : form.country === 'India' ? '' : form.country,
                  default_currency: nextIndian ? 'INR' : form.default_currency === 'INR' ? 'USD' : form.default_currency,
                });
              }}
            >
              {clientTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </AdminField>
          <AdminField label="Contact Person"><input className={adminInputClass} value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></AdminField>
          <AdminField label="Email"><input className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></AdminField>
          <AdminField label={indian ? 'Primary Phone' : 'Phone'}><input className={adminInputClass} value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} /></AdminField>
          {indian && <AdminField label="Alternate Phone"><input className={adminInputClass} value={form.alternate_phone} onChange={(e) => setForm({ ...form, alternate_phone: e.target.value })} /></AdminField>}
          <AdminField label="Website"><input className={adminInputClass} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></AdminField>
        </AdminFormGrid>
      </AdminSection>
      <AdminSection title="Address" icon="MapPinIcon">
        <AdminFormGrid>
          <AdminField label="Address Line 1" span={2}><input className={adminInputClass} value={form.address_line1} onChange={(e) => setForm({ ...form, address_line1: e.target.value })} /></AdminField>
          <AdminField label="Address Line 2" span={2}><input className={adminInputClass} value={form.address_line2} onChange={(e) => setForm({ ...form, address_line2: e.target.value })} /></AdminField>
          <AdminField label="City"><input className={adminInputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></AdminField>
          {indian && <AdminField label="District"><input className={adminInputClass} value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></AdminField>}
          <AdminField label={indian ? 'State' : 'State / Province / Region'}>
            {indian ? (
              <select
                className={adminSelectClass}
                value={form.state_code}
                onChange={(e) => {
                  const st = INDIAN_STATES.find((s) => s.code === e.target.value);
                  setForm({ ...form, state_code: e.target.value, state: st?.name || '' });
                }}
              >
                <option value="">Select</option>
                {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            ) : (
              <input className={adminInputClass} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            )}
          </AdminField>
          {indian && <AdminField label="State Code"><input className={adminInputClass} readOnly value={form.state_code} /></AdminField>}
          <AdminField label={indian ? 'Pincode' : 'Postal Code'}><input className={adminInputClass} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></AdminField>
          <AdminField label="Country">
            {indian ? <input className={adminInputClass} readOnly value="India" /> : <input className={adminInputClass} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />}
          </AdminField>
        </AdminFormGrid>
      </AdminSection>
      <AdminSection title={indian ? 'Tax Information' : 'Business / Tax Information'} icon="DocumentTextIcon">
        <AdminFormGrid>
          {indian && (
            <>
              <AdminField label="GST Registered">
                <select className={adminSelectClass} value={form.gst_registered ? 'yes' : 'no'} onChange={(e) => setForm({ ...form, gst_registered: e.target.value === 'yes' })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </AdminField>
              <AdminField label="GSTIN"><input className={adminInputClass} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder={form.gst_registered ? 'Required' : 'Optional'} /></AdminField>
              <AdminField label="PAN"><input className={adminInputClass} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></AdminField>
              <AdminField label="Legal Business Name"><input className={adminInputClass} value={form.legal_business_name} onChange={(e) => setForm({ ...form, legal_business_name: e.target.value })} /></AdminField>
              <AdminField label="Trade Name"><input className={adminInputClass} value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} /></AdminField>
            </>
          )}
          {!indian && (
            <>
              <AdminField label="Tax / VAT Number"><input className={adminInputClass} value={form.tax_vat_number} onChange={(e) => setForm({ ...form, tax_vat_number: e.target.value })} /></AdminField>
              <AdminField label="Business Registration Number"><input className={adminInputClass} value={form.business_registration_number} onChange={(e) => setForm({ ...form, business_registration_number: e.target.value })} /></AdminField>
              <AdminField label="Company Registration Number"><input className={adminInputClass} value={form.company_registration_number} onChange={(e) => setForm({ ...form, company_registration_number: e.target.value })} /></AdminField>
            </>
          )}
        </AdminFormGrid>
      </AdminSection>
      <AdminSection title="Billing" icon="BanknotesIcon">
        <AdminFormGrid>
          <AdminField label="Default Currency">
            <select className={adminSelectClass} value={form.default_currency} onChange={(e) => setForm({ ...form, default_currency: e.target.value })}>
              {currencies.map((c) => <option key={c.value}>{c.label}</option>)}
            </select>
          </AdminField>
          <AdminField label="Default Payment Terms"><input className={adminInputClass} value={form.default_payment_terms} onChange={(e) => setForm({ ...form, default_payment_terms: e.target.value })} /></AdminField>
          <AdminField label="Status">
            <select className={adminSelectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </AdminField>
          <AdminField label="Notes" span={4}><textarea className={adminTextareaClass} value={form.billing_notes} onChange={(e) => setForm({ ...form, billing_notes: e.target.value })} /></AdminField>
        </AdminFormGrid>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminButton variant="primary" disabled={saving} onClick={() => onSubmit(form)}>{submitLabel}</AdminButton>
          {cancelHref && <Link href={cancelHref}><AdminButton>Cancel</AdminButton></Link>}
        </div>
      </AdminSection>
    </>
  );
}
