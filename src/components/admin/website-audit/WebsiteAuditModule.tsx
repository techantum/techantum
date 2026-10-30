'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type View = 'overview' | 'new' | 'history' | 'reports' | 'settings' | 'detail';

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/website-audit/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const inputClass = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm';
const btnClass = 'rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white';

export default function WebsiteAuditModule({ view, auditId }: { view: View; auditId?: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<Record<string, any> | null>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [filters, setFilters] = useState({ severity: '', category: '', source: '', status: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [compare, setCompare] = useState<any>(null);
  const [form, setForm] = useState({
    audit_name: '',
    website_url: '',
    project_id: '',
    environment: 'production',
    audit_scope: 'website',
    max_pages: 10,
    desktop_enabled: true,
    mobile_enabled: true,
    forms_enabled: false,
    ai_enabled: false,
    notes: '',
  });

  const load = useCallback(async () => {
    setError('');
    try {
      if (view === 'overview') setOverview(await api('overview'));
      if (view === 'history' || view === 'reports' || view === 'detail') setAudits(await api('audits'));
      if (view === 'new') {
        setProjects(await api('projects'));
        const current = await api('settings');
        setSettings(current);
        setForm((prev) => ({ ...prev, max_pages: current.default_max_pages || 10 }));
      }
      if (view === 'settings') setSettings(await api('settings'));
      if (view === 'detail' && auditId) setDetail(await api(`audits/${auditId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, [view, auditId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (view !== 'detail' || !detail?.audit) return;
    if (!['queued', 'running'].includes(detail.audit.status)) return;
    const timer = setInterval(() => { void load(); }, 4000);
    return () => clearInterval(timer);
  }, [view, detail, load]);

  const findings = useMemo(() => {
    const rows = detail?.findings || [];
    return rows.filter((row: any) => (
      (!filters.severity || row.severity === filters.severity)
      && (!filters.category || row.category === filters.category)
      && (!filters.source || row.source === filters.source)
      && (!filters.status || row.status === filters.status)
    ));
  }, [detail, filters]);

  async function createAudit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const created = await api('audits', { method: 'POST', body: JSON.stringify(form) });
      router.push(`/admin/website-audit/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start audit');
    }
  }

  async function rerun() {
    if (!auditId) return;
    const created = await api(`audits/${auditId}/rerun`, { method: 'POST', body: '{}' });
    router.push(`/admin/website-audit/${created.id}`);
  }

  async function runCompare(otherId: string) {
    if (!auditId) return;
    setCompare(await api(`audits/${auditId}/compare`, { method: 'POST', body: JSON.stringify({ other_audit_id: otherId }) }));
  }

  async function createTickets() {
    if (!auditId || !selected.length) return;
    await api(`audits/${auditId}/tickets`, { method: 'POST', body: JSON.stringify({ finding_ids: selected }) });
    setSelected([]);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">Website Audit</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          {view === 'new' ? 'New Audit' : view === 'history' ? 'Audit History' : view === 'reports' ? 'Reports' : view === 'settings' ? 'Settings' : view === 'detail' ? (detail?.audit?.audit_name || 'Audit') : 'Overview'}
        </h1>
      </div>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {view === 'overview' && overview ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Audits this month" value={overview.audits_this_month} />
            <Stat label="Websites audited" value={overview.websites_audited} />
            <Stat label="Average score" value={overview.average_score ?? '—'} />
            <Stat label="Critical open" value={overview.critical_open} />
            <Stat label="High open" value={overview.high_open} />
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Recent audits</h2>
              <Link className="text-sm text-secondary" href="/admin/website-audit/new">New audit</Link>
            </div>
            <AuditTable rows={overview.recent || []} />
          </section>
        </div>
      ) : null}

      {view === 'new' ? (
        <form onSubmit={createAudit} className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <Field label="Audit name"><input className={inputClass} value={form.audit_name} onChange={(e) => setForm({ ...form, audit_name: e.target.value })} required /></Field>
          <Field label="Website URL"><input className={inputClass} placeholder="https://example.com" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} required /></Field>
          <Field label="Project">
            <select className={inputClass} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">None</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.project_name}</option>)}
            </select>
          </Field>
          <Field label="Environment">
            <select className={inputClass} value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
              <option value="custom">Custom</option>
            </select>
          </Field>
          <Field label="Audit scope">
            <select className={inputClass} value={form.audit_scope} onChange={(e) => setForm({ ...form, audit_scope: e.target.value })}>
              <option value="single">Single page</option>
              <option value="website">Whole website</option>
              <option value="selected">Selected pages</option>
            </select>
          </Field>
          <Field label="Maximum pages">
            <input type="number" min={1} max={settings?.max_pages || 25} className={inputClass} value={form.max_pages} onChange={(e) => setForm({ ...form, max_pages: Number(e.target.value) })} />
          </Field>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.desktop_enabled} onChange={(e) => setForm({ ...form, desktop_enabled: e.target.checked })} /> Desktop check</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.mobile_enabled} onChange={(e) => setForm({ ...form, mobile_enabled: e.target.checked })} /> Mobile check</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.forms_enabled} onChange={(e) => setForm({ ...form, forms_enabled: e.target.checked })} /> Include forms (safe validation)</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.ai_enabled} onChange={(e) => setForm({ ...form, ai_enabled: e.target.checked })} /> Include AI review</label>
          <Field label="Notes"><textarea className={inputClass} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <button className={btnClass} type="submit">Start scan</button>
        </form>
      ) : null}

      {view === 'history' ? <AuditTable rows={audits} actions /> : null}

      {view === 'reports' ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm text-slate-600">Open an audit to print the management or developer report, or export findings as CSV.</p>
          <AuditTable rows={audits} />
        </section>
      ) : null}

      {view === 'settings' && settings ? (
        <form
          className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            await api('settings', { method: 'POST', body: JSON.stringify(settings) });
          }}
        >
          {[['default_max_pages', 'Default maximum pages'], ['max_pages', 'Maximum allowed pages'], ['ai_max_pages', 'AI visual pages']].map(([key, label]) => (
            <Field key={key} label={label}>
              <input type="number" className={inputClass} value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })} />
            </Field>
          ))}
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.ai_review_enabled} onChange={(e) => setSettings({ ...settings, ai_review_enabled: e.target.checked })} /> AI review enabled</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.lighthouse_enabled} onChange={(e) => setSettings({ ...settings, lighthouse_enabled: e.target.checked })} /> Lighthouse / performance</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.accessibility_enabled} onChange={(e) => setSettings({ ...settings, accessibility_enabled: e.target.checked })} /> Accessibility</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={settings.forms_enabled} onChange={(e) => setSettings({ ...settings, forms_enabled: e.target.checked })} /> Forms</label>
          <button className={btnClass} type="submit">Save settings</button>
        </form>
      ) : null}

      {view === 'detail' && detail ? (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <button className={btnClass} type="button" onClick={() => void rerun()}>Re-run</button>
            <a className="rounded-lg border border-slate-200 px-4 py-2 text-sm" href={`/api/admin/website-audit/audits/${auditId}/report?format=html`} target="_blank" rel="noreferrer">Printable report</a>
            <a className="rounded-lg border border-slate-200 px-4 py-2 text-sm" href={`/api/admin/website-audit/audits/${auditId}/report?format=csv`}>Export CSV</a>
            {audits.filter((row) => row.id !== auditId).slice(0, 5).map((row) => (
              <button key={row.id} type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => void runCompare(row.id)}>Compare with {String(row.audit_name).slice(0, 24)}</button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Website" value={detail.audit.website_url} />
            <Stat label="Project" value={detail.audit.project_name || '—'} />
            <Stat label="Pages scanned" value={`${detail.audit.pages_scanned || 0} / ${detail.audit.max_pages}`} />
            <Stat label="Overall score" value={detail.audit.overall_score ?? (detail.audit.status === 'running' ? 'Scanning…' : '—')} />
          </div>
          <p className="text-sm text-slate-500">Status: {detail.audit.status} · Environment: {detail.audit.environment} · {detail.audit.progress?.stage || ''}</p>
          {detail.audit.category_scores ? (
            <div className="grid gap-3 sm:grid-cols-4">
              {Object.entries(detail.audit.category_scores).map(([key, value]) => <Stat key={key} label={key} value={String(value)} />)}
            </div>
          ) : null}
          {compare ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              Previous {compare.previous_score} → Current {compare.current_score} ({compare.difference > 0 ? '+' : ''}{compare.difference}). Fixed {compare.fixed_count}, remaining {compare.remaining_count}, new {compare.new_count}.
            </section>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {['severity', 'category', 'source', 'status'].map((key) => (
              <input key={key} className="rounded-lg border border-slate-200 px-3 py-1 text-sm" placeholder={key} value={(filters as any)[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} />
            ))}
            <button className={btnClass} type="button" disabled={!selected.length} onClick={() => void createTickets()}>Create tickets from selected</button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-2"></th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Title</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((row: any) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="p-2"><input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} /></td>
                    <td className="p-2 capitalize">{row.severity}</td>
                    <td className="p-2">{row.category}</td>
                    <td className="p-2">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-slate-500">{row.description}</p>
                      <p className="text-xs text-slate-400">{row.recommendation}</p>
                    </td>
                    <td className="p-2">{row.source}</td>
                    <td className="p-2">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-all text-lg font-semibold text-slate-900">{String(value)}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1 text-sm font-medium text-slate-700">{label}{children}</label>;
}

function AuditTable({ rows, actions }: { rows: any[]; actions?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-left text-slate-500">
          <tr>
            <th className="p-3">Audit</th>
            <th className="p-3">Website</th>
            <th className="p-3">Project</th>
            <th className="p-3">Env</th>
            <th className="p-3">Pages</th>
            <th className="p-3">Score</th>
            <th className="p-3">Crit</th>
            <th className="p-3">High</th>
            <th className="p-3">Status</th>
            {actions ? <th className="p-3">Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <td className="p-3"><Link className="text-secondary" href={`/admin/website-audit/${row.id}`}>{row.audit_name}</Link></td>
              <td className="p-3">{row.website_url}</td>
              <td className="p-3">{row.project_name || '—'}</td>
              <td className="p-3">{row.environment}</td>
              <td className="p-3">{row.pages_scanned ?? row.pages_count ?? 0}</td>
              <td className="p-3">{row.overall_score ?? '—'}</td>
              <td className="p-3">{row.critical_count ?? 0}</td>
              <td className="p-3">{row.high_count ?? 0}</td>
              <td className="p-3">{row.status}</td>
              {actions ? (
                <td className="p-3">
                  <Link className="text-secondary" href={`/admin/website-audit/${row.id}`}>View</Link>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
