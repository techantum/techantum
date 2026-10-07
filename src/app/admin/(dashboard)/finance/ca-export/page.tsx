'use client';

import { useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminAlert from '@/components/admin/AdminAlert';
import { FinanceShell } from '@/components/admin/finance/FinanceUi';
import { currentFinancialYear } from '@/lib/finance/fy';

const KINDS = [
  ['invoices', 'Invoice Register'],
  ['invoice-payments', 'Invoice Payment Register'],
  ['receipts', 'Receipt Register'],
  ['transactions', 'Transaction Register'],
  ['payslips', 'Salary / Payslip Summary'],
  ['gst', 'GST Summary'],
  ['tds', 'TDS Summary'],
];

export default function CaExportPage() {
  const [fy, setFy] = useState(currentFinancialYear().label);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const download = async (kind: string) => {
    setBusy(kind);
    setError('');
    try {
      const res = await fetch(`/api/admin/finance/ca-export?kind=${kind}&fy=${encodeURIComponent(fy)}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${kind}-${fy}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setBusy('');
    }
  };

  const zip = async () => {
    setBusy('zip');
    setError('');
    try {
      const res = await fetch('/api/admin/finance/ca-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fy }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Package failed');
      const blob = await res.blob();
      const dispo = res.headers.get('Content-Disposition') || '';
      const match = dispo.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = match?.[1] || `Techantum_Finance_${fy}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Package failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <FinanceShell>
      <AdminPageHeader title="CA Export" description="Excel registers and a ZIP of registers plus supporting documents. Income and expense registers are replaced by invoice and receipt registers." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      <AdminSection title="Period">
        <AdminField label="Financial year">
          <input className={`${adminInputClass} max-w-xs`} value={fy} onChange={(e) => setFy(e.target.value)} placeholder="2026-27" />
        </AdminField>
      </AdminSection>
      <AdminSection title="Excel registers">
        <div className="flex flex-wrap gap-2">
          {KINDS.map(([id, label]) => (
            <AdminButton key={id} disabled={!!busy} onClick={() => download(id)}>
              {busy === id ? 'Preparing…' : label}
            </AdminButton>
          ))}
        </div>
      </AdminSection>
      <AdminSection title="CA package" description="Registers/ plus Client_Invoices, Vendor_Bills, Receipts, Payslips and Other_Documents.">
        <AdminButton variant="primary" disabled={!!busy} onClick={zip}>
          {busy === 'zip' ? 'Building ZIP…' : 'Generate CA package'}
        </AdminButton>
      </AdminSection>
    </FinanceShell>
  );
}
