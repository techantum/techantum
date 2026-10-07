'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminAlert from '@/components/admin/AdminAlert';
import { FinanceShell, FinanceTd, FinanceTh, Pager } from '@/components/admin/finance/FinanceUi';
import { currentFinancialYear, todayISO } from '@/lib/finance/fy';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function PayslipsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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

  const load = () => {
    fetch(`/api/admin/finance/payslips?page=${page}`).then((r) => r.json()).then((b) => {
      setRows(b.rows || []);
      setTotal(b.total || 0);
    });
    fetch('/api/admin/finance/employees').then((r) => r.json()).then((b) => setEmployees(Array.isArray(b) ? b : []));
  };
  useEffect(() => { load(); }, [page]);

  const applyEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    setForm({
      ...form,
      employee_id: id,
      employee_code: emp?.employee_code || '',
      full_name: emp?.full_name || '',
      department: emp?.department || '',
      designation: emp?.designation || '',
      email: emp?.email || '',
    });
  };

  const upload = async () => {
    setError('');
    setMessage('');
    if (!file) return setError('Payslip PDF is required');
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.set(k, v));
    data.set('file', file);
    const res = await fetch('/api/admin/finance/payslips', { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Upload failed');
    setMessage('Payslip uploaded');
    setFile(null);
    load();
  };

  const replace = async (id: string) => {
    if (!file) return setError('Choose a PDF to replace');
    const data = new FormData();
    data.set('file', file);
    data.set('remarks', form.remarks);
    const res = await fetch(`/api/admin/finance/payslips/${id}/replace`, { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) return setError(body.error || 'Replace failed');
    setMessage('Payslip replaced. Previous file is retained in audit history.');
    setReplaceId('');
    setFile(null);
    load();
  };

  return (
    <FinanceShell>
      <AdminPageHeader title="Payslips" description="Upload employee payslips month-wise. Employees can download only their own files from the dashboard." />
      {error && <AdminAlert variant="error">{error}</AdminAlert>}
      {message && <AdminAlert>{message}</AdminAlert>}
      <AdminSection title="+ Upload Payslip">
        <AdminFormGrid>
          <AdminField label="Employee">
            <select className={adminSelectClass} value={form.employee_id} onChange={(e) => applyEmployee(e.target.value)}>
              <option value="">New employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
            </select>
          </AdminField>
          <AdminField label="Employee ID"><input className={adminInputClass} value={form.employee_code} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} /></AdminField>
          <AdminField label="Employee name"><input className={adminInputClass} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></AdminField>
          <AdminField label="Department"><input className={adminInputClass} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></AdminField>
          <AdminField label="Designation"><input className={adminInputClass} value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></AdminField>
          <AdminField label="Email"><input className={adminInputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></AdminField>
          <AdminField label="Payroll Month">
            <select className={adminSelectClass} value={form.payroll_month} onChange={(e) => setForm({ ...form, payroll_month: e.target.value })}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </AdminField>
          <AdminField label="Payroll Year"><input className={adminInputClass} value={form.payroll_year} onChange={(e) => setForm({ ...form, payroll_year: e.target.value })} /></AdminField>
          <AdminField label="Financial Year"><input className={adminInputClass} value={form.financial_year} onChange={(e) => setForm({ ...form, financial_year: e.target.value })} /></AdminField>
          <AdminField label="Payslip Date"><input type="date" className={adminInputClass} value={form.payslip_date} onChange={(e) => setForm({ ...form, payslip_date: e.target.value })} /></AdminField>
          <AdminField label="Remarks" span={2}><textarea className={adminTextareaClass} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></AdminField>
          <AdminField label="Payslip PDF" span={3}><input type="file" accept="application/pdf,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></AdminField>
        </AdminFormGrid>
        <AdminButton className="mt-3" variant="primary" onClick={upload}>Upload payslip</AdminButton>
      </AdminSection>
      <AdminSection title="Payslips">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr>
                <FinanceTh>Employee Name</FinanceTh>
                <FinanceTh>Employee ID</FinanceTh>
                <FinanceTh>Department</FinanceTh>
                <FinanceTh>Designation</FinanceTh>
                <FinanceTh>Payroll Month</FinanceTh>
                <FinanceTh>Payroll Year</FinanceTh>
                <FinanceTh>Financial Year</FinanceTh>
                <FinanceTh>Payslip Date</FinanceTh>
                <FinanceTh>Upload Date</FinanceTh>
                <FinanceTh>Uploaded By</FinanceTh>
                <FinanceTh>Actions</FinanceTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <FinanceTd>{r.employee_name}</FinanceTd>
                  <FinanceTd>{r.employee_code}</FinanceTd>
                  <FinanceTd>{r.department || '—'}</FinanceTd>
                  <FinanceTd>{r.designation || '—'}</FinanceTd>
                  <FinanceTd>{MONTHS[Number(r.payroll_month) - 1] || r.payroll_month}</FinanceTd>
                  <FinanceTd>{r.payroll_year}</FinanceTd>
                  <FinanceTd>{r.financial_year}</FinanceTd>
                  <FinanceTd>{r.payslip_date || '—'}</FinanceTd>
                  <FinanceTd>{String(r.uploaded_at || '').slice(0, 10)}</FinanceTd>
                  <FinanceTd>{r.uploaded_by_email || '—'}</FinanceTd>
                  <FinanceTd>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <a className="text-secondary hover:underline" href={`/api/admin/finance/payslips/${r.id}/download`} target="_blank" rel="noreferrer">View</a>
                      <a className="text-secondary hover:underline" href={`/api/admin/finance/payslips/${r.id}/download`}>Download</a>
                      <button type="button" className="text-secondary hover:underline" onClick={() => setReplaceId(r.id)}>Replace</button>
                    </div>
                    {replaceId === r.id && (
                      <div className="mt-2">
                        <AdminButton size="sm" onClick={() => replace(r.id)}>Confirm replace with selected PDF</AdminButton>
                      </div>
                    )}
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pageSize={25} total={total} onPage={setPage} />
      </AdminSection>
    </FinanceShell>
  );
}
