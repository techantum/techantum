'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass, adminSelectClass } from '@/components/admin/AdminField';
import AdminFormGrid from '@/components/admin/AdminFormGrid';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { FinanceShell, FinanceTd, FinanceTh } from '@/components/admin/finance/FinanceUi';
import { formatINR, toCents } from '@/lib/finance/money';

const emptyEmployee = {
  id: '',
  employee_code: '',
  full_name: '',
  email: '',
  department: '',
  designation: '',
  date_of_birth: '',
  date_of_joining: '',
  bank_name: '',
  bank_account_no: '',
  pan: '',
  work_location: '',
  annual_ctc: '',
  last_working_date: '',
  status: 'active',
};

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const list = await fetch('/api/admin/finance/employees').then((response) => response.json());
    setEmployees(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const editEmployee = (employee: Record<string, string>) => {
    setEmployeeForm({
      id: employee.id || '',
      employee_code: employee.employee_code || '',
      full_name: employee.full_name || '',
      email: employee.email || '',
      department: employee.department || '',
      designation: employee.designation || '',
      date_of_birth: String(employee.date_of_birth || '').slice(0, 10),
      date_of_joining: String(employee.date_of_joining || '').slice(0, 10),
      bank_name: employee.bank_name || '',
      bank_account_no: employee.bank_account_no || '',
      pan: employee.pan || '',
      work_location: employee.work_location || '',
      annual_ctc: employee.annual_ctc || '',
      last_working_date: String(employee.last_working_date || '').slice(0, 10),
      status: employee.status || 'active',
    });
  };

  const saveEmployee = async () => {
    setError('');
    setMessage('');
    const res = await fetch(employeeForm.id ? `/api/admin/finance/employees/${employeeForm.id}` : '/api/admin/finance/employees', {
      method: employeeForm.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...employeeForm, require_profile: true }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Could not save employee');
      return;
    }
    setMessage(employeeForm.id ? 'Employee updated' : 'Employee saved');
    setEmployeeForm(emptyEmployee);
    await load();
  };

  return (
    <FinanceShell>
      <AdminPageHeader
        title="Employees"
        description="Employee records used for payslips. Annual CTC drives the generated salary breakdown."
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <AdminSection title={employeeForm.id ? 'Edit employee' : 'Add employee'}>
        <AdminFormGrid>
          <AdminField label="Employee ID"><input className={adminInputClass} value={employeeForm.employee_code} onChange={(e) => setEmployeeForm({ ...employeeForm, employee_code: e.target.value })} /></AdminField>
          <AdminField label="Employee name"><input className={adminInputClass} value={employeeForm.full_name} onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })} /></AdminField>
          <AdminField label="Email"><input className={adminInputClass} value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} /></AdminField>
          <AdminField label="Department"><input className={adminInputClass} value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} /></AdminField>
          <AdminField label="Designation"><input className={adminInputClass} value={employeeForm.designation} onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })} /></AdminField>
          <AdminField label="Date of birth"><input type="date" className={adminInputClass} value={employeeForm.date_of_birth} onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_birth: e.target.value })} /></AdminField>
          <AdminField label="Date of joining"><input type="date" className={adminInputClass} value={employeeForm.date_of_joining} onChange={(e) => setEmployeeForm({ ...employeeForm, date_of_joining: e.target.value })} /></AdminField>
          <AdminField label="Last working date" hint="Used to prorate the leaving month. Leave blank while the employee is active."><input type="date" className={adminInputClass} value={employeeForm.last_working_date} onChange={(e) => setEmployeeForm({ ...employeeForm, last_working_date: e.target.value })} /></AdminField>
          <AdminField label="Bank name"><input className={adminInputClass} value={employeeForm.bank_name} onChange={(e) => setEmployeeForm({ ...employeeForm, bank_name: e.target.value })} /></AdminField>
          <AdminField label="Bank account number"><input className={adminInputClass} value={employeeForm.bank_account_no} onChange={(e) => setEmployeeForm({ ...employeeForm, bank_account_no: e.target.value })} /></AdminField>
          <AdminField label="PAN"><input className={adminInputClass} value={employeeForm.pan} onChange={(e) => setEmployeeForm({ ...employeeForm, pan: e.target.value.toUpperCase() })} /></AdminField>
          <AdminField label="Location"><input className={adminInputClass} value={employeeForm.work_location} onChange={(e) => setEmployeeForm({ ...employeeForm, work_location: e.target.value })} /></AdminField>
          <AdminField label="Annual CTC (₹)" hint="Monthly gross is CTC ÷ 12. Basic is 50%, HRA is 40% of basic, convenience allowance is ₹2,000, and special allowance is the balance.">
            <input className={adminInputClass} inputMode="decimal" value={employeeForm.annual_ctc} onChange={(e) => setEmployeeForm({ ...employeeForm, annual_ctc: e.target.value })} />
          </AdminField>
          <AdminField label="Status">
            <select className={adminSelectClass} value={employeeForm.status} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </AdminField>
        </AdminFormGrid>
        <div className="mt-3 flex gap-2">
          <AdminButton variant="primary" onClick={saveEmployee}>{employeeForm.id ? 'Update employee' : 'Save employee'}</AdminButton>
          {employeeForm.id ? <AdminButton onClick={() => setEmployeeForm(emptyEmployee)}>New employee</AdminButton> : null}
        </div>
      </AdminSection>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto px-2">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr>
                <FinanceTh>Employee</FinanceTh>
                <FinanceTh>Designation</FinanceTh>
                <FinanceTh>Location</FinanceTh>
                <FinanceTh>Annual CTC</FinanceTh>
                <FinanceTh>Status</FinanceTh>
                <FinanceTh> </FinanceTh>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <FinanceTd>
                    <p className="font-semibold text-slate-900">{employee.full_name}</p>
                    <p className="text-xs text-slate-400">{employee.employee_code}</p>
                  </FinanceTd>
                  <FinanceTd>{employee.designation || '—'}</FinanceTd>
                  <FinanceTd>{employee.work_location || '—'}</FinanceTd>
                  <FinanceTd>{employee.annual_ctc ? formatINR(toCents(employee.annual_ctc)) : '—'}</FinanceTd>
                  <FinanceTd className="capitalize">{employee.status || 'active'}</FinanceTd>
                  <FinanceTd>
                    <button type="button" className="text-xs font-semibold text-secondary hover:underline" onClick={() => editEmployee(employee)}>Edit</button>
                  </FinanceTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {employees.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">No employees yet.</p> : null}
      </section>
    </FinanceShell>
  );
}
