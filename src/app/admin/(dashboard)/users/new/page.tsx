'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';
import AdminPageLoader from '@/components/admin/AdminPageLoader';
import { inheritAccess, type AccessLevel, type FeatureNode } from '@/lib/admin/access';
import { adminInputClass } from '@/components/admin/AdminField';

type RoleOption = { id: string; name: string; permissions?: Record<string, AccessLevel> };
type Employee = { id: string; full_name: string; email: string; user_id: string | null; designation: string | null; department: string | null };

const PREVIEW: { icon: string; label: string; hint: string }[] = [
  { icon: 'HomeIcon', label: 'Dashboard', hint: 'View dashboard and key metrics' },
  { icon: 'MegaphoneIcon', label: 'Sales & Marketing', hint: 'Access marketing tools and campaigns' },
  { icon: 'GlobeAltIcon', label: 'Website Audit', hint: 'View and manage website audit data' },
  { icon: 'DocumentChartBarIcon', label: 'Reports', hint: 'Access reports and analytics' },
];

export default function AddAdminUserPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [tree, setTree] = useState<FeatureNode[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [source, setSource] = useState<'employee' | 'external'>('external');
  const [employeeId, setEmployeeId] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', roleId: '', department: '', notes: '', existingUserId: '' });
  const [sendEmail, setSendEmail] = useState(true);
  const [requirePassword, setRequirePassword] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/rbac/roles').then((r) => r.json()),
      fetch('/api/admin/rbac/users?employees=').then((r) => r.json()),
    ])
      .then(([roleBody, employeeBody]) => {
        setRoles((roleBody.roles || []).filter((role: { status: string }) => role.status === 'active'));
        setTree(roleBody.registry?.tree || []);
        setEmployees(employeeBody.employees || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(
    () => [...new Set(employees.map((row) => row.department).filter(Boolean))] as string[],
    [employees]
  );

  const applyEmployee = (id: string) => {
    setEmployeeId(id);
    const employee = employees.find((row) => row.id === id);
    if (!employee) {
      setForm((current) => ({ ...current, existingUserId: '' }));
      return;
    }
    const [firstName, ...rest] = (employee.full_name || '').split(' ');
    setForm((current) => ({
      ...current,
      firstName,
      lastName: rest.join(' '),
      email: employee.email || current.email,
      department: employee.department || current.department,
      existingUserId: employee.user_id || '',
    }));
  };

  const selectedRole = roles.find((role) => role.id === form.roleId);
  const previewAccess = useMemo(() => {
    if (!form.roleId) return [];
    return PREVIEW.filter((item) => {
      const key = item.label === 'Dashboard' ? 'dashboard' : item.label === 'Website Audit' ? 'website-audit' : item.label === 'Reports' ? 'pm.reports' : 'seo-ads';
      const access = inheritAccess(tree, selectedRole?.permissions || {});
      return selectedRole?.name === 'Super Admin' || access[key] || Object.keys(selectedRole?.permissions || {}).length === 0;
    });
  }, [form.roleId, selectedRole, tree]);

  useEffect(() => {
    if (!form.roleId) return;
    fetch(`/api/admin/rbac/roles/${form.roleId}`)
      .then((r) => r.json())
      .then((body) => {
        if (!body.role) return;
        setRoles((current) => current.map((role) => (role.id === body.role.id ? { ...role, permissions: body.role.permissions } : role)));
      });
  }, [form.roleId]);

  const submit = async (draft: boolean) => {
    if (!form.firstName.trim() || !form.email.trim()) {
      setError('First name and email are required.');
      return;
    }
    if (!draft && !form.roleId) {
      setError('Select a role before sending the invitation.');
      return;
    }
    setSaving(true);
    setError('');
    const notes = [form.department ? `Department: ${form.department}` : '', form.notes].filter(Boolean).join('\n');
    const response = await fetch('/api/admin/rbac/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        notes,
        sendInvite: !draft && sendEmail,
        draft,
      }),
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setError(body.error || 'Could not invite admin user');
      return;
    }
    router.push(`/admin/users/${body.userId}`);
  };

  const card = (active: boolean) =>
    `flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition ${
      active ? 'border-secondary bg-orange-50/70 ring-1 ring-secondary/20' : 'border-slate-100 bg-white hover:border-slate-200'
    }`;

  return (
    <div className="relative min-h-[calc(100dvh-5.5rem)] pb-8">
      <AdminPageLoader open={loading || saving} label={saving ? 'Sending invitation…' : 'Loading admin users…'} />
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Add Admin User</h1>
          <p className="mt-1 text-sm text-slate-400">Create a new admin account or invite an existing employee with the right access level.</p>
        </div>
        <Link href="/admin/users" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600">
          <Icon name="ArrowLeftIcon" size={14} /> Back
        </Link>
      </div>

      {error ? (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
          <Icon name="ExclamationCircleIcon" size={16} /> {error}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <section>
            <Step n={1} title="User Source" hint="Choose whether to invite an existing employee or create an external administrator." />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button type="button" className={card(source === 'employee')} onClick={() => setSource('employee')}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500"><Icon name="UserGroupIcon" size={18} /></span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Existing employee</span>
                  <span className="mt-1 block text-[12px] text-slate-400">Invite someone from your organization with an existing account.</span>
                </span>
                <span className={`ml-auto mt-1 h-4 w-4 rounded-full border ${source === 'employee' ? 'border-4 border-secondary' : 'border-slate-300'}`} />
              </button>
              <button type="button" className={card(source === 'external')} onClick={() => setSource('external')}>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-secondary"><Icon name="UserPlusIcon" size={18} /></span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">External administrator</span>
                  <span className="mt-1 block text-[12px] text-slate-400">Create a new admin account for an external user (client, partner, etc.).</span>
                </span>
                <span className={`ml-auto mt-1 h-4 w-4 rounded-full border ${source === 'external' ? 'border-4 border-secondary' : 'border-slate-300'}`} />
              </button>
            </div>
            {source === 'employee' ? (
              <select className={`${adminInputClass} mt-3`} value={employeeId} onChange={(e) => applyEmployee(e.target.value)}>
                <option value="">Select an employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name} {employee.email ? `· ${employee.email}` : ''}
                  </option>
                ))}
              </select>
            ) : null}
          </section>

          <section>
            <Step n={2} title="Personal Information" hint="Enter the basic details for the admin user." />
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="First name *" value={form.firstName} onChange={(firstName) => setForm({ ...form, firstName })} placeholder="Enter first name" />
              <Field label="Last name" value={form.lastName} onChange={(lastName) => setForm({ ...form, lastName })} placeholder="Enter last name" />
              <Field label="Work email *" value={form.email} onChange={(email) => setForm({ ...form, email })} placeholder="name@company.com" />
              <Field label="Phone number" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} placeholder="+1 (555) 123-4567" />
            </div>
          </section>

          <section>
            <Step n={3} title="Role & Access" hint="Define the user's role, department and review their access permissions." />
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-[12px] font-medium text-slate-600">Role *
                <select className={`${adminInputClass} mt-1.5`} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                  <option value="">Select a role</option>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </label>
              <label className="text-[12px] font-medium text-slate-600">Department / Team (optional)
                <select className={`${adminInputClass} mt-1.5`} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={department} value={department}>{department}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-[12px] text-slate-500">
              <p className="mb-1 flex items-center gap-1 font-semibold text-slate-700"><Icon name="LockClosedIcon" size={14} /> Role Access Preview</p>
              {form.roleId ? 'Permissions for the selected role will appear in the sidebar.' : 'Select a role to see the permissions and modules this user will have access to.'}
            </div>
          </section>

          <section>
            <Step n={4} title="Notes" hint="Add any additional information about this user (optional)." />
            <textarea
              className={`${adminInputClass} mt-3 min-h-[96px]`}
              maxLength={500}
              placeholder="Add notes about this user, their responsibilities or any special instructions..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{form.notes.length}/500</p>
          </section>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600" onClick={() => submit(true)}>
              Save Draft
            </button>
            <button type="button" className="inline-flex h-11 items-center gap-2 rounded-full bg-secondary px-5 text-sm font-semibold text-white" onClick={() => submit(false)}>
              <Icon name="PaperAirplaneIcon" size={16} /> Send Invitation
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="EnvelopeIcon" size={16} className="text-slate-400" /> Invitation Preview</p>
            <p className="mb-4 text-[12px] text-slate-400">Here&apos;s what will happen after you send the invitation.</p>
            <ol className="space-y-4 text-sm">
              <li className="flex gap-3"><span className="mt-0.5 h-5 w-5 rounded-full bg-secondary text-center text-[11px] font-bold leading-5 text-white">1</span><span><span className="font-semibold text-slate-800">Invitation email sent</span><br /><span className="text-[12px] text-slate-400">The user will receive an invitation email with setup instructions.</span></span></li>
              <li className="flex gap-3"><span className="mt-0.5 h-5 w-5 rounded-full bg-slate-100 text-center text-[11px] font-bold leading-5 text-slate-500">2</span><span><span className="font-semibold text-slate-800">Account activation</span><br /><span className="text-[12px] text-slate-400">User creates their password and activates their account.</span></span></li>
              <li className="flex gap-3"><span className="mt-0.5 h-5 w-5 rounded-full bg-slate-100 text-center text-[11px] font-bold leading-5 text-slate-500">3</span><span><span className="font-semibold text-slate-800">Access granted</span><br /><span className="text-[12px] text-slate-400">User can sign in and access their assigned modules.</span></span></li>
            </ol>
          </div>
          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="ShieldCheckIcon" size={16} className="text-slate-400" /> Role Permissions</p>
            <p className="mb-3 text-[12px] text-slate-400">Permissions will be shown here once a role is selected.</p>
            <ul className="space-y-3">
              {(form.roleId ? previewAccess : PREVIEW).map((item) => (
                <li key={item.label} className="flex gap-3 text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500"><Icon name={item.icon} size={16} /></span>
                  <span><span className="font-semibold text-slate-800">{item.label}</span><br /><span className="text-[12px] text-slate-400">{item.hint}</span></span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900"><Icon name="Cog6ToothIcon" size={16} className="text-slate-400" /> Additional Options</p>
            <p className="mb-3 text-[12px] text-slate-400">Configure additional invitation settings.</p>
            <label className="mb-2 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1 accent-[#EF4323]" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /><span><span className="font-semibold">Send email invite</span><br /><span className="text-[12px] text-slate-400">Send an invitation email to the user.</span></span></label>
            <label className="mb-2 flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1 accent-[#EF4323]" checked={requirePassword} onChange={(e) => setRequirePassword(e.target.checked)} /><span><span className="font-semibold">Require password reset</span><br /><span className="text-[12px] text-slate-400">User must set a new password on first login.</span></span></label>
            <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1 accent-[#EF4323]" checked={notifyWhatsapp} onChange={(e) => setNotifyWhatsapp(e.target.checked)} /><span><span className="font-semibold">Notify by WhatsApp</span><br /><span className="text-[12px] text-slate-400">Send a WhatsApp notification (if phone number).</span></span></label>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Step({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-600">{n}</span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-[12px] text-slate-400">{hint}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="text-[12px] font-medium text-slate-600">
      {label}
      <input className={`${adminInputClass} mt-1.5`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
