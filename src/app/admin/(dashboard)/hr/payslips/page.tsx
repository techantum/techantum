'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminAlert from '@/components/admin/AdminAlert';
import { EmptyRecords, FilterBar, FilterSearch, FilterSelect, financialYearChoices, useListFilters } from '@/components/admin/ListFilters';
import { FinanceShell, FinanceTd, FinanceTh, Pager, StatusBadge } from '@/components/admin/finance/FinanceUi';
import { currentFinancialYear, todayISO } from '@/lib/finance/fy';
import { formatINR } from '@/lib/finance/money';
import { daysInMonth, payslipAmountInWords, payslipTotals, salaryFromAnnualCtc } from '@/lib/finance/salary';
import Icon from '@/components/ui/AppIcon';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const payslipFilters = { q: '', department: '', fy: currentFinancialYear().label, status: '' };

function rupees(cents: number) {
  return formatINR(cents, false);
}

function dmy(value: unknown) {
  const text = String(value || '').slice(0, 10);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—';
}

export default function PayslipsPage() {
  const filters = useListFilters(payslipFilters);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [panel, setPanel] = useState<'' | 'upload' | 'generate' | 'header'>('');
  const [header, setHeader] = useState({
    payslip_logo_path: '',
    logo_path: '',
    payslip_header_right: 'Techantum Solutions\nA Unit of SJ Media Labs Pvt Ltd',
    payslip_signatory_name: 'Sudheer Uppuluri',
    payslip_signatory_title: 'HR Manager',
  });
  const [logoVersion, setLogoVersion] = useState(0);
  const [gen, setGen] = useState({
    employee_id: '',
    payroll_month: String(new Date().getMonth() + 1),
    payroll_year: String(new Date().getFullYear()),
    lop_days: '0',
    lpr_days: '0',
    lop_amount: '0',
  });
  const [file, setFile] = useState<File | null>(null);
  const [replaceId, setReplaceId] = useState('');
  const [form, setForm] = useState({
    employee_id: '',
    employee_code: '',
    full_name: '',
    department: '',
    designation: '',
    email: '',
    payroll_month: String(new Date().getMonth() + 1),
    payroll_year: String(new Date().getFullYear()),
    financial_year: currentFinancialYear().label,
    payslip_date: todayISO(),
    remarks: '',
  });

  useEffect(() => {
    const params = new URLSearchParams({ page: String(filters.applied.page), pageSize: '25' });
    if (filters.applied.q) params.set('q', filters.applied.q);
    if (filters.applied.department) params.set('department', filters.applied.department);
    if (filters.applied.fy) params.set('fy', filters.applied.fy);
    fetch(`/api/admin/finance/payslips?${params}`)
      .then((r) => r.json())
      .then((body) => {
        const next = (body.rows || []) as Record<string, string>[];
        setRows(filters.applied.status === 'pending' ? [] : next);
        setTotal(filters.applied.status === 'pending' ? 0 : body.total || 0);
        setDepartments(body.departments || []);
      });
    fetch('/api/admin/finance/employees').then((r) => r.json()).then((body) => setEmployees(Array.isArray(body) ? body : []));
    fetch('/api/admin/finance/settings')
      .then((r) => r.json())
      .then((body) => {
        if (!body || body.error) return;
        setHeader({
          payslip_logo_path: body.payslip_logo_path || '',
          logo_path: body.logo_path || '',
          payslip_header_right: body.payslip_header_right || 'Techantum Solutions\nA Unit of SJ Media Labs Pvt Ltd',
          payslip_signatory_name: body.payslip_signatory_name || 'Sudheer Uppuluri',
          payslip_signatory_title: body.payslip_signatory_title || 'HR Manager',
        });
      });
  }, [filters.applied]);

  const applyEmployee = (id: string) => {
    const employee = employees.find((item) => item.id === id);
    setForm({
      ...form,
      employee_id: id,
      employee_code: employee?.employee_code || '',
      full_name: employee?.full_name || '',
      department: employee?.department || '',
      designation: employee?.designation || '',
      email: employee?.email || '',
    });
  };

  const upload = async () => {
    setError('');
    setMessage('');
    if (!file) return setError('Payslip PDF is required');
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, value));
    data.set('file', file);
    const res = await fetch('/api/admin/finance/payslips', { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Upload failed');
    setMessage('Payslip uploaded');
    setFile(null);
    setPanel('');
    filters.reload();
  };

  const generate = async () => {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/finance/payslips/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gen),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Could not generate payslip');
    setMessage('Payslip generated and saved in the employee folder');
    setPanel('');
    filters.reload();
  };

  const saveHeader = async () => {
    setError('');
    setMessage('');
    const res = await fetch('/api/admin/finance/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payslip_header_right: header.payslip_header_right,
        payslip_signatory_name: header.payslip_signatory_name,
        payslip_signatory_title: header.payslip_signatory_title,
      }),
    });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Could not save payslip header');
    setMessage('Payslip header saved. New payslips use this logo and signature.');
  };

  const uploadLogo = async (file: File) => {
    setError('');
    setMessage('');
    const data = new FormData();
    data.set('file', file);
    data.set('field', 'payslip_logo_path');
    const res = await fetch('/api/admin/finance/settings/file', { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Could not upload logo');
    setHeader((current) => ({ ...current, payslip_logo_path: body.payslip_logo_path || current.payslip_logo_path }));
    setLogoVersion((value) => value + 1);
    setMessage('Payslip logo updated');
  };

  const selectedEmployee = employees.find((item) => item.id === gen.employee_id);
  const logoField = header.payslip_logo_path ? 'payslip_logo_path' : header.logo_path ? 'logo_path' : '';
  let previewError = '';
  let preview: { days: number; net: number; words: string; lines: [string, string, string][] } | null = null;
  if (selectedEmployee?.annual_ctc) {
    try {
      const structure = salaryFromAnnualCtc(selectedEmployee.annual_ctc);
      const totals = payslipTotals(structure, gen.lop_amount || '0');
      const year = Number(gen.payroll_year);
      const month = Number(gen.payroll_month);
      preview = {
        days: Number.isInteger(year) && Number.isInteger(month) ? daysInMonth(year, month) : 0,
        net: totals.netCents,
        words: payslipAmountInWords(totals.netCents),
        lines: [
          ['Basic', rupees(structure.basicCents), rupees(structure.basicAnnualCents)],
          ['H.R.A', rupees(structure.hraCents), rupees(structure.hraAnnualCents)],
          ['Special allowance', rupees(structure.specialAllowanceCents), rupees(structure.specialAnnualCents)],
          ['Convenience allowance', rupees(structure.convenienceCents), rupees(structure.convenienceAnnualCents)],
          ['Profession tax', rupees(structure.professionalTaxCents), rupees(structure.professionalTaxAnnualCents)],
          ['LOP', rupees(totals.lopCents), '—'],
          ['Net pay', rupees(totals.netCents), ''],
        ],
      };
    } catch (err) {
      previewError = err instanceof Error ? err.message : 'Could not calculate pay';
    }
  }

  const replace = async (id: string) => {
    if (!file) return setError('Choose a PDF in Upload payslip, then replace.');
    const data = new FormData();
    data.set('file', file);
    data.set('remarks', form.remarks);
    const res = await fetch(`/api/admin/finance/payslips/${id}/replace`, { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Replace failed');
    setMessage('Payslip replaced. Previous file is retained in audit history.');
    setReplaceId('');
    setFile(null);
    filters.reload();
  };

  const remove = async (row: Record<string, string>) => {
    if (!window.confirm(`Delete the payslip for ${row.employee_name}?`)) return;
    const res = await fetch(`/api/admin/finance/payslips/${row.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Could not delete payslip');
      return;
    }
    filters.reload();
  };

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Payslips"
        description="Upload a payslip PDF, or generate one from the employee CTC. Loss of pay is entered here until payroll is connected."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminButton onClick={() => setPanel(panel === 'header' ? '' : 'header')}>Payslip header</AdminButton>
            <Link href="/admin/hr/employees" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-secondary/40 hover:text-secondary">Employees</Link>
            <AdminButton onClick={() => setPanel(panel === 'upload' ? '' : 'upload')}>Upload payslip</AdminButton>
            <AdminButton variant="primary" onClick={() => setPanel(panel === 'generate' ? '' : 'generate')}>Generate payslip</AdminButton>
          </div>
        }
      />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {message && <AdminAlert>{message}</AdminAlert>}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <FilterBar plain onSearch={filters.search} onClear={filters.clear}>
        <FilterSearch value={filters.draft.q} onChange={(value) => filters.set('q', value)} placeholder="Search employee name, employee ID..." />
        <FilterSelect icon="UserGroupIcon" value={filters.draft.department} onChange={(value) => filters.set('department', value)} className="w-48">
          <option value="">All departments</option>
          {departments.map((department) => <option key={department} value={department}>{department}</option>)}
        </FilterSelect>
        <FilterSelect icon="CalendarDaysIcon" value={filters.draft.fy} onChange={(value) => filters.set('fy', value)} className="w-36">
          {financialYearChoices(filters.draft.fy).map((year) => <option key={year} value={year}>{year}</option>)}
        </FilterSelect>
        <FilterSelect value={filters.draft.status} onChange={(value) => filters.set('status', value)} className="w-40">
          <option value="">All status</option>
          <option value="uploaded">Uploaded</option>
          <option value="pending">Pending</option>
        </FilterSelect>
      </FilterBar>
      {panel === 'header' && (
        <AdminSection title="Payslip header">
          <AdminFormGrid>
            <AdminField label="Logo" span={2} hint="Shown at the top left. PNG or JPG.">
              {logoField && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/admin/finance/settings/file/${logoField}?v=${logoVersion}`} alt="Payslip logo" className="mb-2 h-12 w-auto max-w-[220px] object-contain object-left" />
              )}
              <input type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </AdminField>
            <AdminField label="Right side content" span={2} hint="First line is the company name. Each extra line is shown underneath.">
              <textarea className={adminTextareaClass} rows={3} value={header.payslip_header_right} onChange={(e) => setHeader({ ...header, payslip_header_right: e.target.value })} />
            </AdminField>
            <AdminField label="Authorised signature name">
              <input className={adminInputClass} value={header.payslip_signatory_name} onChange={(e) => setHeader({ ...header, payslip_signatory_name: e.target.value })} />
            </AdminField>
            <AdminField label="Signatory designation">
              <input className={adminInputClass} value={header.payslip_signatory_title} onChange={(e) => setHeader({ ...header, payslip_signatory_title: e.target.value })} />
            </AdminField>
          </AdminFormGrid>
          <AdminButton className="mt-3" variant="primary" onClick={saveHeader}>Save header</AdminButton>
        </AdminSection>
      )}
      {panel === 'generate' && (
        <AdminSection title="Generate payslip">
          <AdminFormGrid>
            <AdminField label="Employee">
              <select className={adminSelectClass} value={gen.employee_id} onChange={(e) => setGen({ ...gen, employee_id: e.target.value })}>
                <option value="">Select employee</option>
                {employees.filter((employee) => employee.status !== 'inactive').map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.employee_code})</option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Month">
              <select className={adminSelectClass} value={gen.payroll_month} onChange={(e) => setGen({ ...gen, payroll_month: e.target.value })}>
                {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
            </AdminField>
            <AdminField label="Year"><input className={adminInputClass} value={gen.payroll_year} onChange={(e) => setGen({ ...gen, payroll_year: e.target.value })} /></AdminField>
            <AdminField label="LOP days"><input className={adminInputClass} value={gen.lop_days} onChange={(e) => setGen({ ...gen, lop_days: e.target.value })} /></AdminField>
            <AdminField label="LPR days"><input className={adminInputClass} value={gen.lpr_days} onChange={(e) => setGen({ ...gen, lpr_days: e.target.value })} /></AdminField>
            <AdminField label="LOP deduction (₹)" hint="Used only when this month has no payroll record. Approved payroll replaces these LOP figures.">
              <input className={adminInputClass} inputMode="decimal" value={gen.lop_amount} onChange={(e) => setGen({ ...gen, lop_amount: e.target.value })} />
            </AdminField>
          </AdminFormGrid>
          {selectedEmployee && !selectedEmployee.annual_ctc && <p className="mt-3 text-sm text-amber-700">Add annual CTC and bank details on the Employees page before generating.</p>}
          {previewError && <p className="mt-3 text-sm text-rose-600">{previewError}</p>}
          {preview && (
            <div className="mt-4 max-w-xl text-sm">
              <p className="mb-2 text-slate-500">Days / LOP / LPR: {preview.days} / {gen.lop_days || 0} / {gen.lpr_days || 0}</p>
              <table className="w-full">
                <tbody>
                  {preview.lines.map((line) => (
                    <tr key={line[0]}>
                      <td className="py-1 text-slate-600">{line[0]}</td>
                      <td className="py-1 text-right font-medium text-slate-900">{line[1]}</td>
                      <td className="py-1 text-right text-slate-500">{line[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-slate-600">{preview.words}</p>
            </div>
          )}
          <AdminButton className="mt-3" variant="primary" onClick={generate} disabled={!selectedEmployee?.annual_ctc}>Generate payslip</AdminButton>
        </AdminSection>
      )}
      {panel === 'upload' && (
        <AdminSection title="Upload payslip">
          <AdminFormGrid>
            <AdminField label="Employee">
              <select className={adminSelectClass} value={form.employee_id} onChange={(e) => applyEmployee(e.target.value)}>
                <option value="">New employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.employee_code})</option>)}
              </select>
            </AdminField>
            <AdminField label="Employee ID"><input className={adminInputClass} value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></AdminField>
            <AdminField label="Employee name"><input className={adminInputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></AdminField>
            <AdminField label="Department"><input className={adminInputClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></AdminField>
            <AdminField label="Designation"><input className={adminInputClass} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></AdminField>
            <AdminField label="Email"><input className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></AdminField>
            <AdminField label="Payroll month">
              <select className={adminSelectClass} value={form.payroll_month} onChange={(e) => setForm({ ...form, payroll_month: e.target.value })}>
                {MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
            </AdminField>
            <AdminField label="Payroll year"><input className={adminInputClass} value={form.payroll_year} onChange={(e) => setForm({ ...form, payroll_year: e.target.value })} /></AdminField>
            <AdminField label="Financial year"><input className={adminInputClass} value={form.financial_year} onChange={(e) => setForm({ ...form, financial_year: e.target.value })} /></AdminField>
            <AdminField label="Payslip date"><input type="date" className={adminInputClass} value={form.payslip_date} onChange={(e) => setForm({ ...form, payslip_date: e.target.value })} /></AdminField>
            <AdminField label="Remarks" span={2}><textarea className={adminTextareaClass} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></AdminField>
            <AdminField label="Payslip PDF" span={3}><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></AdminField>
          </AdminFormGrid>
          <AdminButton className="mt-3" variant="primary" onClick={upload}>Upload payslip</AdminButton>
        </AdminSection>
      )}
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr>
                <FinanceTh>Employee</FinanceTh>
                <FinanceTh>Department</FinanceTh>
                <FinanceTh>Payroll</FinanceTh>
                <FinanceTh>Status</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            {rows.length > 0 && (
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <FinanceTd>
                      <p className="font-semibold text-slate-900">{row.employee_name}</p>
                      <p className="text-xs text-slate-400">{row.employee_code}</p>
                    </FinanceTd>
                    <FinanceTd>{row.department || '—'}</FinanceTd>
                    <FinanceTd>{MONTHS[Number(row.payroll_month) - 1] || row.payroll_month} {row.payroll_year}</FinanceTd>
                    <FinanceTd><StatusBadge value={row.source === 'generated' ? 'generated' : 'uploaded'} /></FinanceTd>
                    <FinanceTd>
                      <div className="flex gap-1">
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" href={`/api/admin/finance/payslips/${row.id}/download`} target="_blank" rel="noreferrer" aria-label="View payslip">
                          <Icon name="EyeIcon" size={16} />
                        </a>
                        <a className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" href={`/api/admin/finance/payslips/${row.id}/download`} aria-label="Download payslip">
                          <Icon name="ArrowDownTrayIcon" size={16} />
                        </a>
                        <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label="Delete payslip" onClick={() => remove(row)}>
                          <Icon name="TrashIcon" size={16} />
                        </button>
                      </div>
                        <button type="button" className="mt-1 text-xs font-semibold text-secondary hover:underline" onClick={() => { setReplaceId(row.id); setPanel('upload'); }}>
                        Replace
                      </button>
                      {replaceId === row.id && (
                        <AdminButton size="sm" className="mt-1" onClick={() => replace(row.id)}>Confirm replace</AdminButton>
                      )}
                    </FinanceTd>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
        {rows.length === 0 && <EmptyRecords title="No payslips found" description="Try adjusting your filters, upload a payslip, or generate one." action={<AdminButton variant="primary" onClick={() => setPanel('generate')}>Generate payslip</AdminButton>} />}
        <div className="px-5 pb-4">
          <Pager page={filters.applied.page} pageSize={25} total={total} onPage={filters.setPage} />
        </div>
      </section>
    </FinanceShell>
  );
}
