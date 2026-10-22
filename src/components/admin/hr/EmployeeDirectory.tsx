'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Icon from '@/components/ui/AppIcon';
import { formatINR, toCents } from '@/lib/finance/money';

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-secondary';

export default function EmployeeDirectory() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Record<string, string>[]>([]);
  const [draft, setDraft] = useState({ q: '', department: '', status: '' });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [menu, setMenu] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const list = await fetch('/api/admin/finance/employees').then((response) => response.json());
    setEmployees(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    void load();
  }, []);

  const departments = useMemo(() => {
    const values = new Set<string>();
    employees.forEach((employee) => {
      if (employee.department) values.add(employee.department);
    });
    return [...values].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    return employees.filter((employee) => {
      if (filters.department && employee.department !== filters.department) return false;
      if (filters.status === 'inactive' && (employee.status || 'active') !== 'inactive') return false;
      if (filters.status && filters.status !== 'inactive' && ((employee.status || 'active') === 'inactive' || (employee.employment_status || 'regular') !== filters.status)) return false;
      if (!query) return true;
      return [employee.full_name, employee.employee_code, employee.email, employee.phone].some((value) =>
        String(value || '').toLowerCase().includes(query)
      );
    });
  }, [employees, filters]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  const setStatus = async (employee: Record<string, string>, status: string) => {
    setMenu('');
    setError('');
    const res = await fetch(`/api/admin/finance/employees/${employee.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...employee,
        date_of_birth: String(employee.date_of_birth || '').slice(0, 10),
        date_of_joining: String(employee.date_of_joining || '').slice(0, 10),
        last_working_date: String(employee.last_working_date || '').slice(0, 10),
        status,
        require_profile: false,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error || 'Could not update status');
      return;
    }
    await load();
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Employees"
        description="Employee records used for payslips. Status is Regular, Probation, or Part Time. Probation and part-time employees do not receive paid leave, and part-time employees do not receive payroll benefits."
        action={<AdminButton variant="primary" onClick={() => router.push('/admin/hr/employees/new')}>+ Add Employee</AdminButton>}
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.4fr_1fr_1fr_auto_auto] md:items-end">
        <label className="block text-sm font-medium text-slate-700">
          Search
          <span className="relative mt-1 block">
            <Icon name="MagnifyingGlassIcon" className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
            <input className={`${inputClass} pl-10`} placeholder="Search by employee name, ID or email..." value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { setFilters(draft); setPage(1); } }} />
          </span>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Department
          <select className={`${inputClass} mt-1`} value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })}>
            <option value="">All Departments</option>
            {departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Status
          <select className={`${inputClass} mt-1`} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="regular">Regular</option>
            <option value="probation">Probation</option>
            <option value="part_time">Part Time</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <AdminButton variant="primary" onClick={() => { setFilters(draft); setPage(1); }}>Search</AdminButton>
        <AdminButton onClick={() => { const empty = { q: '', department: '', status: '' }; setDraft(empty); setFilters(empty); setPage(1); }}>Clear</AdminButton>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Employees ({filtered.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Employee ID</th>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Annual CTC (₹)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((employee) => {
                const inactive = (employee.status || 'active') === 'inactive';
                const work = employee.employment_status || 'regular';
                const label = inactive ? 'Inactive' : work === 'probation' ? 'Probation' : work === 'part_time' ? 'Part Time' : 'Regular';
                const tone = inactive ? 'bg-slate-100 text-slate-500' : work === 'probation' ? 'bg-amber-50 text-amber-700' : work === 'part_time' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700';
                const dot = inactive ? 'bg-slate-400' : work === 'probation' ? 'bg-amber-500' : work === 'part_time' ? 'bg-sky-500' : 'bg-emerald-500';
                return (
                  <tr key={employee.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-500">{employee.employee_code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{employee.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{employee.designation || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{employee.department || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{employee.work_location || '—'}</td>
                    <td className="px-4 py-3 text-slate-800">{employee.annual_ctc ? formatINR(toCents(employee.annual_ctc)) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                        {label}
                      </span>
                    </td>
                    <td className="relative px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Link href={`/admin/hr/employees/${employee.id}`} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700" aria-label="View employee"><Icon name="EyeIcon" size={16} /></Link>
                        <Link href={`/admin/hr/employees/${employee.id}`} className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700" aria-label="Edit employee"><Icon name="PencilSquareIcon" size={16} /></Link>
                        <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100 hover:text-slate-700" aria-label="More actions" onClick={() => setMenu(menu === employee.id ? '' : employee.id)}><Icon name="EllipsisVerticalIcon" size={16} /></button>
                      </div>
                      {menu === employee.id ? (
                        <div className="absolute right-4 z-10 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                          <button type="button" className="block w-full px-3 py-2 text-left hover:bg-slate-50" onClick={() => setStatus(employee, inactive ? 'active' : 'inactive')}>{inactive ? 'Mark active' : 'Mark inactive'}</button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {!rows.length ? <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No employees match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <p>Showing {filtered.length ? start + 1 : 0} to {Math.min(start + pageSize, filtered.length)} of {filtered.length} employees</p>
          <div className="flex items-center gap-2">
            {Array.from({ length: pages }, (_, index) => index + 1).slice(0, 5).map((number) => (
              <button key={number} type="button" className={`h-8 w-8 rounded-lg ${number === currentPage ? 'bg-orange-50 font-semibold text-secondary' : 'hover:bg-slate-50'}`} onClick={() => setPage(number)}>{number}</button>
            ))}
            <label className="ml-2 flex items-center gap-2">
              Rows per page
              <select className="rounded-lg border border-slate-200 px-2 py-1" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
                {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}
