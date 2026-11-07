'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminStatusModal from '@/components/admin/AdminStatusModal';
import Icon from '@/components/ui/AppIcon';
import { employeeAdminPath, findEmployeeBySlug } from '@/lib/hr/employee-slug';
import { HrSalary, useSalaryVisibility } from '@/components/admin/hr/HrSalary';

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

type FormKey = keyof typeof empty;
type FieldErrors = Partial<Record<FormKey, string>>;

function filled(value: string) {
  return Boolean(String(value || '').trim());
}

function money(annual: string) {
  const text = annual.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,4})?$/.test(text)) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(text) / 12);
}

function digitsOnly(value: string) {
  return value.replace(/[\s-]/g, '');
}

function validateField(key: FormKey, form: typeof empty): string {
  const value = String(form[key] || '').trim();
  switch (key) {
    case 'employee_code':
      if (!value) return 'Employee ID is required';
      if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/i.test(value)) return 'Use letters, numbers, hyphen or underscore';
      return '';
    case 'full_name':
      if (!value) return 'Employee name is required';
      if (value.length < 2) return 'Enter the full name';
      return '';
    case 'email':
      if (!value) return '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
      return '';
    case 'phone':
    case 'emergency_contact':
      if (!value) return '';
      if (!/^\+?[0-9]{10,15}$/.test(digitsOnly(value))) return 'Enter a valid phone number (10–15 digits)';
      return '';
    case 'date_of_birth':
    case 'date_of_joining':
    case 'last_working_date':
      if (!value) return '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Enter a valid date';
      return '';
    case 'annual_ctc':
      if (!value) return '';
      if (!/^\d+(\.\d{1,4})?$/.test(value.replace(/,/g, ''))) return 'Enter a valid amount';
      if (Number(value.replace(/,/g, '')) <= 0) return 'Annual CTC must be greater than 0';
      return '';
    case 'pan':
      if (!value) return '';
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(value)) return 'PAN must look like ABCDE1234F';
      return '';
    case 'aadhaar':
      if (!value) return '';
      if (!/^\d{12}$/.test(digitsOnly(value))) return 'Aadhaar must be 12 digits';
      return '';
    case 'bank_account_no':
      if (!value) return '';
      if (!/^\d{9,18}$/.test(digitsOnly(value))) return 'Account number must be 9–18 digits';
      return '';
    case 'ifsc_code':
      if (!value) return '';
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value)) return 'IFSC must look like HDFC0001234';
      return '';
    case 'gender':
      if (!value) return '';
      if (!['male', 'female', 'other'].includes(value)) return 'Choose a valid gender';
      return '';
    case 'employee_type':
      if (!value) return '';
      if (!['full_time', 'part_time', 'contract', 'intern'].includes(value)) return 'Choose a valid employee type';
      return '';
    default:
      return '';
  }
}

