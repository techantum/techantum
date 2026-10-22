'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';

const DEPARTMENTS = ['Engineering', 'Human Resources', 'Finance', 'Sales', 'Operations', 'Support'];
const DESIGNATIONS = ['CEO', 'Account Manager', 'Software Engineer - Full Stack', 'Sr Software Engineer', 'Lead Developer', 'QA Engineer', 'UI/UX Designer', 'Business Analyst'];
const LOCATIONS = ['Hyderabad', 'Bengaluru', 'Remote'];
const TYPES = [
  ['full_time', 'Full Time'],
  ['part_time', 'Part Time'],
  ['contract', 'Contract'],
  ['intern', 'Intern'],
];

const empty = {
  id: '',
  employee_code: '',
  full_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  emergency_contact: '',
  department: '',
  designation: '',
  employee_type: '',
  date_of_joining: '',
  reporting_manager_id: '',
  work_location: '',
  status: 'active',
  employment_status: 'regular',
  last_working_date: '',
  annual_ctc: '',
  pan: '',
  aadhaar: '',
  bank_name: '',
  bank_account_no: '',
  ifsc_code: '',
  uan: '',
  current_address: '',
  permanent_address: '',
  notes: '',
  photo_path: '',
  user_id: '',
};

function filled(value: string) {
  return Boolean(String(value || '').trim());
}

function money(annual: string) {
  const text = annual.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,4})?$/.test(text)) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(text) / 12);
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}{required ? <span className="text-rose-500"> *</span> : null}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-400">{hint}</span> : null}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

const control = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-300 focus:border-secondary';

function Card({ icon, title, detail, children }: { icon: string; title: string; detail: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-secondary"><Icon name={icon} size={18} /></span>
        <span>
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="block text-xs text-slate-400">{detail}</span>
        </span>
      </div>
      {children}
    </section>
  );
}

