'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { CcBadge, CcShell, Field, Panel, Td, Th, inputClass, money } from '@/components/admin/cost-center/ui';

type Rate = {
  id?: string;
  role_key: string;
  role_label: string;
  hourly_cost: string;
  active: boolean;
  sort_order: number;
};

const empty: Rate = { role_key: '', role_label: '', hourly_cost: '0', active: true, sort_order: 100 };

export default function ResourceRatesPage() {
  const [rows, setRows] = useState<Rate[]>([]);
  const [form, setForm] = useState<Rate>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = () => {
    fetch('/api/admin/cost-center/rates')
      .then((r) => r.json())
      .then((body) => setRows(body.rows || []));
  };

  useEffect(load, []);

  const save = async () => {
    setError('');
    const res = await fetch(editing ? `/api/admin/cost-center/rates/${editing}` : '/api/admin/cost-center/rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Could not save rate');
      return;
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this role rate?')) return;
    const res = await fetch(`/api/admin/cost-center/rates/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || 'Could not delete');
      return;
    }
    load();
  };

  return (
    <CcShell>
      <AdminPageHeader
        title="Resource Rates"
        action={
          <AdminButton
            variant="primary"
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setOpen(true);
            }}
          >
            + Add Role Rate
          </AdminButton>
        }
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <Panel title="Role-wise default hourly cost">
        <table className="min-w-full">
          <thead>
            <tr>
              <Th>Role</Th>
              <Th>Key</Th>
              <Th>Hourly Cost</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.role_label}</Td>
                <Td>{row.role_key}</Td>
                <Td>{money(row.hourly_cost)}</Td>
                <Td>
                  <CcBadge value={row.active ? 'active' : 'inactive'} />
                </Td>
                <Td>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-sm text-secondary"
                      onClick={() => {
                        setEditing(row.id || null);
                        setForm({
                          role_key: row.role_key,
                          role_label: row.role_label,
                          hourly_cost: String(row.hourly_cost),
                          active: row.active,
                          sort_order: row.sort_order,
                        });
                        setOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="text-sm text-rose-600" onClick={() => row.id && remove(row.id)}>
                      Delete
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {open ? (
        <Panel title={editing ? 'Edit role rate' : 'New role rate'}>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <Field label="Role label">
              <input className={inputClass} value={form.role_label} onChange={(e) => setForm({ ...form, role_label: e.target.value })} />
            </Field>
            <Field label="Role key">
              <input className={inputClass} value={form.role_key} onChange={(e) => setForm({ ...form, role_key: e.target.value })} />
            </Field>
            <Field label="Hourly cost">
              <input
                type="number"
                className={inputClass}
                value={form.hourly_cost}
                onChange={(e) => setForm({ ...form, hourly_cost: e.target.value })}
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                className={inputClass}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 100 })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Active
            </label>
            <div className="flex gap-2 md:col-span-2">
              <AdminButton variant="primary" onClick={save}>
                Save
              </AdminButton>
              <AdminButton onClick={() => setOpen(false)}>Cancel</AdminButton>
            </div>
          </div>
        </Panel>
      ) : null}
    </CcShell>
  );
}
