'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';
import { adsCharacterCount, adsLimitFor } from '@/lib/marketing-seo/ads-limits';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'audit', label: 'SEO Audit' },
  { id: 'pages', label: 'Pages & Metadata' },
  { id: 'keywords', label: 'Keyword Library' },
  { id: 'ads', label: 'Google Ads Library' },
  { id: 'campaigns', label: 'Campaign Drafts' },
  { id: 'integrations', label: 'Google Integrations' },
] as const;

type TabId = (typeof TABS)[number]['id'];
const inputClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800';
const areaClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800';

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/marketing-seo/${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}

const AUDIT_STATUS: Record<string, { label: string; className: string }> = {
  passed: { label: 'Passed', className: 'bg-emerald-50 text-emerald-700' },
  warning: { label: 'Warning', className: 'bg-amber-50 text-amber-700' },
  failed: { label: 'Failed', className: 'bg-rose-50 text-rose-700' },
  not_tested: { label: 'Not Tested', className: 'bg-slate-100 text-slate-500' },
};

const TASK_LABEL: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  completed_manual: 'Completed',
};

function titleCase(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ') : value;
}

function HealthRing({ score }: { score: number | null }) {
  const value = score == null ? 0 : Math.max(0, Math.min(100, score));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f97316' : '#ef4444';
  const label = score == null ? 'Not run' : value >= 80 ? 'Strong' : value >= 60 ? 'Good' : 'Needs work';
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 72 72" className="h-16 w-16">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="36" cy="36" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference - (value / 100) * circumference} transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">{score ?? '—'}</text>
      </svg>
      <div>
        <p className="text-sm font-semibold text-slate-900">Health Score</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function AuditPanel({
  audit,
  busy,
  query,
  status,
  priority,
  onQuery,
  onStatus,
  onPriority,
  onRun,
  onTask,
}: {
  audit: any;
  busy: boolean;
  query: string;
  status: string;
  priority: string;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onPriority: (value: string) => void;
  onRun: () => void;
  onTask: (id: string, fixStatus: string) => void;
}) {
  const issues = audit?.issues || [];
  const counts = {
    total: issues.length,
    passed: issues.filter((row: any) => row.status === 'passed').length,
    warnings: issues.filter((row: any) => row.status === 'warning' || row.status === 'failed').length,
    notTested: issues.filter((row: any) => row.status === 'not_tested').length,
  };
  const needle = query.trim().toLowerCase();
  const visible = issues.filter((row: any) => {
    const hay = `${row.check_name} ${row.affected_url}`.toLowerCase();
    if (needle && !hay.includes(needle)) return false;
    if (status !== 'all' && row.status !== status) return false;
    if (priority !== 'all' && row.priority !== priority) return false;
    return true;
  });
  const actions = Object.values(issues.reduce((groups: Record<string, { name: string; count: number; detail: string; tone: string }>, row: any) => {
    if (row.status === 'passed') return groups;
    const current = groups[row.check_name] || { name: row.check_name, count: 0, detail: row.recommended_action || row.issue_description, tone: row.status };
    current.count += 1;
    groups[row.check_name] = current;
    return groups;
  }, {})).slice(0, 4) as Array<{ name: string; count: number; detail: string; tone: string }>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        {[
          { icon: 'DocumentTextIcon', tint: 'bg-slate-100 text-slate-600', label: 'Total Checks', value: counts.total },
          { icon: 'CheckCircleIcon', tint: 'bg-emerald-50 text-emerald-600', label: 'Passed', value: counts.passed },
          { icon: 'ExclamationTriangleIcon', tint: 'bg-amber-50 text-amber-600', label: 'Warnings', value: counts.warnings },
          { icon: 'EllipsisHorizontalCircleIcon', tint: 'bg-slate-100 text-slate-500', label: 'Not Tested', value: counts.notTested },
        ].map((item) => (
          <article key={item.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tint}`}><Icon name={item.icon} size={18} /></span>
            <div>
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="font-bricolage text-2xl font-semibold leading-none text-slate-900">{item.value}</p>
            </div>
          </article>
        ))}
        <article className="flex items-center rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
          <HealthRing score={audit?.run?.health_score ?? null} />
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-bricolage text-lg font-semibold">Technical SEO Audit</h2>
              <p className="text-sm text-slate-500">Automatic checks are separate from manual task status. Completing a task does not mark the issue verified.</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400">Last audit: {audit?.run?.finished_at ? new Date(audit.run.finished_at).toLocaleString() : 'Never'}</p>
              <AdminButton variant="primary" loading={busy} onClick={onRun}>Run Audit</AdminButton>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input className={`${inputClass} max-w-sm`} placeholder="Search checks or URLs..." value={query} onChange={(event) => onQuery(event.target.value)} />
            <select className={`${inputClass} w-auto`} value={status} onChange={(event) => onStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="passed">Passed</option>
              <option value="warning">Warning</option>
              <option value="failed">Failed</option>
              <option value="not_tested">Not tested</option>
            </select>
            <select className={`${inputClass} w-auto`} value={priority} onChange={(event) => onPriority(event.target.value)}>
              <option value="all">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                <tr>{['Check', 'URL', 'Status', 'Priority', 'Task', 'Action'].map((heading) => <th key={heading} className="py-2 pr-3 font-medium">{heading}</th>)}</tr>
              </thead>
              <tbody>
                {visible.map((row: any) => {
                  const badge = AUDIT_STATUS[row.status] || AUDIT_STATUS.not_tested;
                  return (
                    <tr key={row.id} className="border-t border-slate-100 align-middle">
                      <td className="py-3 pr-3 font-medium text-slate-800">{row.check_name}</td>
                      <td className="max-w-[16rem] truncate py-3 pr-3 text-xs text-slate-500">{row.affected_url}</td>
                      <td className="py-3 pr-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span></td>
                      <td className="py-3 pr-3 text-slate-600">{titleCase(row.priority)}</td>
                      <td className="py-3 pr-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{TASK_LABEL[row.fix_status] || 'Open'}</span></td>
                      <td className="py-3 pr-3">
                        <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={row.fix_status || 'open'} onChange={(event) => onTask(row.id, event.target.value)}>
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed_manual">Completed</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                {!visible.length ? <tr><td colSpan={6} className="py-8 text-slate-500">No checks match these filters.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="font-bricolage text-lg font-semibold">Recommended Actions</h2>
          <p className="mt-1 text-sm text-slate-500">Focus on these items to improve your SEO health score.</p>
          <ul className="mt-4 space-y-3">
            {actions.length ? actions.map((item) => (
              <li key={item.name}>
                <button type="button" onClick={() => onQuery(item.name)} className={`block w-full rounded-xl px-3 py-3 text-left ${item.tone === 'failed' ? 'bg-rose-50' : 'bg-amber-50'}`}>
                  <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-600">{item.count} {item.count === 1 ? 'page' : 'pages'}. {item.detail}</p>
                </button>
              </li>
            )) : <li className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-800">No open recommendations. The latest checks passed.</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function pageLabel(page: { name?: string; path: string }) {
  if (page.name && page.name !== page.path) return page.name;
  if (page.path === '/') return 'Home';
  const segment = page.path.split('/').filter(Boolean).pop() || page.path;
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function pageIcon(path: string) {
  if (path === '/') return 'HomeIcon';
  if (path.startsWith('/blog')) return 'NewspaperIcon';
  if (path.startsWith('/contact')) return 'PhoneIcon';
  if (path.startsWith('/login')) return 'UserIcon';
  if (path.includes('privacy') || path.includes('terms')) return 'ShieldCheckIcon';
  if (path.startsWith('/portfolio')) return 'BriefcaseIcon';
  if (path.startsWith('/services')) return 'WrenchScrewdriverIcon';
  return 'DocumentTextIcon';
}

function pageMetaStatus(page: { title?: string; description?: string }) {
  const title = String(page.title || '').trim();
  const description = String(page.description || '').trim();
  if (!title && !description) return 'none';
  const titleOk = title.length >= 30 && title.length <= 60;
  const descriptionOk = description.length >= 70 && description.length <= 160;
  return titleOk && descriptionOk ? 'optimized' : 'needs';
}

const PAGE_STATUS: Record<string, { label: string; className: string }> = {
  optimized: { label: 'Optimized', className: 'bg-emerald-50 text-emerald-700' },
  needs: { label: 'Needs Update', className: 'bg-amber-50 text-amber-700' },
  none: { label: 'No Data', className: 'bg-slate-100 text-slate-500' },
};

function LengthMeter({ length, max }: { length: number; max: number }) {
  const width = Math.min(100, Math.round((length / max) * 100));
  const tone = length === 0 ? 'bg-slate-200' : length <= max ? 'bg-emerald-500' : 'bg-rose-500';
  return (
    <div>
      <p className={`text-right text-xs ${length > max ? 'text-rose-600' : 'text-slate-400'}`}>{length}/{max}</p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-1 rounded-full ${tone}`} style={{ width: `${width}%` }} /></div>
    </div>
  );
}

function monthChange(rows: Array<{ created_at?: string }>, match: (row: { created_at?: string }) => boolean) {
  const now = Date.now();
  const month = 30 * 24 * 60 * 60 * 1000;
  const matched = rows.filter(match);
  const recent = matched.filter((row) => row.created_at && now - new Date(row.created_at).getTime() < month).length;
  const prior = matched.filter((row) => {
    if (!row.created_at) return false;
    const age = now - new Date(row.created_at).getTime();
    return age >= month && age < month * 2;
  }).length;
  if (!prior) return null;
  return Math.round(((recent - prior) / prior) * 100);
}

function KeywordStat({ icon, tint, label, value, change }: { icon: string; tint: string; label: string; value: number; change: number | null }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}><Icon name={icon} size={18} /></span>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="mt-3 font-bricolage text-2xl font-semibold text-slate-900">{value}</p>
      {change == null ? <p className="text-xs text-slate-400">Saved in the library</p> : (
        <p className={`text-xs font-medium ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}% vs. prior 30 days</p>
      )}
    </article>
  );
}

function PagesPanel({
  pages,
  selected,
  query,
  status,
  adding,
  newPath,
  busy,
  onQuery,
  onStatus,
  onSelect,
  onNewPath,
  onCancelAdd,
  onCreate,
  onChange,
  onSave,
}: {
  pages: any[];
  selected: any;
  query: string;
  status: string;
  adding: boolean;
  newPath: string;
  busy: boolean;
  onQuery: (value: string) => void;
  onStatus: (value: string) => void;
  onSelect: (page: any) => void;
  onNewPath: (value: string) => void;
  onCancelAdd: () => void;
  onCreate: () => void;
  onChange: (page: any) => void;
  onSave: (publishState: 'draft' | 'published') => void;
}) {
  const [preview, setPreview] = useState<'google' | 'desktop' | 'mobile'>('google');
  const [editingImage, setEditingImage] = useState(false);
  const needle = query.trim().toLowerCase();
  const visible = pages.filter((page) => {
    const meta = pageMetaStatus(page);
    if (status !== 'all' && meta !== status) return false;
    const hay = `${pageLabel(page)} ${page.path}`.toLowerCase();
    return !needle || hay.includes(needle);
  });
  const title = String(selected?.title || '');
  const description = String(selected?.description || '');
  const secondary = Array.isArray(selected?.secondary_keywords) ? selected.secondary_keywords.join(', ') : String(selected?.secondary_keywords || '');
  const liveUrl = selected ? `https://techantum.com${selected.path === '/' ? '/' : selected.path}` : 'https://techantum.com/';
  const previewTitle = title || (selected ? pageLabel(selected) : 'Page title');
  const previewDescription = description || 'Meta description appears here after you save it.';

  return (
    <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="font-bricolage text-lg font-semibold">Website Pages</h2>
        <p className="text-sm text-slate-500">Manage and optimize metadata for your website pages.</p>
        <div className="mt-3 flex gap-2">
          <input className={inputClass} placeholder="Search pages..." value={query} onChange={(event) => onQuery(event.target.value)} />
          <select className={`${inputClass} w-36`} value={status} onChange={(event) => onStatus(event.target.value)}>
            <option value="all">All pages</option>
            <option value="optimized">Optimized</option>
            <option value="needs">Needs update</option>
            <option value="none">No data</option>
          </select>
        </div>
        {adding ? (
          <div className="mt-3 flex gap-2">
            <input className={inputClass} placeholder="/services/example" value={newPath} onChange={(event) => onNewPath(event.target.value)} />
            <button type="button" className="rounded-xl bg-violet-600 px-3 text-sm font-semibold text-white" onClick={onCreate}>Add</button>
            <button type="button" className="text-sm text-slate-500" onClick={onCancelAdd}>Cancel</button>
          </div>
        ) : null}
        <ul className="mt-3 max-h-[42rem] space-y-1 overflow-y-auto">
          {visible.map((page) => {
            const meta = PAGE_STATUS[pageMetaStatus(page)];
            const active = selected?.path === page.path;
            return (
              <li key={page.path}>
                <button type="button" onClick={() => onSelect(page)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}><Icon name={pageIcon(page.path)} size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{pageLabel(page)}</span>
                    <span className="block truncate text-xs text-slate-400">{page.path}</span>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
                </button>
              </li>
            );
          })}
          {!visible.length ? <li className="px-3 py-6 text-sm text-slate-500">No pages match these filters.</li> : null}
        </ul>
      </section>
      {selected ? (
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon name={pageIcon(selected.path)} size={18} /></span>
                <div>
                  <p className="font-semibold text-slate-900">{pageLabel(selected)}</p>
                  <p className="text-xs text-slate-400">{liveUrl}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected.publish_state === 'draft' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{selected.publish_state === 'draft' ? 'Draft' : 'Live'}</span>
                <a className="btn-secondary inline-flex items-center gap-1 text-sm" href={liveUrl} target="_blank" rel="noreferrer"><Icon name="EyeIcon" size={14} /> View Page</a>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">SEO Metadata</h3>
                <p className="text-sm text-slate-500">Update the title, description and keywords for this page.</p>
              </div>
            </div>
            <label className="mt-4 block text-sm font-medium text-slate-700">SEO Title
              <input className={`${inputClass} mt-1`} value={title} onChange={(event) => onChange({ ...selected, title: event.target.value })} />
              <LengthMeter length={title.length} max={60} />
            </label>
            <label className="mt-4 block text-sm font-medium text-slate-700">Meta Description
              <textarea className={`${areaClass} mt-1`} rows={3} value={description} onChange={(event) => onChange({ ...selected, description: event.target.value })} />
              <LengthMeter length={description.length} max={160} />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">Primary Keyword
                <input className={`${inputClass} mt-1`} value={selected.primary_keyword || ''} onChange={(event) => onChange({ ...selected, primary_keyword: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-slate-700">Additional Keywords
                <input className={`${inputClass} mt-1`} placeholder="Comma-separated" value={secondary} onChange={(event) => onChange({ ...selected, secondary_keywords: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-slate-700">Canonical URL
                <input className={`${inputClass} mt-1`} value={selected.canonical_url || ''} onChange={(event) => onChange({ ...selected, canonical_url: event.target.value })} />
              </label>
              <div className="text-sm font-medium text-slate-700">OG Image
                <div className="mt-1 flex items-center gap-3 rounded-xl border border-slate-200 p-2">
                  {selected.og_image_url ? <img src={selected.og_image_url} alt="" className="h-12 w-20 rounded-lg object-cover" /> : <span className="flex h-12 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Icon name="PhotoIcon" size={18} /></span>}
                  <button type="button" className="text-sm font-medium text-violet-700" onClick={() => setEditingImage((current) => !current)}>Change Image</button>
                  <button type="button" className="text-sm font-medium text-rose-600" onClick={() => onChange({ ...selected, og_image_url: '' })}>Remove</button>
                </div>
                {editingImage || !selected.og_image_url ? <input className={`${inputClass} mt-2`} placeholder="https:// image URL" value={selected.og_image_url || ''} onChange={(event) => onChange({ ...selected, og_image_url: event.target.value })} /> : null}
              </div>
              <label className="text-sm font-medium text-slate-700">OG Title
                <input className={`${inputClass} mt-1`} value={selected.og_title || ''} onChange={(event) => onChange({ ...selected, og_title: event.target.value })} />
              </label>
              <label className="text-sm font-medium text-slate-700">OG Description
                <input className={`${inputClass} mt-1`} value={selected.og_description || ''} onChange={(event) => onChange({ ...selected, og_description: event.target.value })} />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <AdminButton loading={busy} onClick={() => onSave('draft')}>Save Draft</AdminButton>
              <button type="button" disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => onSave('published')}><Icon name="CheckIcon" size={16} /> Publish Changes</button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Search Preview</h3>
                <p className="text-sm text-slate-500">How your page will appear on Google search results.</p>
              </div>
              <div className="flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
                {(['google', 'desktop', 'mobile'] as const).map((mode) => (
                  <button key={mode} type="button" onClick={() => setPreview(mode)} className={`rounded-full px-3 py-1 capitalize ${preview === mode ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>{mode}</button>
                ))}
              </div>
            </div>
            <div className={`mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4 ${preview === 'mobile' ? 'max-w-sm' : ''}`}>
              <p className="text-xs text-slate-500">techantum.com</p>
              <p className="text-xs text-emerald-700">{liveUrl}</p>
              <p className={`mt-1 text-sky-800 ${preview === 'desktop' ? 'text-xl' : 'text-lg'}`}>{previewTitle}</p>
              <p className="text-sm text-slate-600">{previewDescription}</p>
            </div>
          </div>
        </section>
      ) : <section className="rounded-2xl border border-slate-100 bg-white p-8 text-sm text-slate-500 shadow-sm">Select a page to edit its metadata.</section>}
    </div>
  );
}

const KEYWORD_TYPE: Record<string, { label: string; className: string }> = {
  seo: { label: 'SEO', className: 'bg-emerald-50 text-emerald-700' },
  ads: { label: 'Google Ads', className: 'bg-orange-50 text-orange-700' },
  both: { label: 'Both', className: 'bg-violet-50 text-violet-700' },
};

const KEYWORD_PRIORITY: Record<string, string> = {
  critical: 'bg-rose-50 text-rose-700',
  high: 'bg-rose-50 text-rose-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-sky-50 text-sky-700',
};

function KeywordLibrary({
  keywords,
  categories,
  form,
  editId,
  query,
  type,
  category,
  priority,
  status,
  page,
  sort,
  selection,
  busy,
  onForm,
  onEdit,
  onQuery,
  onType,
  onCategory,
  onPriority,
  onStatus,
  onPage,
  onSort,
  onSelection,
  onSave,
  onDelete,
  onStatusChange,
  onFavorite,
  onBulkDelete,
}: {
  keywords: any[];
  categories: Array<{ id: string; label: string }>;
  form: { keyword: string; usage_type: string; service_category: string; is_negative: boolean; priority: string };
  editId: string;
  query: string;
  type: string;
  category: string;
  priority: string;
  status: string;
  page: number;
  sort: { key: string; dir: 'asc' | 'desc' };
  selection: string[];
  busy: boolean;
  onForm: (form: { keyword: string; usage_type: string; service_category: string; is_negative: boolean; priority: string }) => void;
  onEdit: (row: any) => void;
  onQuery: (value: string) => void;
  onType: (value: string) => void;
  onCategory: (value: string) => void;
  onPriority: (value: string) => void;
  onStatus: (value: string) => void;
  onPage: (page: number) => void;
  onSort: (key: string) => void;
  onSelection: (ids: string[]) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  onStatusChange: (row: any, status: string) => void;
  onFavorite: (row: any) => void;
  onBulkDelete: () => void;
}) {
  const categoryLabel = (id: string) => categories.find((item) => item.id === id)?.label || titleCase(id || 'general');
  const needle = query.trim().toLowerCase();
  const filtered = keywords.filter((row) => {
    if (needle && !`${row.keyword} ${row.service_category}`.toLowerCase().includes(needle)) return false;
    if (type !== 'all' && row.usage_type !== type) return false;
    if (category !== 'all' && row.service_category !== category) return false;
    if (priority !== 'all' && row.priority !== priority) return false;
    if (status !== 'all' && row.status !== status) return false;
    return true;
  }).sort((left, right) => {
    const direction = sort.dir === 'asc' ? 1 : -1;
    const a = String(left[sort.key] ?? '').toLowerCase();
    const b = String(right[sort.key] ?? '').toLowerCase();
    return a < b ? -direction : a > b ? direction : 0;
  });
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * pageSize, current * pageSize);
  const seoCount = keywords.filter((row) => !row.is_negative && row.usage_type !== 'ads').length;
  const adsCount = keywords.filter((row) => !row.is_negative && row.usage_type !== 'seo').length;
  const negativeCount = keywords.filter((row) => row.is_negative).length;
  const categoryCount = new Set(keywords.map((row) => row.service_category).filter(Boolean)).size;
  const pageIds = slice.map((row) => row.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selection.includes(id));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KeywordStat icon="MagnifyingGlassIcon" tint="bg-sky-50 text-sky-600" label="Total Keywords" value={keywords.length} change={monthChange(keywords, () => true)} />
        <KeywordStat icon="ArrowTrendingUpIcon" tint="bg-emerald-50 text-emerald-600" label="SEO Keywords" value={seoCount} change={monthChange(keywords, (row: any) => !row.is_negative && row.usage_type !== 'ads')} />
        <KeywordStat icon="MegaphoneIcon" tint="bg-orange-50 text-orange-600" label="Google Ads Keywords" value={adsCount} change={monthChange(keywords, (row: any) => !row.is_negative && row.usage_type !== 'seo')} />
        <KeywordStat icon="NoSymbolIcon" tint="bg-rose-50 text-rose-600" label="Negative Keywords" value={negativeCount} change={monthChange(keywords, (row: any) => row.is_negative)} />
        <KeywordStat icon="Squares2X2Icon" tint="bg-violet-50 text-violet-600" label="Categories" value={categoryCount} change={null} />
      </div>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 font-bricolage text-lg font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600"><Icon name="PlusCircleIcon" size={18} /></span> {editId ? 'Edit Keyword' : 'Add Keyword'}</h2>
        <p className="mt-1 text-sm text-slate-500">Add a new keyword to your library. Organize, categorize and set priority for better campaign planning.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_1fr_0.7fr_auto_auto] lg:items-end">
          <label className="text-xs font-semibold text-slate-500">Keyword *
            <input className={`${inputClass} mt-1`} placeholder="Enter keyword (e.g. website development)" value={form.keyword} onChange={(event) => onForm({ ...form, keyword: event.target.value })} />
          </label>
          <label className="text-xs font-semibold text-slate-500">Type *
            <select className={`${inputClass} mt-1`} value={form.usage_type} onChange={(event) => onForm({ ...form, usage_type: event.target.value })}>
              <option value="seo">SEO</option>
              <option value="ads">Google Ads</option>
              <option value="both">Both</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">Category *
            <select className={`${inputClass} mt-1`} value={form.service_category} onChange={(event) => onForm({ ...form, service_category: event.target.value })}>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">Priority *
            <select className={`${inputClass} mt-1`} value={form.priority} onChange={(event) => onForm({ ...form, priority: event.target.value })}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="flex h-10 items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={form.is_negative} onChange={(event) => onForm({ ...form, is_negative: event.target.checked })} />
            Mark as negative keyword
          </label>
          <button type="button" disabled={busy} className="h-10 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white disabled:opacity-60" onClick={onSave}>{editId ? 'Save Keyword' : 'Add Keyword'}</button>
        </div>
        {editId ? <button type="button" className="mt-2 text-xs text-slate-500" onClick={() => onEdit(null)}>Cancel edit</button> : null}
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bricolage text-lg font-semibold">Saved Keywords ({filtered.length})</h2>
            <p className="text-sm text-slate-500">View and manage all your saved keywords. Use filters to find specific keywords.</p>
          </div>
          <div className="flex items-center gap-2">
            {selection.length ? <button type="button" className="text-sm font-medium text-rose-600" onClick={onBulkDelete}>Delete {selection.length}</button> : null}
            <a className="btn-secondary inline-flex items-center gap-1 text-sm" href="/api/admin/marketing-seo/keywords/export"><Icon name="ArrowDownTrayIcon" size={14} /> Export CSV</a>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <input className={`${inputClass} max-w-xs`} placeholder="Search keywords..." value={query} onChange={(event) => onQuery(event.target.value)} />
          <select className={`${inputClass} w-auto`} value={type} onChange={(event) => onType(event.target.value)}>
            <option value="all">All Types</option>
            <option value="seo">SEO</option>
            <option value="ads">Google Ads</option>
            <option value="both">Both</option>
          </select>
          <select className={`${inputClass} w-auto`} value={category} onChange={(event) => onCategory(event.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <select className={`${inputClass} w-auto`} value={priority} onChange={(event) => onPriority(event.target.value)}>
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select className={`${inputClass} w-auto`} value={status} onChange={(event) => onStatus(event.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
          <button type="button" className="text-sm text-slate-500" onClick={() => { onQuery(''); onType('all'); onCategory('all'); onPriority('all'); onStatus('all'); }}>Clear Filters</button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-3"><input type="checkbox" checked={allSelected} onChange={() => onSelection(allSelected ? selection.filter((id) => !pageIds.includes(id)) : [...new Set([...selection, ...pageIds])])} /></th>
                {[['keyword', 'Keyword'], ['usage_type', 'Type'], ['service_category', 'Category'], ['priority', 'Priority'], ['status', 'Status'], ['is_negative', 'Negative'], ['updated_at', 'Last Updated']].map(([key, label]) => (
                  <th key={key} className="py-2 pr-3 font-medium"><button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(key)}>{label}</button></th>
                ))}
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((row) => {
                const typeBadge = KEYWORD_TYPE[row.usage_type] || KEYWORD_TYPE.seo;
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-3 pr-3"><input type="checkbox" checked={selection.includes(row.id)} onChange={() => onSelection(selection.includes(row.id) ? selection.filter((id) => id !== row.id) : [...selection, row.id])} /></td>
                    <td className="py-3 pr-3 font-medium text-slate-800">{row.keyword}{row.is_favorite ? ' ★' : ''}</td>
                    <td className="py-3 pr-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadge.className}`}>{typeBadge.label}</span></td>
                    <td className="py-3 pr-3 text-slate-600">{categoryLabel(row.service_category)}</td>
                    <td className="py-3 pr-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${KEYWORD_PRIORITY[row.priority] || KEYWORD_PRIORITY.medium}`}>{titleCase(row.priority || 'medium')}</span></td>
                    <td className="py-3 pr-3">
                      <select className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs" value={row.status || 'active'} onChange={(event) => onStatusChange(row, event.target.value)}>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="archived">Archived</option>
                      </select>
                    </td>
                    <td className="py-3 pr-3">{row.is_negative ? <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Yes</span> : <span className="text-slate-400">No</span>}</td>
                    <td className="py-3 pr-3 text-xs text-slate-500">{row.updated_at ? new Date(row.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2 text-slate-400">
                        <button type="button" aria-label="Favorite" onClick={() => onFavorite(row)}><Icon name="StarIcon" size={16} className={row.is_favorite ? 'text-amber-500' : ''} /></button>
                        <button type="button" aria-label="Edit" onClick={() => onEdit(row)}><Icon name="PencilSquareIcon" size={16} /></button>
                        <button type="button" aria-label="Delete" onClick={() => onDelete(row.id)}><Icon name="TrashIcon" size={16} className="text-rose-500" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!slice.length ? <tr><td colSpan={9} className="py-8 text-slate-500">No keywords match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <p>Showing {filtered.length ? (current - 1) * pageSize + 1 : 0} to {Math.min(current * pageSize, filtered.length)} of {filtered.length} keywords</p>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-lg border border-slate-200 px-2 py-1" disabled={current <= 1} onClick={() => onPage(current - 1)}>‹</button>
            <span className="rounded-lg bg-orange-500 px-2.5 py-1 font-semibold text-white">{current}</span>
            <button type="button" className="rounded-lg border border-slate-200 px-2 py-1" disabled={current >= pages} onClick={() => onPage(current + 1)}>›</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, tint, label, value }: { icon: string; tint: string; label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tint}`}>
        <Icon name={icon} size={18} />
      </span>
      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 font-bricolage text-[1.65rem] font-semibold leading-none text-slate-900">{value}</p>
    </article>
  );
}

export default function MarketingSeoModule() {
  const search = useSearchParams();
  const [tab, setTab] = useState<TabId>((search?.get('tab') as TabId) || 'overview');
  const [message, setMessage] = useState(search?.get('error') || search?.get('connected') ? (search?.get('error') || 'Search Console connected.') : '');
  const [error, setError] = useState('');
  const [overview, setOverview] = useState<any>(null);
  const [audit, setAudit] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any>(null);
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [assetTab, setAssetTab] = useState('headline');
  const [keywordForm, setKeywordForm] = useState({ keyword: '', usage_type: 'seo', service_category: 'website-development', is_negative: false, priority: 'medium' });
  const [keywordEditId, setKeywordEditId] = useState('');
  const [assetForm, setAssetForm] = useState({ asset_type: 'headline', text: '', service_category: 'general' });
  const [draft, setDraft] = useState<any>({ name: '', landing_page: 'https://techantum.com/', headline_ids: [], description_ids: [], keyword_ids: [], negative_keyword_ids: [], callout_ids: [], sitelink_ids: [] });
  const [filter, setFilter] = useState('');
  const [auditQuery, setAuditQuery] = useState('');
  const [auditStatus, setAuditStatus] = useState('all');
  const [auditPriority, setAuditPriority] = useState('all');
  const [pageQuery, setPageQuery] = useState('');
  const [pageStatus, setPageStatus] = useState('all');
  const [addingPage, setAddingPage] = useState(false);
  const [newPagePath, setNewPagePath] = useState('');
  const [keywordType, setKeywordType] = useState('all');
  const [keywordCategory, setKeywordCategory] = useState('all');
  const [keywordPriority, setKeywordPriority] = useState('all');
  const [keywordStatus, setKeywordStatus] = useState('all');
  const [keywordPage, setKeywordPage] = useState(1);
  const [keywordSort, setKeywordSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'updated_at', dir: 'desc' });
  const [keywordSelection, setKeywordSelection] = useState<string[]>([]);
  const [hideConnectedBanner, setHideConnectedBanner] = useState(false);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const [nextOverview, nextAudit, nextPages, nextKeywords, nextAssets, nextCampaigns, nextIntegrations] = await Promise.all([
      api('overview'),
      api('audit'),
      api('pages'),
      api('keywords'),
      api('assets'),
      api('campaigns'),
      api('integrations'),
    ]);
    setOverview(nextOverview);
    setAudit(nextAudit);
    setPages(nextPages);
    setKeywords(nextKeywords);
    setAssets(nextAssets);
    setCampaigns(nextCampaigns);
    setIntegrations(nextIntegrations);
    setSelectedPage((current: any) => current || nextPages[0] || null);
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load]);

  const categories = overview?.categories || [];
  const visibleAssets = assets.filter((row) => row.asset_type === assetTab && row.status !== 'archived');

  const run = async (label: string, work: () => Promise<void>) => {
    setBusy(label);
    setError('');
    setMessage('');
    try {
      await work();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy('');
    }
  };

  const metric = (value: unknown) => (value == null || value === 'Not Connected' ? 'Not Connected' : String(value));
  const percent = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? `${(number * 100).toFixed(1)}%` : '—';
  };
  const rounded = (value: unknown) => {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(1) : '—';
  };

  const queries = Array.isArray(overview?.snapshot?.queries) ? overview.snapshot.queries : [];
  const searchPages = Array.isArray(overview?.snapshot?.pages) ? overview.snapshot.pages : [];
  const failedChecks = (audit?.issues || []).filter((row: any) => row.status === 'failed');
  const rangeLabel = overview?.snapshot?.range_start
    ? `${new Date(overview.snapshot.range_start).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })} – ${new Date(overview.snapshot.range_end).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}`
    : 'Last 28 days';
  const pagePath = (url: string) => {
    try {
      const path = new URL(url).pathname;
      return path === '/' ? '/' : path.replace(/\/$/, '');
    } catch {
      return url || '/';
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">Home <span className="px-1">›</span> SEO & Google Ads{tab === 'overview' ? '' : <><span className="px-1">›</span> {TABS.find((item) => item.id === tab)?.label}</>}</p>
          <h1 className="mt-1 font-bricolage text-2xl font-semibold text-slate-900">SEO & Google Ads</h1>
          <p className="mt-1 text-sm text-slate-500">{tab === 'pages' ? 'Optimize your website pages and metadata for better visibility and higher rankings.' : 'Manage your website visibility, keywords, ads and performance from one place.'}</p>
        </div>
        {tab === 'pages' ? (
          <div className="flex flex-wrap items-center gap-2">
            <a className="btn-secondary inline-flex items-center gap-2" href={selectedPage ? `https://techantum.com${selectedPage.path === '/' ? '/' : selectedPage.path}` : 'https://techantum.com/'} target="_blank" rel="noreferrer"><Icon name="EyeIcon" size={16} /> View Live Site</a>
            <button type="button" className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setAddingPage(true)}><Icon name="PlusIcon" size={16} /> Add Page</button>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Icon name="CalendarDaysIcon" size={16} className="text-slate-400" />
            {rangeLabel}
          </div>
        )}
      </div>
      {tab === 'keywords' && overview?.gsc?.connected && !hideConnectedBanner ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="inline-flex items-center gap-2"><Icon name="CheckCircleIcon" size={18} /> Search Console connected.</span>
          <button type="button" className="text-emerald-700" aria-label="Dismiss" onClick={() => setHideConnectedBanner(true)}>×</button>
        </div>
      ) : null}
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${tab === item.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon="HeartIcon" tint="bg-violet-50 text-violet-600" label="SEO Health Score" value={overview.healthScore == null ? 'Not run' : `${overview.healthScore} / 100`} />
            <MetricCard icon="DocumentTextIcon" tint="bg-sky-50 text-sky-600" label="Indexed Pages" value={metric(overview.indexedPages)} />
            <MetricCard icon="ExclamationCircleIcon" tint="bg-rose-50 text-rose-600" label="SEO Issues Pending" value={overview.issuesPending} />
            <MetricCard icon="CursorArrowRaysIcon" tint="bg-emerald-50 text-emerald-600" label="Organic Search Clicks" value={metric(overview.organicClicks)} />
            <MetricCard icon="KeyIcon" tint="bg-indigo-50 text-indigo-600" label="Saved SEO Keywords" value={overview.seoKeywords} />
            <MetricCard icon="MegaphoneIcon" tint="bg-amber-50 text-amber-600" label="Saved Google Ads Keywords" value={overview.adsKeywords} />
            <MetricCard icon="Squares2X2Icon" tint="bg-violet-50 text-violet-600" label="Saved Ad Assets" value={overview.adAssets} />
            <MetricCard icon="DocumentDuplicateIcon" tint="bg-sky-50 text-sky-600" label="Campaign Drafts" value={overview.campaignDrafts} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 font-bricolage text-lg font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> SEO Status</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${failedChecks.length ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{failedChecks.length ? 'Needs attention' : 'Healthy'}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Last audit {overview.lastAuditAt ? new Date(overview.lastAuditAt).toLocaleString() : 'has not run yet'}.</p>
              <ul className="mt-3 space-y-2 text-sm">
                {failedChecks.slice(0, 4).map((row: any) => (
                  <li key={row.id} className="rounded-xl bg-rose-50 px-3 py-2 text-rose-900">{row.check_name}: {row.issue_description}</li>
                ))}
                {!failedChecks.length ? <li className="text-slate-500">No failed checks in the latest run. Your site is performing well.</li> : null}
              </ul>
            </section>
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-bricolage text-lg font-semibold">Search Performance</h2>
                {overview.gsc?.connected ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Connected</span> : (
                  <button type="button" className="rounded-xl border border-violet-200 px-3 py-1.5 text-sm font-semibold text-violet-700" onClick={() => setTab('integrations')}>Connect Search Console</button>
                )}
              </div>
              {overview.gsc?.connected && overview.snapshot ? (
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-400">Clicks</dt><dd className="font-semibold">{Math.round(Number(overview.snapshot.clicks || 0))}</dd></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-400">Impressions</dt><dd className="font-semibold">{Math.round(Number(overview.snapshot.impressions || 0))}</dd></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-400">CTR</dt><dd className="font-semibold">{percent(overview.snapshot.ctr)}</dd></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-400">Avg position</dt><dd className="font-semibold">{rounded(overview.snapshot.position)}</dd></div>
                </dl>
              ) : <p className="mt-3 text-sm text-slate-500">Data unavailable until Search Console is connected.</p>}
              <p className="mt-3 text-xs text-slate-400">{overview.gsc?.propertyUri || 'Google Search Console'} · {rangeLabel}</p>
            </section>
          </div>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="font-bricolage text-lg font-semibold">Quick Actions</h2>
            <p className="text-sm text-slate-500">Manage your SEO and Google Ads activities quickly.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminButton variant="primary" loading={busy === 'audit'} onClick={() => run('audit', async () => { await api('audit/run', { method: 'POST', body: '{}' }); setTab('audit'); })}>Run SEO Audit</AdminButton>
              <AdminButton onClick={() => setTab('keywords')}>Add Keyword</AdminButton>
              <AdminButton onClick={() => setTab('ads')}>Add Ad Asset</AdminButton>
              <AdminButton onClick={() => setTab('campaigns')}>Create Ad Draft</AdminButton>
              <a className="btn-secondary" href="/sitemap.xml" target="_blank" rel="noreferrer">View Sitemap</a>
              <a className="btn-secondary" href="/robots.txt" target="_blank" rel="noreferrer">View Robots.txt</a>
              <AdminButton onClick={() => setTab('integrations')}>{overview.gsc?.connected ? 'Google Integrations' : 'Connect Search Console'}</AdminButton>
            </div>
          </section>
          <div className="grid gap-4 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="font-bricolage text-base font-semibold">Keyword Performance</h2>
                  <p className="text-xs text-slate-400">Queries from Google Search Console</p>
                </div>
                <button type="button" className="text-sm font-medium text-violet-700" onClick={() => setTab('keywords')}>View all</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>{['Keyword', 'Position', 'Clicks', 'Impressions'].map((heading) => <th key={heading} className="px-5 py-2 font-medium">{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    {queries.length ? queries.slice(0, 8).map((row: { keys?: string[]; clicks?: number; impressions?: number; position?: number }) => (
                      <tr key={row.keys?.[0]} className="border-t border-slate-100">
                        <td className="px-5 py-2.5 font-medium text-slate-800">{row.keys?.[0]}</td>
                        <td className="px-5 py-2.5">{rounded(row.position)}</td>
                        <td className="px-5 py-2.5">{Math.round(Number(row.clicks || 0))}</td>
                        <td className="px-5 py-2.5">{Math.round(Number(row.impressions || 0))}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-5 py-6 text-slate-500">No search queries in this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="font-bricolage text-base font-semibold">Top Pages</h2>
                  <p className="text-xs text-slate-400">Best performing pages in organic search</p>
                </div>
                <button type="button" className="text-sm font-medium text-violet-700" onClick={() => setTab('pages')}>View all</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>{['Page', 'Clicks', 'Impressions', 'Position'].map((heading) => <th key={heading} className="px-5 py-2 font-medium">{heading}</th>)}</tr>
                  </thead>
                  <tbody>
                    {searchPages.length ? searchPages.slice(0, 8).map((row: { keys?: string[]; clicks?: number; impressions?: number; position?: number }) => (
                      <tr key={row.keys?.[0]} className="border-t border-slate-100">
                        <td className="max-w-[16rem] truncate px-5 py-2.5 font-medium text-slate-800">{pagePath(String(row.keys?.[0] || ''))}</td>
                        <td className="px-5 py-2.5">{Math.round(Number(row.clicks || 0))}</td>
                        <td className="px-5 py-2.5">{Math.round(Number(row.impressions || 0))}</td>
                        <td className="px-5 py-2.5">{rounded(row.position)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-5 py-6 text-slate-500">No pages in this date range.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {tab === 'audit' ? (
        <AuditPanel
          audit={audit}
          busy={busy === 'audit'}
          query={auditQuery}
          status={auditStatus}
          priority={auditPriority}
          onQuery={setAuditQuery}
          onStatus={setAuditStatus}
          onPriority={setAuditPriority}
          onRun={() => run('audit', async () => { await api('audit/run', { method: 'POST', body: '{}' }); })}
          onTask={(id, fixStatus) => run('issue', async () => { await api('audit/issues', { method: 'PATCH', body: JSON.stringify({ id, fix_status: fixStatus }) }); })}
        />
      ) : null}

      {tab === 'pages' ? (
        <PagesPanel
          pages={pages}
          selected={selectedPage}
          query={pageQuery}
          status={pageStatus}
          adding={addingPage}
          newPath={newPagePath}
          busy={busy === 'page'}
          onQuery={setPageQuery}
          onStatus={setPageStatus}
          onSelect={setSelectedPage}
          onNewPath={setNewPagePath}
          onCancelAdd={() => { setAddingPage(false); setNewPagePath(''); }}
          onCreate={() => {
            const path = (newPagePath.trim().startsWith('/') ? newPagePath.trim() : `/${newPagePath.trim()}`).replace(/\/+$/, '') || '/';
            if (pages.some((page) => page.path === path)) {
              setSelectedPage(pages.find((page) => page.path === path));
            } else {
              setPages((current) => [{ path, name: path, title: '', description: '', primary_keyword: '', secondary_keywords: [], canonical_url: `https://techantum.com${path === '/' ? '/' : path}`, publish_state: 'draft' }, ...current]);
              setSelectedPage({ path, name: path, title: '', description: '', primary_keyword: '', secondary_keywords: [], canonical_url: `https://techantum.com${path === '/' ? '/' : path}`, publish_state: 'draft' });
            }
            setAddingPage(false);
            setNewPagePath('');
          }}
          onChange={setSelectedPage}
          onSave={(publishState) => run('page', async () => {
            const saved = await api('pages', { method: 'POST', body: JSON.stringify({ ...selectedPage, publish_state: publishState }) });
            setSelectedPage({ ...selectedPage, ...saved, name: selectedPage?.name });
            setMessage(publishState === 'published' ? 'Published. This metadata is now used on the live page.' : 'Draft saved. Public HTML is unchanged until you publish.');
          })}
        />
      ) : null}

      {tab === 'keywords' ? (
        <KeywordLibrary
          keywords={keywords}
          categories={categories}
          form={keywordForm}
          editId={keywordEditId}
          query={filter}
          type={keywordType}
          category={keywordCategory}
          priority={keywordPriority}
          status={keywordStatus}
          page={keywordPage}
          sort={keywordSort}
          selection={keywordSelection}
          busy={busy === 'keyword'}
          onForm={setKeywordForm}
          onEdit={(row) => {
            setKeywordEditId(row?.id || '');
            setKeywordForm(row ? { keyword: row.keyword, usage_type: row.usage_type, service_category: row.service_category, is_negative: Boolean(row.is_negative), priority: row.priority || 'medium' } : { keyword: '', usage_type: 'seo', service_category: categories[0]?.id || 'website-development', is_negative: false, priority: 'medium' });
          }}
          onQuery={(value) => { setFilter(value); setKeywordPage(1); }}
          onType={(value) => { setKeywordType(value); setKeywordPage(1); }}
          onCategory={(value) => { setKeywordCategory(value); setKeywordPage(1); }}
          onPriority={(value) => { setKeywordPriority(value); setKeywordPage(1); }}
          onStatus={(value) => { setKeywordStatus(value); setKeywordPage(1); }}
          onPage={setKeywordPage}
          onSort={(key) => setKeywordSort((current) => ({ key, dir: current.key === key && current.dir === 'asc' ? 'desc' : 'asc' }))}
          onSelection={setKeywordSelection}
          onSave={() => run('keyword', async () => {
            const existing = keywords.find((row) => row.id === keywordEditId) || {};
            await api('keywords', { method: keywordEditId ? 'PATCH' : 'POST', body: JSON.stringify({ ...existing, ...keywordForm, id: keywordEditId || undefined }) });
            setKeywordEditId('');
            setKeywordForm({ ...keywordForm, keyword: '', is_negative: false });
            setMessage(keywordEditId ? 'Keyword updated.' : 'Keyword added.');
          })}
          onDelete={(id) => run('keyword', async () => { await api(`keywords?id=${id}`, { method: 'DELETE' }); })}
          onStatusChange={(row, status) => run('keyword', async () => { await api('keywords', { method: 'PATCH', body: JSON.stringify({ ...row, status }) }); })}
          onFavorite={(row) => run('keyword', async () => { await api('keywords', { method: 'PATCH', body: JSON.stringify({ ...row, is_favorite: !row.is_favorite }) }); })}
          onBulkDelete={() => run('keyword', async () => { await api('keywords/bulk', { method: 'POST', body: JSON.stringify({ ids: keywordSelection, action: 'delete' }) }); setKeywordSelection([]); })}
        />
      ) : null}

      {tab === 'ads' ? (
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex flex-wrap gap-1">
            {['headline', 'description', 'callout', 'sitelink', 'snippet'].map((id) => (
              <button key={id} type="button" onClick={() => { setAssetTab(id); setAssetForm({ ...assetForm, asset_type: id }); }} className={`rounded-xl px-3 py-1.5 text-sm ${assetTab === id ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{id}</button>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className={inputClass} placeholder={`${assetTab} text`} value={assetForm.text} onChange={(event) => setAssetForm({ ...assetForm, text: event.target.value })} />
            <AdminButton variant="primary" onClick={() => run('asset', async () => { await api('assets', { method: 'POST', body: JSON.stringify(assetForm) }); setAssetForm({ ...assetForm, text: '' }); })}>Add Asset</AdminButton>
          </div>
          <p className="text-xs text-slate-400">{adsCharacterCount(assetForm.text)}/{adsLimitFor(assetTab)} characters. Starter assets are editable planning copy, not proven ad performance.</p>
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400"><tr>{['Asset', 'Category', 'Characters', 'Status', ''].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
            <tbody>
              {visibleAssets.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3">{row.text}</td>
                  <td className="py-2 pr-3">{row.service_category}</td>
                  <td className="py-2 pr-3">{adsCharacterCount(row.text)}/{adsLimitFor(row.asset_type)}</td>
                  <td className="py-2 pr-3">{row.status}</td>
                  <td className="py-2 pr-3"><button type="button" className="text-sky-700" onClick={() => navigator.clipboard.writeText(row.text)}>Copy</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === 'campaigns' ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="font-bricolage text-lg font-semibold">Campaign draft</h2>
            <input className={inputClass} placeholder="Campaign name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <input className={inputClass} placeholder="Landing page" value={draft.landing_page} onChange={(event) => setDraft({ ...draft, landing_page: event.target.value })} />
            <p className="text-sm text-slate-500">Select at least 3 headlines and 2 descriptions from the Ads Library, then save. Nothing is sent to Google Ads.</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Headlines</p>
                {assets.filter((row) => row.asset_type === 'headline' && row.status !== 'archived').slice(0, 12).map((row) => (
                  <label key={row.id} className="mt-1 flex items-start gap-2 text-sm"><input type="checkbox" checked={draft.headline_ids.includes(row.id)} onChange={() => setDraft({ ...draft, headline_ids: draft.headline_ids.includes(row.id) ? draft.headline_ids.filter((id: string) => id !== row.id) : [...draft.headline_ids, row.id] })} />{row.text}</label>
                ))}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">Descriptions</p>
                {assets.filter((row) => row.asset_type === 'description' && row.status !== 'archived').map((row) => (
                  <label key={row.id} className="mt-1 flex items-start gap-2 text-sm"><input type="checkbox" checked={draft.description_ids.includes(row.id)} onChange={() => setDraft({ ...draft, description_ids: draft.description_ids.includes(row.id) ? draft.description_ids.filter((id: string) => id !== row.id) : [...draft.description_ids, row.id] })} />{row.text}</label>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">Illustrative preview — Google may rearrange assets.</p>
              <p className="mt-2 text-xs text-emerald-700">Ad · techantum.com</p>
              <p className="text-lg text-sky-800">{assets.find((row) => row.id === draft.headline_ids[0])?.text || 'Headline'}</p>
              <p className="text-sm text-slate-600">{assets.find((row) => row.id === draft.description_ids[0])?.text || 'Description'}</p>
            </div>
            <AdminButton variant="primary" onClick={() => run('draft', async () => { await api('campaigns', { method: 'POST', body: JSON.stringify(draft) }); setMessage('Draft saved. It is not live in Google Ads.'); })}>Save Draft</AdminButton>
          </section>
          <aside className="rounded-2xl border border-slate-100 bg-white p-4">
            <h3 className="font-semibold">Saved drafts</h3>
            {campaigns.map((row) => (
              <div key={row.id} className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-slate-500">{row.status} · {row.landing_page}</p>
                <button type="button" className="mt-1 text-sky-700" onClick={() => setDraft({ ...row, headline_ids: row.headline_ids || [], description_ids: row.description_ids || [], keyword_ids: row.keyword_ids || [], negative_keyword_ids: row.negative_keyword_ids || [], callout_ids: row.callout_ids || [], sitelink_ids: row.sitelink_ids || [] })}>Edit</button>
              </div>
            ))}
          </aside>
        </div>
      ) : null}

      {tab === 'integrations' && integrations ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="font-bricolage text-lg font-semibold">Google Search Console</h2>
            <p className="mt-1 text-sm text-slate-500">{integrations.gsc?.connected ? `Connected as ${integrations.gsc.googleEmail}` : 'Not connected. Metrics will show Data Unavailable.'}</p>
            <p className="mt-2 text-xs text-slate-400">Add this redirect URI in Google Cloud: {integrations.redirectUri}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn-primary" href="/api/admin/marketing-seo/gsc/start">Connect Search Console</a>
              <AdminButton loading={busy === 'sync'} onClick={() => run('sync', async () => { await api('gsc/sync', { method: 'POST', body: '{}' }); setMessage('Search Console synced.'); })}>Manual sync</AdminButton>
            </div>
            {integrations.gsc?.lastError ? <p className="mt-2 text-sm text-rose-700">{integrations.gsc.lastError}</p> : null}
            <a className="mt-3 inline-block text-sm text-sky-700" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Open Search Console</a>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5">
            <h2 className="font-bricolage text-lg font-semibold">Google Ads API</h2>
            <p className="mt-1 text-sm text-slate-500">{integrations.ads?.message}</p>
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-5 lg:col-span-2">
            <h2 className="font-bricolage text-lg font-semibold">Google Business Profile checklist</h2>
            <ul className="mt-3 space-y-2">
              {(integrations.gbp || []).map((row: any) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="min-w-56">{row.label}</span>
                  <select className={inputClass} style={{ width: 180 }} value={row.status} onChange={(event) => run('gbp', async () => { await api('gbp', { method: 'POST', body: JSON.stringify({ id: row.id, status: event.target.value }) }); })}>
                    <option value="pending">Pending</option>
                    <option value="done">Done</option>
                    <option value="not_applicable">N/A</option>
                  </select>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