function validateForm(form: typeof empty): FieldErrors {
  const errors: FieldErrors = {};
  (Object.keys(empty) as FormKey[]).forEach((key) => {
    const message = validateField(key, form);
    if (message) errors[key] = message;
  });
  if (form.date_of_birth && form.date_of_joining && form.date_of_joining < form.date_of_birth) {
    errors.date_of_joining = 'Date of joining cannot be before date of birth';
  }
  if (form.date_of_joining && form.last_working_date && form.last_working_date < form.date_of_joining) {
    errors.last_working_date = 'Last working date cannot be before the joining date';
  }
  return errors;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

const control = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-secondary';
const controlError = 'border-rose-300 focus:border-rose-400';

function Card({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-secondary">
          <Icon name={icon} size={18} />
        </span>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function EmployeeForm({ employeeSlug }: { employeeSlug?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(empty);
  const [baseline, setBaseline] = useState(empty);
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [ready, setReady] = useState(!employeeSlug);
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState<{ title: string; message: string; variant: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/admin/finance/employees')
      .then((response) => response.json())
      .then((list) => {
        const rows = Array.isArray(list) ? list : [];
        setEmployees(rows);
        if (!employeeSlug) {
          const numbers = rows
            .map((row) => /^EMP-(\d+)$/i.exec(String(row.employee_code || '')))
            .filter(Boolean)
            .map((match) => Number(match?.[1]));
          const next = String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(3, '0');
          const seeded = { ...empty, employee_code: `EMP-${next}` };
          setForm(seeded);
          setBaseline(seeded);
          setReady(true);
          return;
        }
        const employee = findEmployeeBySlug(rows, employeeSlug);
        if (!employee) {
          setError('Employee not found');
          setMissing(true);
          setReady(true);
          return;
        }
        const canonical = employeeAdminPath(employee, rows);
        if (canonical !== `/admin/hr/employees/${employeeSlug}`) {
          router.replace(canonical);
        }
        const next = {
          ...empty,
          ...Object.fromEntries(Object.keys(empty).map((key) => [key, employee[key] == null ? '' : String(employee[key])])),
          date_of_birth: String(employee.date_of_birth || '').slice(0, 10),
          date_of_joining: String(employee.date_of_joining || '').slice(0, 10),
          last_working_date: String(employee.last_working_date || '').slice(0, 10),
          status: employee.status || 'active',
        };
        setForm(next);
        setBaseline(next);
        setReady(true);
      });
  }, [employeeSlug, router]);

  const set = (key: FormKey, value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      setFieldErrors((errors) => {
        const message = validateField(key, next);
        if (!message && !errors[key]) return errors;
        const copy = { ...errors };
        if (message) copy[key] = message;
        else delete copy[key];
        return copy;
      });
      return next;
    });
  };

  const payrollReady = [form.annual_ctc, form.pan, form.aadhaar, form.bank_name, form.bank_account_no, form.ifsc_code].every(filled);
  const profileReady = [form.employee_code, form.full_name, form.phone, form.gender, form.emergency_contact, form.designation, form.work_location, form.current_address, form.permanent_address].every(filled);
  const joined = filled(form.date_of_joining);
  const active = form.status === 'active';
  const workStatus = form.employment_status || 'regular';
  const workLabel = workStatus === 'probation' ? 'Probation' : workStatus === 'part_time' ? 'Part Time' : 'Regular';
  const monthly = useMemo(() => money(form.annual_ctc), [form.annual_ctc]);
  const dirty = useMemo(() => Boolean(photo) || JSON.stringify(form) !== JSON.stringify(baseline), [baseline, form, photo]);
  const salaryVisibility = useSalaryVisibility();
  const [revealCtc, setRevealCtc] = useState(false);

  const withCurrent = (options: string[], current: string) => (current && !options.includes(current) ? [current, ...options] : options);

  const save = async () => {
    setError('');
    setMessage('');
    if (!dirty) {
      setError('No employee changes to save.');
      return;
    }
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError('Fix the highlighted fields before saving.');
      return;
    }
    setSaving(true);
    const res = await fetch(form.id ? `/api/admin/finance/employees/${form.id}` : '/api/admin/finance/employees', {
      method: form.id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, require_profile: false }),
    });
    const body = await res.json();
    if (!res.ok) {
      setSaving(false);
      const next = body.error || 'Could not save employee';
      setError(next);
      setStatusModal({ title: 'Save failed', message: next, variant: 'error' });
      return;
    }
    if (photo && body.id) {
      const data = new FormData();
      data.append('file', photo);
      const uploaded = await fetch(`/api/admin/finance/employees/${body.id}/photo`, { method: 'POST', body: data });
      const uploadedBody = await uploaded.json();
      if (!uploaded.ok) {
        setSaving(false);
        const next = uploadedBody.error || 'Employee saved, but the photo was not uploaded';
        setError(next);
        setForm((current) => ({ ...current, id: body.id }));
        setStatusModal({ title: 'Photo upload failed', message: next, variant: 'error' });
        return;
      }
    }
    setSaving(false);
    const saved = {
      ...form,
      id: body.id || form.id,
      photo_path: body.photo_path || form.photo_path,
      full_name: body.full_name || form.full_name,
      employee_code: body.employee_code || form.employee_code,
    };
    if (!employeeSlug) {
      setStatusModal({ title: 'Employee created', message: 'The employee profile was saved successfully.', variant: 'success' });
      router.push(employeeAdminPath(saved, [...employees, saved]));
      return;
    }
    setMessage('Employee updated');
    setStatusModal({ title: 'Employee updated', message: 'Employee details were saved successfully.', variant: 'success' });
    setForm(saved);
    setBaseline(saved);
    setPhoto(null);
    const nextPath = employeeAdminPath(saved, employees.map((row) => (row.id === saved.id ? saved : row)));
    if (nextPath !== `/admin/hr/employees/${employeeSlug}`) router.replace(nextPath);
  };

  const chips = [
    { ok: active, title: active ? workLabel : 'Inactive', detail: workStatus === 'part_time' ? 'No leave or benefits' : workStatus === 'probation' ? 'No paid leave' : 'Leave policy applies', icon: 'CheckCircleIcon' },
    { ok: payrollReady, title: 'Payroll Eligible', detail: payrollReady ? 'Salary & Payslips' : 'Payroll details missing', icon: 'BanknotesIcon' },
    { ok: profileReady, title: 'HR Record', detail: profileReady ? 'Profile Complete' : 'Profile incomplete', icon: 'IdentificationIcon' },
    { ok: joined, title: joined ? 'Joined' : 'Joining Pending', detail: joined ? 'Joining date set' : 'Not yet joined', icon: 'CalendarDaysIcon' },
  ];

  const input = (key: FormKey, extra = '') => `${control} ${fieldErrors[key] ? controlError : ''} ${extra}`.trim();

  return (
    <div className="space-y-4">
      <Link href="/admin/hr/employees" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <Icon name="ChevronLeftIcon" size={16} /> Back to Employees
      </Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900">{employeeSlug ? 'Edit Employee' : 'Add Employee'}</h1>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {chips.map((chip) => (
            <div key={chip.title} className={`flex min-w-[150px] items-center gap-2 rounded-2xl border px-3 py-2 ${chip.ok ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${chip.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <Icon name={chip.icon} size={16} />
              </span>
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
      {missing ? null : (
        <>
          <Card icon="UserIcon" title="Personal Information">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Employee ID" error={fieldErrors.employee_code}>
                <input className={input('employee_code')} placeholder="EMP-008" value={form.employee_code} onChange={(e) => set('employee_code', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Employee Name" error={fieldErrors.full_name}>
                <input className={input('full_name')} placeholder="Full name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
              </Field>
              <Field label="Email" error={fieldErrors.email}>
                <input className={input('email')} type="email" placeholder="name@company.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Phone" error={fieldErrors.phone}>
                <input className={input('phone')} inputMode="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Date of Birth" error={fieldErrors.date_of_birth}>
                <input type="date" className={input('date_of_birth')} value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
              </Field>
              <Field label="Gender" error={fieldErrors.gender}>
                <select className={input('gender')} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Profile Photo">
                <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500">
                  <Icon name="ArrowUpTrayIcon" size={16} />
                  {photo ? photo.name : form.photo_path ? 'Replace photo' : 'Upload photo (JPG/PNG)'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setPhoto(file);
                      setPreview(file ? URL.createObjectURL(file) : '');
                    }}
                  />
                </label>
                {preview || form.photo_path ? (
                  <img src={preview || `/api/admin/finance/employees/${form.id}/photo`} alt="" className="mt-2 h-14 w-14 rounded-xl object-cover" />
                ) : null}
              </Field>
              <Field label="Emergency Contact" error={fieldErrors.emergency_contact}>
                <input className={input('emergency_contact')} inputMode="tel" placeholder="+91 98765 43210" value={form.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card icon="BriefcaseIcon" title="Employment Details">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Department">
                <select className={input('department')} value={form.department} onChange={(e) => set('department', e.target.value)}>
                  <option value="">Select department</option>
                  {withCurrent(DEPARTMENTS, form.department).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Designation">
                <select className={input('designation')} value={form.designation} onChange={(e) => set('designation', e.target.value)}>
                  <option value="">Select designation</option>
                  {withCurrent(DESIGNATIONS, form.designation).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Employee Type" error={fieldErrors.employee_type}>
                <select className={input('employee_type')} value={form.employee_type} onChange={(e) => set('employee_type', e.target.value)}>
                  <option value="">Select employee type</option>
                  {TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Date of Joining" error={fieldErrors.date_of_joining}>
                <input type="date" className={input('date_of_joining')} value={form.date_of_joining} onChange={(e) => set('date_of_joining', e.target.value)} />
              </Field>
              <Field label="Reporting Manager">
                <select className={input('reporting_manager_id')} value={form.reporting_manager_id} onChange={(e) => set('reporting_manager_id', e.target.value)}>
                  <option value="">Select manager</option>
                  {employees
                    .filter((employee) => employee.id !== form.id)
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.full_name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Work Location">
                <select className={input('work_location')} value={form.work_location} onChange={(e) => set('work_location', e.target.value)}>
                  <option value="">Select location</option>
                  {withCurrent(LOCATIONS, form.work_location).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select className={input('employment_status')} value={form.employment_status} onChange={(e) => set('employment_status', e.target.value)}>
                  <option value="probation">Probation</option>
                  <option value="regular">Regular</option>
                  <option value="part_time">Part Time</option>
                </select>
              </Field>
              <Field label="Record">
                <select className={input('status')} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Last Working Date" error={fieldErrors.last_working_date}>
                <input type="date" className={input('last_working_date')} value={form.last_working_date} onChange={(e) => set('last_working_date', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card icon="BanknotesIcon" title="Payroll & Banking">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Annual CTC (₹)" error={fieldErrors.annual_ctc}>
                {salaryVisibility === 'hidden' && !revealCtc ? (
                  <button
                    type="button"
                    className={`${control} flex items-center justify-between text-left`}
                    onClick={() => setRevealCtc(true)}
                  >
                    <HrSalary value={form.annual_ctc || null} />
                    <span className="text-xs font-semibold text-secondary">Reveal to edit</span>
                  </button>
                ) : (
                  <input
                    className={`${input('annual_ctc')} ${salaryVisibility === 'blur' && !revealCtc ? 'blur-[6px] focus:blur-none' : ''}`}
                    inputMode="decimal"
                    placeholder="600000"
                    value={form.annual_ctc}
                    onChange={(e) => set('annual_ctc', e.target.value)}
                    onFocus={() => setRevealCtc(true)}
                  />
                )}
              </Field>
              <Field label="Monthly Gross (₹)">
                <div className={`${control} flex items-center bg-slate-50`}>
                  {monthly ? <HrSalary formatted={monthly} /> : <span className="text-slate-400">Auto calculated</span>}
                </div>
              </Field>
              <Field label="PAN" error={fieldErrors.pan}>
                <input className={input('pan')} placeholder="ABCDE1234F" value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Aadhaar / ID Number" error={fieldErrors.aadhaar}>
                <input className={input('aadhaar')} placeholder="1234 5678 9012" value={form.aadhaar} onChange={(e) => set('aadhaar', e.target.value)} />
              </Field>
              <Field label="Bank Name">
                <input className={input('bank_name')} placeholder="HDFC Bank" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} />
              </Field>
              <Field label="Bank Account Number" error={fieldErrors.bank_account_no}>
                <input className={input('bank_account_no')} placeholder="501012345678" value={form.bank_account_no} onChange={(e) => set('bank_account_no', e.target.value)} />
              </Field>
              <Field label="IFSC Code" error={fieldErrors.ifsc_code}>
                <input className={input('ifsc_code')} placeholder="HDFC0001234" value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value.toUpperCase())} />
              </Field>
              <Field label="UAN / PF Number">
                <input className={input('uan')} placeholder="100012345678" value={form.uan} onChange={(e) => set('uan', e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card icon="MapPinIcon" title="Address & Records">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Current Address">
                <textarea className={`${input('current_address')} h-24 py-2`} placeholder="Enter current address" value={form.current_address} onChange={(e) => set('current_address', e.target.value)} />
              </Field>
              <Field label="Permanent Address">
                <textarea className={`${input('permanent_address')} h-24 py-2`} placeholder="Enter permanent address" value={form.permanent_address} onChange={(e) => set('permanent_address', e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Notes / Remarks">
                <textarea className={`${input('notes')} h-24 py-2`} placeholder="Additional notes or remarks" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
              </Field>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <AdminButton onClick={() => router.push('/admin/hr/employees')}>Cancel</AdminButton>
            <AdminButton variant="primary" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving...' : employeeSlug ? 'Save Employee' : 'Add Employee'}
            </AdminButton>
          </div>
        </>
      )}
      <AdminStatusModal
        open={Boolean(statusModal)}
        title={statusModal?.title || ''}
        message={statusModal?.message || ''}
        variant={statusModal?.variant || 'success'}
        onClose={() => setStatusModal(null)}
      />
    </div>
  );
}
