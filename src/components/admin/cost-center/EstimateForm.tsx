'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { CcShell, Field, Panel, Td, Th, inputClass, money, pct, CcBadge } from './ui';
import { DEFAULT_ROLES, STATUS_LABELS } from '@/lib/cost-center/types';

type Lookups = {
  clients: { id: string; name: string; client_code?: string }[];
  projects: { id: string; project_name: string; project_code?: string; client_id?: string; client_name?: string }[];
  employees: { id: string; full_name: string; designation?: string; employee_code?: string }[];
  roles: { role_key: string; role_label: string; hourly_cost: string }[];
  projectTypes: { id: string; name: string }[];
  overhead?: { operational_cost_per_hour: number; monthly_operational_cost: number };
};

type ResourceRow = {
  key: string;
  role_key: string;
  role_label: string;
  employee_id: string;
  designation: string;
  hourly_cost: string;
  cost_overridden: boolean;
  planned_hours: string;
  allocation_pct: string;
};

type FormState = {
  estimate_name: string;
  client_id: string;
  project_id: string;
  project_type: string;
  scope_summary: string;
  modules_count: string;
  screens_count: string;
  apis_count: string;
  complexity: string;
  adjusted_hours: string;
  hours_override: boolean;
  additional_cost: string;
  proposed_client_price: string;
  notes: string;
  status: string;
  resources: ResourceRow[];
};

type Preview = {
  system_estimated_hours?: number;
  adjusted_hours?: number | null;
  final_approved_hours?: number;
  resource_cost?: number;
  operational_cost_per_hour?: number;
  project_operational_cost?: number;
  additional_cost?: number;
  total_internal_cost?: number;
  expected_profit?: number | null;
  profit_margin_pct?: number | null;
  resources?: { total_resource_cost?: number | string }[];
};

