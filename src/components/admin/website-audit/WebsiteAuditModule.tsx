'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type View = 'overview' | 'new' | 'history' | 'reports' | 'settings' | 'detail' | 'webmaster' | 'standards';

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
  const [settings, setSettings] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [filters, setFilters] = useState({ severity: '', category: '', source: '', status: '', finding_type: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [visibleFindings, setVisibleFindings] = useState(12);
  const [compare, setCompare] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [standards, setStandards] = useState<{ sources: any[]; rules: any[] }>({ sources: [], rules: [] });
  const [sourceForm, setSourceForm] = useState({ source_name: '', category: 'techantum', authority_level: 3, version: '1.0', source_url: '', content: '' });
  const [evalResult, setEvalResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      if (view === 'overview') setOverview(await api('overview'));
      if (view === 'history' || view === 'reports' || view === 'detail') setAudits(await api('audits'));
      if (view === 'settings') setSettings(await api('settings'));
      if (view === 'webmaster') setAgent(await api('webmaster/settings'));
      if (view === 'standards') setStandards(await api('webmaster/standards'));
      if (view === 'detail' && auditId) setDetail(await api(`audits/${auditId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, [view, auditId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setVisibleFindings(12); }, [auditId]);

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
      && (!filters.finding_type || row.finding_type === filters.finding_type)
    ));
  }, [detail, filters]);

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
          {view === 'new' ? 'New Audit' : view === 'history' ? 'Audit History' : view === 'reports' ? 'Reports' : view === 'settings' ? 'Settings' : view === 'webmaster' ? 'Web Master Agent' : view === 'standards' ? 'Web Standards' : view === 'detail' ? (detail?.audit?.audit_name || 'Audit') : 'Overview'}
        </h1>
      </div>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {view === 'overview' ? null : null}

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
            setSaving(true);
            try {
              await api('settings', { method: 'POST', body: JSON.stringify(settings) });
            } finally {
              setSaving(false);
            }
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
          <button className={btnClass} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
          <p className="text-sm text-slate-500">Web Master Agent model, confidence, and standards version are under <Link className="text-secondary" href="/admin/website-audit/webmaster">Web Master Agent</Link>.</p>
        </form>
      ) : null}

      {view === 'webmaster' && agent ? (
        <div className="space-y-4">
          <form
            className="max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              try {
                setAgent(await api('webmaster/settings', { method: 'POST', body: JSON.stringify(agent) }));
              } finally {
                setSaving(false);
              }
            }}
          >
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={agent.agent_enabled !== false} onChange={(e) => setAgent({ ...agent, agent_enabled: e.target.checked })} /> Agent enabled (still requires Include AI Review on the audit)</label>
            <Field label="Max AI pages"><input type="number" className={inputClass} value={agent.max_ai_pages || 5} onChange={(e) => setAgent({ ...agent, max_ai_pages: Number(e.target.value) })} /></Field>
            <Field label="Confidence threshold"><input type="number" step="0.05" className={inputClass} value={agent.confidence_threshold || 0.6} onChange={(e) => setAgent({ ...agent, confidence_threshold: Number(e.target.value) })} /></Field>
            <Field label="Content character limit"><input type="number" className={inputClass} value={agent.content_character_limit || 2000} onChange={(e) => setAgent({ ...agent, content_character_limit: Number(e.target.value) })} /></Field>
            <Field label="AI model override"><input className={inputClass} value={agent.ai_model || ''} onChange={(e) => setAgent({ ...agent, ai_model: e.target.value })} placeholder="Uses AI Gateway default" /></Field>
            <Field label="Techantum standard version"><input className={inputClass} value={agent.techantum_standard_version || '1.0'} onChange={(e) => setAgent({ ...agent, techantum_standard_version: e.target.value })} /></Field>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={agent.review_uiux !== false} onChange={(e) => setAgent({ ...agent, review_uiux: e.target.checked })} /> UI/UX review</label>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={agent.review_content !== false} onChange={(e) => setAgent({ ...agent, review_content: e.target.checked })} /> Content review</label>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={agent.review_images !== false} onChange={(e) => setAgent({ ...agent, review_images: e.target.checked })} /> Image review</label>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={agent.review_seo_interpretation !== false} onChange={(e) => setAgent({ ...agent, review_seo_interpretation: e.target.checked })} /> SEO interpretation (does not replace scanner rules)</label>
            <button className={btnClass} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save agent settings'}</button>
          </form>
          <button
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            type="button"
            onClick={async () => {
              setSaving(true);
              try {
                setEvalResult(await api('webmaster/evaluate', { method: 'POST', body: '{}' }));
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            Run golden evaluation (mocked AI)
          </button>
          {evalResult ? <pre className="overflow-auto rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(evalResult, null, 2)}</pre> : null}
        </div>
      ) : null}

      {view === 'standards' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            className="space-y-3 rounded-xl border border-slate-200 bg-white p-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setSaving(true);
              try {
                await api('webmaster/standards', { method: 'POST', body: JSON.stringify(sourceForm) });
                setStandards(await api('webmaster/standards'));
              } finally {
                setSaving(false);
              }
            }}
          >
            <h2 className="font-medium">Add standard</h2>
            <Field label="Name"><input className={inputClass} value={sourceForm.source_name} onChange={(e) => setSourceForm({ ...sourceForm, source_name: e.target.value })} required /></Field>
            <Field label="Category"><input className={inputClass} value={sourceForm.category} onChange={(e) => setSourceForm({ ...sourceForm, category: e.target.value })} /></Field>
            <Field label="Authority (1 official – 4 AI)"><input type="number" min={1} max={4} className={inputClass} value={sourceForm.authority_level} onChange={(e) => setSourceForm({ ...sourceForm, authority_level: Number(e.target.value) })} /></Field>
            <Field label="Version"><input className={inputClass} value={sourceForm.version} onChange={(e) => setSourceForm({ ...sourceForm, version: e.target.value })} /></Field>
            <Field label="Source URL"><input className={inputClass} value={sourceForm.source_url} onChange={(e) => setSourceForm({ ...sourceForm, source_url: e.target.value })} /></Field>
            <Field label="Content"><textarea className={inputClass} rows={6} value={sourceForm.content} onChange={(e) => setSourceForm({ ...sourceForm, content: e.target.value })} /></Field>
            <button className={btnClass} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save source'}</button>
          </form>
          <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <h2 className="mb-2 font-medium">Sources</h2>
            <ul className="space-y-2">{standards.sources.map((row) => <li key={row.id}><span className="font-medium">{row.source_name}</span> · L{row.authority_level} · {row.category} · {row.version}</li>)}</ul>
            <h2 className="mb-2 mt-4 font-medium">Rules</h2>
            <ul className="space-y-2">{standards.rules.map((row) => <li key={row.id}><span className="font-medium">{row.rule_code}</span> {row.rule_name} ({row.evaluation_type})</li>)}</ul>
          </section>
        </div>
      ) : null}

      {view === 'detail' && detail ? (
        <div className="audit-fade space-y-5">
          <div className="flex flex-wrap gap-2">
            <button className={btnClass} type="button" onClick={() => void rerun()}>Re-run</button>
            <a className="rounded-lg border border-slate-200 px-4 py-2 text-sm" href={`/api/admin/website-audit/audits/${auditId}/report?format=html`} target="_blank" rel="noreferrer">Printable report</a>
            <a className="rounded-lg border border-slate-200 px-4 py-2 text-sm" href={`/api/admin/website-audit/audits/${auditId}/report?format=csv`}>Export CSV</a>
            {audits.filter((row) => row.id !== auditId).slice(0, 5).map((row) => (
              <button key={row.id} type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" onClick={() => void runCompare(row.id)}>Compare with {String(row.audit_name).slice(0, 24)}</button>
            ))}
          </div>
          <div key={`${detail.audit.pages_scanned}-${detail.audit.overall_score}-${detail.audit.status}`} className="audit-stat-pulse grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Website" value={detail.audit.website_url} />
            <Stat label="Project" value={detail.audit.project_name || '—'} />
            <Stat label="Pages scanned" value={`${detail.audit.pages_scanned || 0} / ${detail.audit.max_pages}`} />
            <Stat label="Overall score" value={detail.audit.overall_score ?? (detail.audit.status === 'running' ? 'Scanning…' : '—')} />
          </div>
          <p className="text-sm text-slate-500">Status: {detail.audit.status} · AI review: {detail.audit.ai_review_status || 'skipped'} · Environment: {detail.audit.environment} · {detail.audit.progress?.stage || ''}</p>
          {detail.audit.webmaster_summary?.overall_quality_assessment ? (
            <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
              <p className="font-medium">Web Master summary</p>
              <p className="mt-1 text-slate-600">{detail.audit.webmaster_summary.overall_quality_assessment}</p>
            </section>
          ) : null}
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
            {['severity', 'category', 'source', 'status', 'finding_type'].map((key) => (
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
                  <th className="p-2">Type</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Review</th>
                </tr>
              </thead>
              <tbody>
                {findings.slice(0, visibleFindings).map((row: any) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="p-2"><input type="checkbox" checked={selected.includes(row.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} /></td>
                    <td className="p-2 capitalize">{row.severity}</td>
                    <td className="p-2">{row.category}</td>
                    <td className="p-2">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-slate-500">{row.description}</p>
                      <p className="text-xs text-slate-400">{row.recommendation}</p>
                      {row.standard_reference?.name ? <p className="text-xs text-slate-400">{row.standard_reference.name} {row.standard_reference.rule || ''}</p> : null}
                    </td>
                    <td className="p-2">{row.finding_type}</td>
                    <td className="p-2">{row.source}</td>
                    <td className="p-2">{row.status}</td>
                    <td className="p-2">
                      <div className="flex flex-col gap-1">
                        {['confirmed', 'false_positive', 'ignored', 'fixed'].map((decision) => (
                          <button
                            key={decision}
                            type="button"
                            className="text-left text-xs text-secondary"
                            onClick={() => void api(`findings/${row.id}/review`, { method: 'POST', body: JSON.stringify({ decision }) }).then(() => load())}
                          >
                            {decision.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {findings.length > visibleFindings ? (
              <button type="button" className="w-full border-t border-slate-100 py-3 text-sm text-secondary" onClick={() => setVisibleFindings((count) => count + 12)}>
                Load more findings ({findings.length - visibleFindings} remaining)
              </button>
            ) : null}
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
