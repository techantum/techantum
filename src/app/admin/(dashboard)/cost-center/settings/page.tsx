'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import { CcShell, Field, Panel, inputClass } from '@/components/admin/cost-center/ui';

type Settings = Record<string, string | number>;

export default function CostCenterSettingsPage() {
  const [form, setForm] = useState<Settings | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/cost-center/settings')
      .then((r) => r.json())
      .then((body) => {
        if (body.error) setError(body.error);
        else setForm(body);
      });
  }, []);

  const set = (key: string, value: string) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    setOk('');
    const res = await fetch('/api/admin/cost-center/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(body.error || 'Could not save settings');
      return;
    }
    setForm(body);
    setOk('Estimation rules saved');
  };

  if (!form) return <p className="text-sm text-slate-500">Loading settings…</p>;

  return (
    <CcShell>
      <AdminPageHeader
        title="Cost Center Settings"
        action={
          <AdminButton variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </AdminButton>
        }
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {ok ? <AdminAlert variant="success">{ok}</AdminAlert> : null}

      <Panel title="Hours estimation rules">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Screen development hours" hint="Hours per screen">
            <input className={inputClass} type="number" value={String(form.screen_hours)} onChange={(e) => set('screen_hours', e.target.value)} />
          </Field>
          <Field label="API development hours" hint="Hours per API">
            <input className={inputClass} type="number" value={String(form.api_hours)} onChange={(e) => set('api_hours', e.target.value)} />
          </Field>
          <Field label="Module base hours">
            <input className={inputClass} type="number" value={String(form.module_base_hours)} onChange={(e) => set('module_base_hours', e.target.value)} />
          </Field>
          <Field label="QA %">
            <input className={inputClass} type="number" value={String(form.qa_percentage)} onChange={(e) => set('qa_percentage', e.target.value)} />
          </Field>
          <Field label="Project management %">
            <input className={inputClass} type="number" value={String(form.pm_percentage)} onChange={(e) => set('pm_percentage', e.target.value)} />
          </Field>
          <Field label="Buffer %">
            <input className={inputClass} type="number" value={String(form.buffer_percentage)} onChange={(e) => set('buffer_percentage', e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Complexity factors">
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <Field label="Simple">
            <input className={inputClass} type="number" step="0.01" value={String(form.complexity_simple_factor)} onChange={(e) => set('complexity_simple_factor', e.target.value)} />
          </Field>
          <Field label="Medium">
            <input className={inputClass} type="number" step="0.01" value={String(form.complexity_medium_factor)} onChange={(e) => set('complexity_medium_factor', e.target.value)} />
          </Field>
          <Field label="Complex">
            <input className={inputClass} type="number" step="0.01" value={String(form.complexity_complex_factor)} onChange={(e) => set('complexity_complex_factor', e.target.value)} />
          </Field>
          <Field label="Enterprise">
            <input className={inputClass} type="number" step="0.01" value={String(form.complexity_enterprise_factor)} onChange={(e) => set('complexity_enterprise_factor', e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Operational overhead assumptions">
        <div className="grid gap-3 p-4 md:grid-cols-2">
          <Field label="Working days / month">
            <input className={inputClass} type="number" value={String(form.working_days_per_month)} onChange={(e) => set('working_days_per_month', e.target.value)} />
          </Field>
          <Field label="Productive hours / day">
            <input className={inputClass} type="number" step="0.1" value={String(form.productive_hours_per_day)} onChange={(e) => set('productive_hours_per_day', e.target.value)} />
          </Field>
          <Field label="Overhead formula (reference)" hint="Used as Monthly Ops ÷ (Working days × Productive hours)">
            <input className={inputClass} value={String(form.overhead_formula)} onChange={(e) => set('overhead_formula', e.target.value)} />
          </Field>
          <Field label="Currency">
            <input className={inputClass} value={String(form.currency)} onChange={(e) => set('currency', e.target.value)} />
          </Field>
        </div>
      </Panel>
    </CcShell>
  );
}
