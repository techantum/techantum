'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { CcBadge, CcShell, Field, Panel, Stat, Td, Th, inputClass, money } from '@/components/admin/cost-center/ui';
import { OPS_CATEGORIES, OPS_CATEGORY_LABELS } from '@/lib/cost-center/types';

type Cost = {
  id?: string;
  cost_name: string;
  monthly_amount: string;
  category: string;
  active: boolean;
  notes: string;
  sort_order: number;
};

const empty: Cost = {
  cost_name: '',
  monthly_amount: '0',
  category: 'other',
  active: true,
  notes: '',
  sort_order: 100,
};

export default function OperationalCostsPage() {
  const [rows, setRows] = useState<Cost[]>([]);
  const [overhead, setOverhead] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<Cost>(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = () => {
    fetch('/api/admin/cost-center/operational-costs')
      .then((r) => r.json())
      .then((body) => {
        setRows(body.rows || []);
        setOverhead(body.overhead || null);
      });
  };

  useEffect(load, []);

  const save = async () => {
    setError('');
    const res = await fetch(
      editing ? `/api/admin/cost-center/operational-costs/${editing}` : '/api/admin/cost-center/operational-costs',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      }
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Could not save cost');
      return;
    }
    setOpen(false);
    setEditing(null);
    setForm(empty);
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this operational cost?')) return;
    const res = await fetch(`/api/admin/cost-center/operational-costs/${id}`, { method: 'DELETE' });
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
        title="Operational Costs"
        action={
          <AdminButton
            variant="primary"
            onClick={() => {
              setEditing(null);
              setForm(empty);
              setOpen(true);
            }}
          >
            + Add Cost
          </AdminButton>
        }
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Monthly Ops Cost" value={money(overhead?.monthly_operational_cost)} />
        <Stat label="Productive Hours / Month" value={Number(overhead?.productive_hours_per_month || 0).toFixed(1)} />
        <Stat label="Ops Cost / Hour" value={money(overhead?.operational_cost_per_hour)} hint={String(overhead?.formula || '')} />
      </div>

      <Panel title="Monthly business costs">
        <table className="min-w-full">
          <thead>
            <tr>
              <Th>Cost Name</Th>
              <Th>Category</Th>
              <Th>Monthly Amount</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <Td>{row.cost_name}</Td>
                <Td>{OPS_CATEGORY_LABELS[row.category] || row.category}</Td>
                <Td>{money(row.monthly_amount)}</Td>
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
                          cost_name: row.cost_name,
                          monthly_amount: String(row.monthly_amount),
                          category: row.category,
                          active: row.active,
                          notes: row.notes || '',
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
        <Panel title={editing ? 'Edit operational cost' : 'New operational cost'}>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <Field label="Cost name">
              <input className={inputClass} value={form.cost_name} onChange={(e) => setForm({ ...form, cost_name: e.target.value })} />
            </Field>
            <Field label="Category">
              <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {OPS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {OPS_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Monthly amount">
              <input
                type="number"
                className={inputClass}
                value={form.monthly_amount}
                onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })}
              />
            </Field>
            <Field label="Notes">
              <input className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