const emptyForm = (): FormState => ({
  estimate_name: '',
  client_id: '',
  project_id: '',
  project_type: '',
  scope_summary: '',
  modules_count: '0',
  screens_count: '0',
  apis_count: '0',
  complexity: 'medium',
  adjusted_hours: '',
  hours_override: false,
  additional_cost: '0',
  proposed_client_price: '',
  notes: '',
  status: 'draft',
  resources: [],
});

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function EstimateForm({
  estimateId,
  mode = 'edit',
}: {
  estimateId?: string;
  mode?: 'edit' | 'calculator';
}) {
  const router = useRouter();
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!estimateId);

  useEffect(() => {
    fetch('/api/admin/cost-center/lookups')
      .then((r) => r.json())
      .then((body) => setLookups(body))
      .catch(() => setError('Could not load lookups'));
  }, []);

  useEffect(() => {
    if (!estimateId) return;
    fetch(`/api/admin/cost-center/estimates/${estimateId}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.error) {
          setError(body.error);
          return;
        }
        setForm({
          estimate_name: body.estimate_name || '',
          client_id: body.client_id || '',
          project_id: body.project_id || '',
          project_type: body.project_type || '',
          scope_summary: body.scope_summary || '',
          modules_count: String(body.modules_count ?? 0),
          screens_count: String(body.screens_count ?? 0),
          apis_count: String(body.apis_count ?? 0),
          complexity: body.complexity || 'medium',
          adjusted_hours: body.adjusted_hours != null ? String(body.adjusted_hours) : '',
          hours_override: Boolean(body.hours_override),
          additional_cost: String(body.additional_cost ?? 0),
          proposed_client_price: body.proposed_client_price != null ? String(body.proposed_client_price) : '',
          notes: body.notes || '',
          status: body.status || 'draft',
          resources: (body.resources || []).map((r: Record<string, unknown>) => ({
            key: String(r.id || uid()),
            role_key: String(r.role_key || 'other'),
            role_label: String(r.role_label || 'Other'),
            employee_id: r.employee_id ? String(r.employee_id) : '',
            designation: r.designation ? String(r.designation) : '',
            hourly_cost: String(r.hourly_cost ?? 0),
            cost_overridden: Boolean(r.cost_overridden),
            planned_hours: String(r.planned_hours ?? 0),
            allocation_pct: String(r.allocation_pct ?? 100),
          })),
        });
        setPreview({
          system_estimated_hours: Number(body.system_estimated_hours),
          adjusted_hours: body.adjusted_hours != null ? Number(body.adjusted_hours) : null,
          final_approved_hours: Number(body.final_approved_hours),
          resource_cost: Number(body.resource_cost),
          operational_cost_per_hour: Number(body.operational_cost_per_hour),
          project_operational_cost: Number(body.project_operational_cost),
          additional_cost: Number(body.additional_cost),
          total_internal_cost: Number(body.total_internal_cost),
          expected_profit: body.expected_profit != null ? Number(body.expected_profit) : null,
          profit_margin_pct: body.profit_margin_pct != null ? Number(body.profit_margin_pct) : null,
        });
        setLoaded(true);
      })
      .catch(() => setError('Could not load estimate'));
  }, [estimateId]);

  const projects = useMemo(() => {
    if (!lookups) return [];
    if (!form.client_id) return lookups.projects;
    return lookups.projects.filter((p) => p.client_id === form.client_id);
  }, [lookups, form.client_id]);

  const payload = () => ({
    estimate_name: form.estimate_name || (mode === 'calculator' ? 'Calculator preview' : ''),
    client_id: form.client_id || null,
    project_id: form.project_id || null,
    project_type: form.project_type || null,
    scope_summary: form.scope_summary || null,
    modules_count: Number(form.modules_count) || 0,
    screens_count: Number(form.screens_count) || 0,
    apis_count: Number(form.apis_count) || 0,
    complexity: form.complexity,
    adjusted_hours: form.adjusted_hours === '' ? null : Number(form.adjusted_hours),
    hours_override: form.hours_override,
    additional_cost: Number(form.additional_cost) || 0,
    proposed_client_price: form.proposed_client_price === '' ? null : Number(form.proposed_client_price),
    notes: form.notes || null,
    status: form.status,
    resources: form.resources.map((r) => ({
      role_key: r.role_key,
      role_label: r.role_label,
      employee_id: r.employee_id || null,
      designation: r.designation || null,
      hourly_cost: Number(r.hourly_cost) || 0,
      cost_overridden: r.cost_overridden,
      planned_hours: Number(r.planned_hours) || 0,
      allocation_pct: Number(r.allocation_pct) || 100,
    })),
  });

  const refreshPreview = async () => {
    setError('');
    const res = await fetch('/api/admin/cost-center/estimates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error || 'Could not calculate');
      return;
    }
    setPreview(body);
    if (Array.isArray(body.resources)) {
      setForm((prev) => ({
        ...prev,
        resources: prev.resources.map((row, idx) => ({
          ...row,
          hourly_cost: String(body.resources[idx]?.hourly_cost ?? row.hourly_cost),
          designation: body.resources[idx]?.designation || row.designation,
        })),
      }));
    }
  };

  useEffect(() => {
    if (!loaded || !lookups) return;
    const timer = setTimeout(() => {
      refreshPreview().catch(() => undefined);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loaded,
    lookups,
    form.modules_count,
    form.screens_count,
    form.apis_count,
    form.complexity,
    form.adjusted_hours,
    form.hours_override,
    form.additional_cost,
    form.proposed_client_price,
    form.resources,
  ]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addResource = () => {
    const role = lookups?.roles?.[0] || DEFAULT_ROLES[2];
    setForm((prev) => ({
      ...prev,
      resources: [
        ...prev.resources,
        {
          key: uid(),
          role_key: 'role_key' in role ? role.role_key : 'developer',
          role_label: 'role_label' in role ? role.role_label : 'Developer',
          employee_id: '',
          designation: '',
          hourly_cost: 'hourly_cost' in role ? String(role.hourly_cost) : '900',
          cost_overridden: false,
          planned_hours: '0',
          allocation_pct: '100',
        },
      ],
    }));
  };

  const updateResource = (key: string, patch: Partial<ResourceRow>) => {
    setForm((prev) => ({
      ...prev,
      resources: prev.resources.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));
  };

  const onRoleChange = (key: string, roleKey: string) => {
    const role = lookups?.roles.find((r) => r.role_key === roleKey);
    updateResource(key, {
      role_key: roleKey,
      role_label: role?.role_label || roleKey,
      hourly_cost: role ? String(role.hourly_cost) : '0',
      cost_overridden: false,
    });
  };

  const onEmployeeChange = (key: string, employeeId: string) => {
    const emp = lookups?.employees.find((e) => e.id === employeeId);
    updateResource(key, {
      employee_id: employeeId,
      designation: emp?.designation || '',
    });
  };

  const removeResource = (key: string) => {
    setForm((prev) => ({ ...prev, resources: prev.resources.filter((r) => r.key !== key) }));
  };

  const save = async (status?: string) => {
    setSaving(true);
    setError('');
    const body = { ...payload(), status: status || form.status };
    const url = estimateId ? `/api/admin/cost-center/estimates/${estimateId}` : '/api/admin/cost-center/estimates';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || 'Could not save estimate');
      return;
    }
    router.push(`/admin/cost-center/estimates/${data.id}`);
    router.refresh();
  };

  const title =
    mode === 'calculator' ? 'Cost Calculator' : estimateId ? 'Edit Estimate' : 'New Estimate';

  return (
    <CcShell>
      <AdminPageHeader
        title={title}
        backHref={mode === 'calculator' ? '/admin/cost-center' : '/admin/cost-center/estimates'}
        action={
          mode === 'calculator' ? (
            <AdminButton onClick={() => save('draft')} disabled={saving}>
              Save as Estimate
            </AdminButton>
          ) : (
            <div className="flex gap-2">
              <AdminButton variant="secondary" onClick={() => save()} disabled={saving}>
                Save
              </AdminButton>
              <AdminButton onClick={() => save(form.status === 'draft' ? 'estimated' : form.status)} disabled={saving}>
                {saving ? 'Saving…' : 'Save & Recalculate'}
              </AdminButton>
            </div>
          )
        }
      />

      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Panel title="Project / Opportunity">
            <div className="grid gap-3 p-4 md:grid-cols-2">
              <Field label="Estimate Name">
                <input className={inputClass} value={form.estimate_name} onChange={(e) => setField('estimate_name', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Client (Client Master)">
                <select
                  className={inputClass}
                  value={form.client_id}
                  onChange={(e) => {
                    setField('client_id', e.target.value);
                    setField('project_id', '');
                  }}
                >
                  <option value="">Select client</option>
                  {(lookups?.clients || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Project (Project Management)">
                <select className={inputClass} value={form.project_id} onChange={(e) => setField('project_id', e.target.value)}>
                  <option value="">Optional / opportunity</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_code ? `${p.project_code} — ` : ''}
                      {p.project_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Project Type">
                <input
                  className={inputClass}
                  list="cc-project-types"
                  value={form.project_type}
                  onChange={(e) => setField('project_type', e.target.value)}
                />
                <datalist id="cc-project-types">
                  {(lookups?.projectTypes || []).map((t) => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Complexity">
                <select className={inputClass} value={form.complexity} onChange={(e) => setField('complexity', e.target.value)}>
                  <option value="simple">Simple</option>
                  <option value="medium">Medium</option>
                  <option value="complex">Complex</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Scope Summary">
                  <textarea
                    className={`${inputClass} min-h-[90px]`}
                    value={form.scope_summary}
                    onChange={(e) => setField('scope_summary', e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="Scope Inputs">
            <div className="grid gap-3 p-4 md:grid-cols-3">
              <Field label="Modules">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.modules_count}
                  onChange={(e) => setField('modules_count', e.target.value)}
                />
              </Field>
              <Field label="Screens">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.screens_count}
                  onChange={(e) => setField('screens_count', e.target.value)}
                />
              </Field>
              <Field label="APIs">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.apis_count}
                  onChange={(e) => setField('apis_count', e.target.value)}
                />
              </Field>
              <Field label="Adjusted Hours (manual override)">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  value={form.adjusted_hours}
                  onChange={(e) => setField('adjusted_hours', e.target.value)}
                />
              </Field>
              <Field label="Use adjusted as final hours">
                <label className="flex items-center gap-2 pt-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.hours_override}
                    onChange={(e) => setField('hours_override', e.target.checked)}
                  />
                  Override system estimate
                </label>
              </Field>
              <Field label="Notes">
                <input className={inputClass} value={form.notes} onChange={(e) => setField('notes', e.target.value)} />
              </Field>
            </div>
          </Panel>

          <Panel
            title="Team Allocation"
            action={
              <button type="button" className="text-sm font-medium text-secondary" onClick={addResource}>
                + Add role / resource
              </button>
            }
          >
            <table className="min-w-full">
              <thead>
                <tr>
                  <Th>Role</Th>
                  <Th>Employee (HR)</Th>
                  <Th>Designation</Th>
                  <Th>Hourly</Th>
                  <Th>Hours</Th>
                  <Th>Alloc %</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {form.resources.length === 0 ? (
                  <tr>
                    <Td className="text-slate-400">No resources assigned yet</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                  </tr>
                ) : (
                  form.resources.map((row) => (
                    <tr key={row.key}>
                      <Td>
                        <select
                          className={inputClass}
                          value={row.role_key}
                          onChange={(e) => onRoleChange(row.key, e.target.value)}
                        >
                          {(lookups?.roles || DEFAULT_ROLES).map((r) => (
                            <option key={r.role_key} value={r.role_key}>
                              {r.role_label}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <select
                          className={inputClass}
                          value={row.employee_id}
                          onChange={(e) => onEmployeeChange(row.key, e.target.value)}
                        >
                          <option value="">Role only</option>
                          {(lookups?.employees || []).map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.full_name}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <input
                          className={inputClass}
                          value={row.designation}
                          onChange={(e) => updateResource(row.key, { designation: e.target.value })}
                        />
                      </Td>
                      <Td>
                        <input
                          type="number"
                          className={inputClass}
                          value={row.hourly_cost}
                          onChange={(e) =>
                            updateResource(row.key, { hourly_cost: e.target.value, cost_overridden: true })
                          }
                        />
                      </Td>
                      <Td>
                        <input
                          type="number"
                          className={inputClass}
                          value={row.planned_hours}
                          onChange={(e) => updateResource(row.key, { planned_hours: e.target.value })}
                        />
                      </Td>
                      <Td>
                        <input
                          type="number"
                          className={inputClass}
                          value={row.allocation_pct}
                          onChange={(e) => updateResource(row.key, { allocation_pct: e.target.value })}
                        />
                      </Td>
                      <Td>
                        <button type="button" className="text-xs text-rose-600" onClick={() => removeResource(row.key)}>
                          Remove
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Cost Summary">
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                <CcBadge value={form.status} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">System hours</span>
                <span className="font-semibold">{preview?.system_estimated_hours?.toFixed?.(2) ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Final approved hours</span>
                <span className="font-semibold">{preview?.final_approved_hours?.toFixed?.(2) ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Resource cost</span>
                <span className="font-semibold">{money(preview?.resource_cost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Ops / hour</span>
                <span className="font-semibold">{money(preview?.operational_cost_per_hour)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Project ops cost</span>
                <span className="font-semibold">{money(preview?.project_operational_cost)}</span>
              </div>
              <Field label="Additional cost">
                <input
                  type="number"
                  className={inputClass}
                  value={form.additional_cost}
                  onChange={(e) => setField('additional_cost', e.target.value)}
                />
              </Field>
              <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
                <p className="text-[11px] uppercase tracking-wider text-slate-300">Total internal cost</p>
                <p className="mt-1 text-2xl font-semibold">{money(preview?.total_internal_cost)}</p>
              </div>
              <Field label="Proposed client price">
                <input
                  type="number"
                  className={inputClass}
                  value={form.proposed_client_price}
                  onChange={(e) => setField('proposed_client_price', e.target.value)}
                />
              </Field>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Expected profit</span>
                <span className="font-semibold text-emerald-700">{money(preview?.expected_profit)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Profit margin</span>
                <span className="font-semibold">{pct(preview?.profit_margin_pct)}</span>
              </div>
              <button type="button" className="btn-secondary w-full" onClick={() => refreshPreview()}>
                Recalculate now
              </button>
              {estimateId ? (
                <Link href={`/admin/cost-center/estimates/${estimateId}`} className="btn-secondary block w-full text-center">
                  View estimate
                </Link>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    </CcShell>
  );
}
