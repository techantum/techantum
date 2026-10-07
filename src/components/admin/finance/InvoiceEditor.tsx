'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminSection from '@/components/admin/AdminSection';
import AdminAlert from '@/components/admin/AdminAlert';
import { calculateInvoice } from '@/lib/finance/calculate';
import { GST_RATES, INDIAN_STATES } from '@/lib/finance/gst';
import { todayISO } from '@/lib/finance/fy';
import { money } from '@/components/admin/finance/FinanceUi';

type Item = {
  description: string;
  sac_hsn: string;
  quantity: string;
  rate: string;
  discount_percentage: string;
  gst_rate: string;
  service_id: string;
};

const emptyItem = (): Item => ({
  description: '',
  sac_hsn: '',
  quantity: '1',
  rate: '0',
  discount_percentage: '0',
  gst_rate: '18',
  service_id: '',
});

export default function InvoiceEditor({ invoiceId }: { invoiceId?: string }) {
  const router = useRouter();
  const [clients, setClients] = useState<Record<string, unknown>[]>([]);
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [services, setServices] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    invoice_date: todayISO(),
    due_date: '',
    project_id: '',
    purchase_order_number: '',
    work_order_number: '',
    currency: 'INR',
    place_of_supply: '',
    place_of_supply_state_code: '',
    tax_treatment: 'auto',
    notes: '',
    terms: '',
    client_name: '',
    client_address: '',
    client_gstin: '',
    client_pan: '',
    client_state: '',
    client_state_code: '',
    client_email: '',
    client_phone: '',
    client_city: '',
    client_pincode: '',
    client_country: 'India',
  });
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/finance/clients').then((r) => r.json()),
      fetch('/api/admin/finance/services?active=1').then((r) => r.json()),
      fetch('/api/admin/finance/settings').then((r) => r.json()),
    ]).then(([c, s, st]) => {
      setClients(Array.isArray(c) ? c : []);
      setServices(Array.isArray(s) ? s : []);
      setSettings(st);
      if (st?.default_terms && !invoiceId) setForm((f) => ({ ...f, terms: st.default_terms || '', notes: st.default_notes || '' }));
    });
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId) return;
    fetch(`/api/admin/finance/invoices/${invoiceId}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load invoice');
        const inv = body.invoice;
        setStatus(inv.invoice_status);
        setForm({
          client_id: inv.client_id,
          invoice_date: inv.invoice_date,
          due_date: inv.due_date || '',
          project_id: inv.project_id || '',
          purchase_order_number: inv.purchase_order_number || '',
          work_order_number: inv.work_order_number || '',
          currency: inv.currency || 'INR',
          place_of_supply: inv.place_of_supply || '',
          place_of_supply_state_code: inv.place_of_supply_state_code || '',
          tax_treatment: inv.tax_treatment || 'auto',
          notes: inv.notes || '',
          terms: inv.terms || '',
          client_name: inv.client_name || '',
          client_address: inv.client_address || '',
          client_gstin: inv.client_gstin || '',
          client_pan: inv.client_pan || '',
          client_state: inv.client_state || '',
          client_state_code: inv.client_state_code || '',
          client_email: inv.client_email || '',
          client_phone: inv.client_phone || '',
          client_city: inv.client_city || '',
          client_pincode: inv.client_pincode || '',
          client_country: inv.client_country || 'India',
        });
        setItems(
          (body.items || []).map((item: Record<string, string>) => ({
            description: item.description,
            sac_hsn: item.sac_hsn || '',
            quantity: String(item.quantity),
            rate: String(item.rate),
            discount_percentage: String(item.discount_percentage || '0'),
            gst_rate: String(Number(item.gst_rate)),
            service_id: item.service_id || '',
          }))
        );
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, [invoiceId]);

  useEffect(() => {
    if (!form.client_id) return;
    fetch(`/api/admin/finance/projects?clientId=${form.client_id}`)
      .then((r) => r.json())
      .then((rows) => setProjects(Array.isArray(rows) ? rows : []));
  }, [form.client_id]);

  const applyClient = (id: string) => {
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    setForm((f) => ({
      ...f,
      client_id: id,
      client_name: String(client.name || ''),
      client_address: String(client.billing_address || [client.address_line1, client.address_line2].filter(Boolean).join(', ') || client.location || ''),
      currency: String(client.default_currency || f.currency || 'INR'),
      client_gstin: String(client.gstin || ''),
      client_pan: String(client.pan || ''),
      client_state: String(client.state || ''),
      client_state_code: String(client.state_code || ''),
      client_email: String(client.email || ''),
      client_phone: String(client.contact_number || ''),
      client_city: String(client.city || ''),
      client_pincode: String(client.pincode || ''),
      client_country: String(client.country || 'India'),
      place_of_supply: String(client.state || f.place_of_supply),
      place_of_supply_state_code: String(client.state_code || f.place_of_supply_state_code),
    }));
  };

  const preview = useMemo(() => {
    try {
      return calculateInvoice({
        items: items.filter((i) => i.description.trim()),
        supplierStateCode: String(settings?.state_code || ''),
        placeOfSupplyStateCode: form.place_of_supply_state_code || form.place_of_supply,
        taxTreatment: form.tax_treatment as 'auto',
      });
    } catch {
      return null;
    }
  }, [items, form.place_of_supply_state_code, form.place_of_supply, form.tax_treatment, settings]);

  const locked = status !== 'draft';

  const save = async (finalize = false) => {
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, items };
      const res = await fetch(invoiceId ? `/api/admin/finance/invoices/${invoiceId}` : '/api/admin/finance/invoices', {
        method: invoiceId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      const id = invoiceId || body.id;
      if (finalize) {
        const fin = await fetch(`/api/admin/finance/invoices/${id}/finalize`, { method: 'POST' });
        const finBody = await fin.json();
        if (!fin.ok) throw new Error(finBody.error || 'Finalize failed');
      }
      router.push(`/admin/finance/invoices/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {locked && <AdminAlert variant="info">This invoice is {status}. Drafts can be edited; finalized invoices are locked.</AdminAlert>}
      <AdminSection title="Client">
        <AdminFormGrid>
          <AdminField label="Client" span={2}>
            <select className={adminSelectClass} disabled={locked} value={form.client_id} onChange={(e) => applyClient(e.target.value)}>
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name)} ({String(c.client_code)})
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Company / name">
            <input className={adminInputClass} disabled={locked} value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
          </AdminField>
          <AdminField label="GSTIN">
            <input className={adminInputClass} disabled={locked} value={form.client_gstin} onChange={(e) => setForm({ ...form, client_gstin: e.target.value })} />
          </AdminField>
          <AdminField label="PAN">
            <input className={adminInputClass} disabled={locked} value={form.client_pan} onChange={(e) => setForm({ ...form, client_pan: e.target.value })} />
          </AdminField>
          <AdminField label="Email">
            <input className={adminInputClass} disabled={locked} value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} />
          </AdminField>
          <AdminField label="Phone">
            <input className={adminInputClass} disabled={locked} value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} />
          </AdminField>
          <AdminField label="State">
            <select
              className={adminSelectClass}
              disabled={locked}
              value={form.client_state_code}
              onChange={(e) => {
                const st = INDIAN_STATES.find((s) => s.code === e.target.value);
                setForm({ ...form, client_state_code: e.target.value, client_state: st?.name || form.client_state });
              }}
            >
              <option value="">Select</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} — {s.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Billing address" span={3}>
            <textarea className={adminTextareaClass} disabled={locked} value={form.client_address} onChange={(e) => setForm({ ...form, client_address: e.target.value })} />
          </AdminField>
        </AdminFormGrid>
      </AdminSection>
      <AdminSection title="Invoice details">
        <AdminFormGrid>
          <AdminField label="Invoice date">
            <input type="date" className={adminInputClass} disabled={locked} value={form.invoice_date} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
          </AdminField>
          <AdminField label="Due date">
            <input type="date" className={adminInputClass} disabled={locked} value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </AdminField>
          <AdminField label="Project">
            <select className={adminSelectClass} disabled={locked} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">None</option>
              {projects.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.project_name)}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="PO number">
            <input className={adminInputClass} disabled={locked} value={form.purchase_order_number} onChange={(e) => setForm({ ...form, purchase_order_number: e.target.value })} />
          </AdminField>
          <AdminField label="Work order">
            <input className={adminInputClass} disabled={locked} value={form.work_order_number} onChange={(e) => setForm({ ...form, work_order_number: e.target.value })} />
          </AdminField>
          <AdminField label="Place of supply">
            <select
              className={adminSelectClass}
              disabled={locked}
              value={form.place_of_supply_state_code}
              onChange={(e) => {
                const st = INDIAN_STATES.find((s) => s.code === e.target.value);
                setForm({ ...form, place_of_supply_state_code: e.target.value, place_of_supply: st?.name || '' });
              }}
            >
              <option value="">Select</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Tax treatment">
            <select className={adminSelectClass} disabled={locked} value={form.tax_treatment} onChange={(e) => setForm({ ...form, tax_treatment: e.target.value })}>
              <option value="auto">Auto (CGST+SGST if same state, else IGST)</option>
              <option value="cgst_sgst">Force CGST + SGST</option>
              <option value="igst">Force IGST</option>
              <option value="none">No GST</option>
            </select>
          </AdminField>
          <AdminField label="Notes" span={3}>
            <textarea className={adminTextareaClass} disabled={locked} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </AdminField>
        </AdminFormGrid>
      </AdminSection>
      <AdminSection
        title="Line items"
        action={
          !locked && (
            <AdminButton size="sm" onClick={() => setItems([...items, emptyItem()])}>
              Add item
            </AdminButton>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-400">
                <th className="p-2">Service</th>
                <th className="p-2">Description</th>
                <th className="p-2">SAC/HSN</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Rate</th>
                <th className="p-2">Disc %</th>
                <th className="p-2">GST %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="p-1">
                    <select
                      className={adminSelectClass}
                      disabled={locked}
                      value={item.service_id}
                      onChange={(e) => {
                        const svc = services.find((s) => s.id === e.target.value);
                        const next = [...items];
                        next[index] = {
                          ...item,
                          service_id: e.target.value,
                          description: svc ? String(svc.service_name) : item.description,
                          sac_hsn: svc ? String(svc.sac_hsn || '') : item.sac_hsn,
                          rate: svc ? String(svc.default_rate || item.rate) : item.rate,
                          gst_rate: svc ? String(Number(svc.gst_rate)) : item.gst_rate,
                        };
                        setItems(next);
                      }}
                    >
                      <option value="">Custom</option>
                      {services.map((s) => (
                        <option key={String(s.id)} value={String(s.id)}>
                          {String(s.service_name)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    <input className={adminInputClass} disabled={locked} value={item.description} onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, description: e.target.value };
                      setItems(next);
                    }} />
                  </td>
                  <td className="p-1 w-24">
                    <input className={adminInputClass} disabled={locked} value={item.sac_hsn} onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, sac_hsn: e.target.value };
                      setItems(next);
                    }} />
                  </td>
                  <td className="p-1 w-20">
                    <input className={adminInputClass} disabled={locked} value={item.quantity} onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, quantity: e.target.value };
                      setItems(next);
                    }} />
                  </td>
                  <td className="p-1 w-24">
                    <input className={adminInputClass} disabled={locked} value={item.rate} onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, rate: e.target.value };
                      setItems(next);
                    }} />
                  </td>
                  <td className="p-1 w-20">
                    <input className={adminInputClass} disabled={locked} value={item.discount_percentage} onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, discount_percentage: e.target.value };
                      setItems(next);
                    }} />
                  </td>
                  <td className="p-1 w-24">
                    <select className={adminSelectClass} disabled={locked} value={item.gst_rate} onChange={(e) => {
                      const next = [...items];
                      next[index] = { ...item, gst_rate: e.target.value };
                      setItems(next);
                    }}>
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>
                          {r}%
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1">
                    {!locked && items.length > 1 && (
                      <button type="button" className="text-xs text-rose-600" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {preview && (
          <div className="ml-auto max-w-sm space-y-1 pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{money(preview.subtotal)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>{money(preview.discount)}</span></div>
            <div className="flex justify-between"><span>Taxable</span><span>{money(preview.taxable_amount)}</span></div>
            <div className="flex justify-between"><span>CGST</span><span>{money(preview.cgst)}</span></div>
            <div className="flex justify-between"><span>SGST</span><span>{money(preview.sgst)}</span></div>
            <div className="flex justify-between"><span>IGST</span><span>{money(preview.igst)}</span></div>
            <div className="flex justify-between"><span>Round off</span><span>{money(preview.round_off)}</span></div>
            <div className="flex justify-between font-semibold"><span>Grand total</span><span>{money(preview.total_amount)}</span></div>
            <p className="text-[11px] text-slate-400">Preview only. Totals are recalculated on the server.</p>
          </div>
        )}
      </AdminSection>
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="primary" disabled={saving} onClick={() => save(true)}>
            {saving ? 'Creating…' : 'Create invoice'}
          </AdminButton>
        </div>
      )}
    </div>
  );
}