export default function EmployeeForm({ employeeId }: { employeeId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(!employeeId);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch('/api/admin/finance/employees').then((response) => response.json()).then((list) => {
      const rows = Array.isArray(list) ? list : [];
      setEmployees(rows);
      if (!employeeId) {
        const numbers = rows.map((row) => /^EMP-(\d+)$/i.exec(String(row.employee_code || ''))).filter(Boolean).map((match) => Number(match?.[1]));
        const next = String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0');
        setForm((current) => ({ ...current, employee_code: current.employee_code || `EMP-${next}` }));
        return;
      }
      const employee = rows.find((row) => row.id === employeeId);
      if (!employee) {
        setError('Employee not found');
        setMissing(true);
        setReady(true);
        return;
      }
      setForm({
        ...empty,
        ...Object.fromEntries(Object.keys(empty).map((key) => [key, employee[key] == null ? '' : String(employee[key])])),
        date_of_birth: String(employee.date_of_birth || '').slice(0, 10),
        date_of_joining: String(employee.date_of_joining || '').slice(0, 10),
        last_working_date: String(employee.last_working_date || '').slice(0, 10),
        status: employee.status || 'active',
      });
      setReady(true);
    });
  }, [employeeId]);

  const set = (key: keyof typeof empty, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const payrollReady = [form.annual_ctc, form.pan, form.aadhaar, form.bank_name, form.bank_account_no, form.ifsc_code].every(filled);
  const profileReady = [form.employee_code, form.full_name, form.phone, form.gender, form.emergency_contact, form.designation, form.work_location, form.current_address, form.permanent_address].every(filled);
  const joined = filled(form.date_of_joining);
  const active = form.status === 'active';
  const workStatus = form.employment_status || 'regular';
  const workLabel = workStatus === 'probation' ? 'Probation' : workStatus === 'part_time' ? 'Part Time' : 'Regular';
  const monthly = useMemo(() => money(form.annual_ctc), [form.annual_ctc]);

  const withCurrent = (options: string[], current: string) => current && !options.includes(current) ? [current, ...options] : options;

  const save = async () => {
    setError('');
    setMessage('');
    const res = await fetch(form.id ? `/api/admin/finance/employees/${form.id}` : '/api/admin/finance/employees', {
      method: form.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, require_profile: true }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Could not save employee');
      return;
    }
    if (photo && body.id) {
      const data = new FormData();
      data.append('file', photo);
      const uploaded = await fetch(`/api/admin/finance/employees/${body.id}/photo`, { method: 'POST', body: data });
      const uploadedBody = await uploaded.json();
      if (!uploaded.ok) {
        setError(uploadedBody.error || 'Employee saved, but the photo was not uploaded');
        setForm((current) => ({ ...current, id: body.id }));
        return;
      }
    }
    if (!employeeId) {
      router.push('/admin/hr/employees');
      return;
    }
    setMessage('Employee updated');
    setForm((current) => ({ ...current, id: body.id, photo_path: body.photo_path || current.photo_path }));
    setPhoto(null);
  };

  const chips = [
    { ok: active, title: active ? workLabel : 'Inactive', detail: workStatus === 'part_time' ? 'No leave or benefits' : workStatus === 'probation' ? 'No paid leave' : 'Leave policy applies', icon: 'CheckCircleIcon' },
    { ok: payrollReady, title: 'Payroll Eligible', detail: payrollReady ? 'Salary & Payslips' : 'Payroll details missing', icon: 'BanknotesIcon' },
    { ok: profileReady, title: 'HR Record', detail: profileReady ? 'Profile Complete' : 'Profile incomplete', icon: 'IdentificationIcon' },
    { ok: joined, title: joined ? 'Joined' : 'Joining Pending', detail: joined ? 'Joining date set' : 'Not yet joined', icon: 'CalendarDaysIcon' },
  ];

  return (
    <div className="space-y-4">
      <Link href="/admin/hr/employees" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"><Icon name="ChevronLeftIcon" size={16} /> Back to Employees</Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900">{employeeId ? 'Edit Employee' : 'Add Employee'}</h1>
          <p className="mt-1 text-sm text-slate-500">Use the same form for Add and Edit. In Edit mode, existing values are prefilled.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {chips.map((chip) => (
            <div key={chip.title} className={`flex min-w-[150px] items-center gap-2 rounded-2xl border px-3 py-2 ${chip.ok ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${chip.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Icon name={chip.icon} size={16} /></span>
              <span>
                <span className={`block text-xs font-semibold ${chip.ok ? 'text-emerald-700' : 'text-slate-600'}`}>{chip.title}</span>
                <span className="block text-[11px] text-slate-400">{chip.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {!ready ? <p className="text-sm text-slate-500">Loading employee...</p> : null}
      {missing ? null : <>

      <Card icon="UserIcon" title="Personal Information" detail="Basic details about the employee.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Employee ID" hint="e.g. EMP-008"><input className={control} value={form.employee_code} onChange={(e) => set('employee_code', e.target.value.toUpperCase())} /></Field>
          <Field label="Employee Name" required hint="Enter full name"><input className={control} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} /></Field>
          <Field label="Email" hint="name@company.com"><input className={control} value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone" required hint="+91 98765 43210"><input className={control} value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Date of Birth" hint="dd/mm/yyyy"><input type="date" className={control} value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} /></Field>
          <Field label="Gender" required hint="Select Gender">
            <select className={control} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Profile Photo" hint="JPG, PNG (Max 2MB)">
            <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
              <Icon name="ArrowUpTrayIcon" size={16} />
              {photo ? photo.name : form.photo_path ? 'Replace photo' : 'Upload Photo'}
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setPhoto(file);
                setPreview(file ? URL.createObjectURL(file) : '');
              }} />
            </label>
            {preview || form.photo_path ? <img src={preview || `/api/admin/finance/employees/${form.id}/photo`} alt="" className="mt-2 h-14 w-14 rounded-xl object-cover" /> : null}
          </Field>
          <Field label="Emergency Contact" required hint="+91 98765 43210"><input className={control} value={form.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)} /></Field>
        </div>
      </Card>

      <Card icon="BriefcaseIcon" title="Employment Details" detail="Job and organizational information.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Department" hint="Select Department">
            <select className={control} value={form.department} onChange={(e) => set('department', e.target.value)}>
              <option value="">Select Department</option>
              {withCurrent(DEPARTMENTS, form.department).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Designation" required hint="Select Designation">
            <select className={control} value={form.designation} onChange={(e) => set('designation', e.target.value)}>
              <option value="">Select Designation</option>
              {withCurrent(DESIGNATIONS, form.designation).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Employee Type" hint="Select Employee Type">
            <select className={control} value={form.employee_type} onChange={(e) => set('employee_type', e.target.value)}>
              <option value="">Select Employee Type</option>
              {TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Date of Joining" required hint="dd/mm/yyyy"><input type="date" className={control} value={form.date_of_joining} onChange={(e) => set('date_of_joining', e.target.value)} /></Field>
          <Field label="Reporting Manager" hint="Select Manager">
            <select className={control} value={form.reporting_manager_id} onChange={(e) => set('reporting_manager_id', e.target.value)}>
              <option value="">Select Manager</option>
              {employees.filter((employee) => employee.id !== form.id).map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name}</option>)}
            </select>
          </Field>
          <Field label="Work Location" required hint="Select Location">
            <select className={control} value={form.work_location} onChange={(e) => set('work_location', e.target.value)}>
              <option value="">Select Location</option>
              {withCurrent(LOCATIONS, form.work_location).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Status" required hint={workStatus === 'part_time' ? 'No paid leave or payroll benefits' : workStatus === 'probation' ? 'Paid leave is not applied' : 'Paid leave applies'}>
            <select className={control} value={form.employment_status} onChange={(e) => set('employment_status', e.target.value)}>
              <option value="probation">Probation</option>
              <option value="regular">Regular</option>
              <option value="part_time">Part Time</option>
            </select>
          </Field>
          <Field label="Record" hint="Inactive people cannot be newly assigned">
            <select className={control} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Last Working Date" hint="Leave blank while the employee is active"><input type="date" className={control} value={form.last_working_date} onChange={(e) => set('last_working_date', e.target.value)} /></Field>
        </div>
      </Card>

      <Card icon="BanknotesIcon" title="Payroll & Banking" detail="Salary, tax and bank account information.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Annual CTC (₹)" required hint="e.g. 600000"><input className={control} inputMode="decimal" value={form.annual_ctc} onChange={(e) => set('annual_ctc', e.target.value)} /></Field>
          <Field label="Monthly Gross (₹)" hint="Auto calculated"><input className={`${control} bg-slate-50`} readOnly value={monthly} /></Field>
          <Field label="PAN" required hint="e.g. ABCDE1234F"><input className={control} value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} /></Field>
          <Field label="Aadhaar / ID Number" required hint="e.g. 1234 5678 9012"><input className={control} value={form.aadhaar} onChange={(e) => set('aadhaar', e.target.value)} /></Field>
          <Field label="Bank Name" required hint="e.g. HDFC Bank"><input className={control} value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} /></Field>
          <Field label="Bank Account Number" required hint="e.g. 5010 1234 5678"><input className={control} value={form.bank_account_no} onChange={(e) => set('bank_account_no', e.target.value)} /></Field>
          <Field label="IFSC Code" required hint="e.g. HDFC0001234"><input className={control} value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value.toUpperCase())} /></Field>
          <Field label="UAN / PF Number" hint="e.g. 1000 1234 5678"><input className={control} value={form.uan} onChange={(e) => set('uan', e.target.value)} /></Field>
        </div>
      </Card>

      <Card icon="MapPinIcon" title="Address & Records" detail="Address information and additional notes.">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Current Address" required hint="Enter current address"><textarea className={`${control} h-24 py-2`} value={form.current_address} onChange={(e) => set('current_address', e.target.value)} /></Field>
          <Field label="Permanent Address" required hint="Enter permanent address"><textarea className={`${control} h-24 py-2`} value={form.permanent_address} onChange={(e) => set('permanent_address', e.target.value)} /></Field>
        </div>
        <div className="mt-4">
          <Field label="Notes / Remarks" hint="Any additional information, remarks, or internal notes."><textarea className={`${control} h-24 py-2`} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <AdminButton onClick={() => router.push('/admin/hr/employees')}>Cancel</AdminButton>
        <AdminButton variant="primary" onClick={save}>{employeeId ? 'Save Employee' : 'Add Employee'}</AdminButton>
      </div>
      </>}
    </div>
  );
}
