'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, financialYearChoices, useListFilters } from '@/components/admin/ListFilters';
import { FinanceShell, FinanceTd, FinanceTh, Pager, TypePill } from '@/components/admin/finance/FinanceUi';
import { currentFinancialYear } from '@/lib/finance/fy';
import Icon from '@/components/ui/AppIcon';
import { useMasterItems } from '@/components/admin/useMasterItems';

const TYPES = [
  ['client_invoice', 'Invoice'],
  ['vendor_bill', 'Vendor bill'],
  ['vendor_invoice', 'Vendor invoice'],
  ['receipt', 'Receipt'],
  ['payslip', 'Payslip'],
  ['bank_statement', 'Bank statement'],
  ['tax_document', 'Tax document'],
  ['other', 'Other'],
];

const REFERENCES = [
  ['client', 'Client'],
  ['invoice', 'Invoice'],
  ['vendor', 'Vendor'],
  ['receipt', 'Receipt'],
  ['employee', 'Employee'],
  ['payslip', 'Payslip'],
  ['transaction', 'Transaction'],
];

const documentFilters = { q: '', documentType: '', referenceType: '', fy: currentFinancialYear().label };

function labelOf(options: string[][], value: string) {
  return options.find(([id]) => id === value)?.[1] || value.replace(/_/g, ' ');
}

function dmy(value: unknown) {
  const text = String(value || '').slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

export default function DocumentsPage() {
  const typeOptions = useMasterItems('document_type', TYPES.map(([value, label]) => ({ value, label })));
  const linkOptions = useMasterItems('document_link', REFERENCES.map(([value, label]) => ({ value, label })));
  const typePairs = typeOptions.map((option) => [option.value, option.label]);
  const linkPairs = linkOptions.map((option) => [option.value, option.label]);
  const filters = useListFilters(documentFilters);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState('other');
  const [referenceType, setReferenceType] = useState('');
  const [referenceId, setReferenceId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(filters.applied.page), pageSize: '25' });
    if (filters.applied.q) params.set('q', filters.applied.q);
    if (filters.applied.documentType) params.set('documentType', filters.applied.documentType);
    if (filters.applied.referenceType) params.set('referenceType', filters.applied.referenceType);
    if (filters.applied.fy) params.set('fy', filters.applied.fy);
    fetch(`/api/admin/finance/documents?${params}`)
      .then((r) => r.json())
      .then((body) => {
        setRows(body.rows || []);
        setTotal(body.total || 0);
      });
  }, [filters.applied]);

  const upload = async () => {
    if (!file) return setError('Choose a file to upload');
    setError('');
    const form = new FormData();
    form.set('file', file);
    form.set('documentType', uploadType);
    if (referenceType) form.set('referenceType', referenceType);
    if (referenceId) form.set('referenceId', referenceId);
    const res = await fetch('/api/admin/finance/documents', { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Upload failed');
      return;
    }
    setFile(null);
    setOpen(false);
    filters.reload();
  };

  const remove = async (row: Record<string, string>) => {
    if (!window.confirm(`Delete ${row.original_filename}?`)) return;
    const res = await fetch(`/api/admin/finance/documents/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Could not delete document');
      return;
    }
    filters.reload();
  };

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Documents"
        description="Private finance files. Downloads require admin authentication."
        action={<AdminButton variant="primary" onClick={() => setOpen((value) => !value)}>+ Upload document</AdminButton>}
      />
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <FilterBar plain onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search file name, type, linked record..." />
        <FilterSelect icon="DocumentTextIcon" value={filters.draft.documentType} onChange={(value) => filters.set('documentType', value)} className="w-44">
          <option value="">All types</option>
          {typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </FilterSelect>
        <FilterSelect icon="LinkIcon" value={filters.draft.referenceType} onChange={(value) => filters.set('referenceType', value)} className="w-44">
          <option value="">All linked to</option>
          {linkOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </FilterSelect>
        <FilterSelect icon="CalendarDaysIcon" value={filters.draft.fy} onChange={(value) => filters.set('fy', value)} className="w-36">
          <option value="">All years</option>
          {financialYearChoices(filters.draft.fy).map((year) => <option key={year} value={year}>{year}</option>)}
        </FilterSelect>
      </FilterBar>
      {open && (
        <AdminSection title="Upload document">
          <div className="flex flex-wrap items-end gap-2">
            <select className={`${adminSelectClass} w-48`} value={uploadType} onChange={(e) => setUploadType(e.target.value)}>
              {typeOptions.map((option) => <option key={`upload-${option.value}`} value={option.value}>{option.label}</option>)}
            </select>
            <select className={`${adminSelectClass} w-44`} value={referenceType} onChange={(e) => setReferenceType(e.target.value)}>
              <option value="">Link to…</option>
              {linkOptions.map((option) => <option key={`link-${option.value}`} value={option.value}>{option.label}</option>)}
            </select>
            <input className={`${adminInputClass} w-56`} placeholder="Linked record ID" value={referenceId} onChange={(e) => setReferenceId(e.target.value)} />
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <AdminButton variant="primary" onClick={upload}>Upload</AdminButton>
          </div>
        </AdminSection>
      )}
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <FinanceTh>File name</FinanceTh>
                <FinanceTh>Type</FinanceTh>
                <FinanceTh>Linked to</FinanceTh>
                <FinanceTh>Upload date</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            {rows.length > 0 && (
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <FinanceTd><span className="font-semibold text-slate-900">{row.original_filename}</span></FinanceTd>
                    <FinanceTd><TypePill>{labelOf(typePairs, row.document_type)}</TypePill></FinanceTd>
                    <FinanceTd>{row.reference_type ? labelOf(linkPairs, row.reference_type) : '—'}</FinanceTd>
                    <FinanceTd>{dmy(row.uploaded_at || row.document_date)}</FinanceTd>
                    <FinanceTd>
                      <div className="flex gap-1">
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" href={`/api/admin/finance/documents/${row.id}/download`} target="_blank" rel="noreferrer" aria-label="View document">
                          <Icon name="EyeIcon" size={16} />
                        </a>
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" href={`/api/admin/finance/documents/${row.id}/download`} aria-label="Download document">
                          <Icon name="ArrowDownTrayIcon" size={16} />
                        </a>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label="Delete document" onClick={() => remove(row)}>
                          <Icon name="TrashIcon" size={16} />
                        </button>
                      </div>
                    </FinanceTd>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {rows.length === 0 && <EmptyRecords title="No documents found" description="Try adjusting your filters or upload a document." action={<AdminButton variant="primary" onClick={() => setOpen(true)}>+ Upload document</AdminButton>} />}
        <div className="px-5 pb-4">
          <Pager page={filters.applied.page} pageSize={25} total={total} onPage={filters.setPage} />
        </div>
      </section>
    </FinanceShell>
  );
}
