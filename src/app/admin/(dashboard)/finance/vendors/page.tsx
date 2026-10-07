'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import { FinanceLink, FinanceShell, FinanceTd, FinanceTh, Pager, money } from '@/components/admin/finance/FinanceUi';

export default function VendorsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ vendor_name: '', gstin: '', pan: '', email: '', phone: '', city: '', state: '' });

  const load = () => {
    fetch(`/api/admin/finance/vendors?page=${page}`).then((r) => r.json()).then((b) => {
      setRows(b.rows || []);
      setTotal(b.total || 0);
    });
  };
  useEffect(() => { load(); }, [page]);

  const save = async () => {
    await fetch('/api/admin/finance/vendors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ vendor_name: '', gstin: '', pan: '', email: '', phone: '', city: '', state: '' });
    load();
  };

  return (
    <FinanceShell>
      <AdminPageHeader title="Vendors" description="Supplier master for bills and expense payments." />
      <AdminSection title="Add vendor">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <AdminField label="Name"><input className={adminInputClass} value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></AdminField>
          <AdminField label="GSTIN"><input className={adminInputClass} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></AdminField>
          <AdminField label="PAN"><input className={adminInputClass} value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></AdminField>
          <AdminField label="Email"><input className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></AdminField>
          <AdminField label="Phone"><input className={adminInputClass} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></AdminField>
          <AdminField label="City"><input className={adminInputClass} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></AdminField>
        </div>
        <AdminButton className="mt-3" variant="primary" onClick={save}>Save vendor</AdminButton>
      </AdminSection>
      <AdminSection title="Vendors">
        <table className="w-full">
          <thead><tr><FinanceTh>Name</FinanceTh><FinanceTh>GSTIN</FinanceTh><FinanceTh>Bills</FinanceTh><FinanceTh>Expense</FinanceTh><FinanceTh>Outstanding</FinanceTh></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <FinanceTd><FinanceLink href={`/admin/finance/vendors/${r.id}`}>{r.vendor_name}</FinanceLink></FinanceTd>
                <FinanceTd>{r.gstin || '—'}</FinanceTd>
                <FinanceTd>{r.total_bills}</FinanceTd>
                <FinanceTd>{money(r.total_expense)}</FinanceTd>
                <FinanceTd>{money(r.outstanding_amount)}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} pageSize={25} total={total} onPage={setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
