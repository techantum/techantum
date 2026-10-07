'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { FinanceShell, FinanceTd, FinanceTh, Pager } from '@/components/admin/finance/FinanceUi';

const TYPES = [
  ['client_invoice', 'Client Invoices'],
  ['vendor_bill', 'Vendor Bills'],
  ['receipt', 'Receipts'],
  ['payslip', 'Payslips'],
  ['bank_statement', 'Bank Statements'],
  ['tax_document', 'Tax Documents'],
  ['other', 'Other Documents'],
];

const REFERENCES = ['client', 'invoice', 'vendor', 'receipt', 'employee', 'payslip', 'transaction'];

export default function DocumentsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('other');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page: String(page) });
    if (type) params.set('documentType', type);
    fetch(`/api/admin/finance/documents?${params}`).then((r) => r.json()).then((b) => {
      setRows(b.rows || []);
      setTotal(b.total || 0);
    });
  };
  useEffect(() => { load(); }, [page, type]);

  const upload = async () => {
    if (!file) return;
    const form = new FormData();
    form.set('file', file);
    form.set('documentType', uploadType);
    if (referenceType) form.set('referenceType', referenceType);
    if (referenceId) form.set('referenceId', referenceId);
    await fetch('/api/admin/finance/documents', { method: 'POST', body: form });
    setFile(null);
    load();
  };

  return (
    <FinanceShell>
      <AdminPageHeader title="Documents" description="Private finance files. Downloads require admin authentication — storage paths are not public." />
      <AdminSection title="Upload">
        <div className="flex flex-wrap items-end gap-2">
          <select className={`${adminSelectClass} w-48`} value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
            {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
          <select className={`${adminSelectClass} w-44`} value={referenceType} onChange={(e) => setReferenceType(e.target.value)}>
            <option value="">Link to…</option>
            {REFERENCES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className={`${adminInputClass} w-56`} placeholder="Linked record ID" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} />
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <AdminButton variant="primary" onClick={upload}>Upload</AdminButton>
        </div>
      </AdminSection>
      <AdminSection title="Library">
        <select className={`${adminSelectClass} mb-3 w-56`} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <table className="w-full">
          <thead><tr><FinanceTh>File</FinanceTh><FinanceTh>Type</FinanceTh><FinanceTh>Linked</FinanceTh><FinanceTh>Date</FinanceTh><FinanceTh>FY</FinanceTh></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <FinanceTd><a className="text-secondary hover:underline" href={`/api/admin/finance/documents/${r.id}/download`} target="_blank" rel="noreferrer">{r.original_filename}</a></FinanceTd>
                <FinanceTd>{r.document_type.replace(/_/g, ' ')}</FinanceTd>
                <FinanceTd>{r.reference_type ? `${r.reference_type} ${String(r.reference_id || '').slice(0, 8)}` : '—'}</FinanceTd>
                <FinanceTd>{r.document_date || r.uploaded_at?.slice(0,10)}</FinanceTd>
                <FinanceTd>{r.financial_year}</FinanceTd>
              </tr>
            ))}
          </tbody>
        </table>
        <Pager page={page} pageSize={25} total={total} onPage={setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
