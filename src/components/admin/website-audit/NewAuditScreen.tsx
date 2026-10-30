'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { AuditScanOverlay, BusyButton, saveScanSession } from './AuditBusy';

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/website-audit/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20';

type FormState = {
  audit_name: string;
  website_url: string;
  project_id: string;
  environment: string;
  audit_scope: string;
  max_pages: number;
  desktop_enabled: boolean;
  mobile_enabled: boolean;
  forms_enabled: boolean;
  ai_enabled: boolean;
  notes: string;
};

function plannedPages(form: FormState) {
  return form.audit_scope === 'single' ? 1 : Math.max(1, form.max_pages);
}

function estimateDuration(form: FormState) {
  const pages = plannedPages(form);
  let per = 0.35;
  if (form.desktop_enabled) per += 0.2;
  if (form.mobile_enabled) per += 0.25;
  if (form.forms_enabled) per += 0.12;
  if (form.ai_enabled) per += 0.22;
  const min = Math.max(1, Math.round(pages * per * 0.65));
  const max = Math.max(min + 1, Math.round(pages * per * 1.55));
  return { min, max, label: min === max ? `~${min} min` : `~${min}–${max} min` };
}

export default function NewAuditScreen() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [form, setForm] = useState<FormState>({
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projectRows, current, stats] = await Promise.all([api('projects'), api('settings'), api('overview')]);
        if (cancelled) return;
        setProjects(projectRows);
        setSettings(current);
        setOverview(stats);
        setForm((prev) => ({ ...prev, max_pages: current.default_max_pages || 10 }));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const duration = useMemo(() => estimateDuration(form), [form]);
  const last = overview?.last_scan;
  const maxAllowed = settings?.max_pages || 25;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await api('audits', { method: 'POST', body: JSON.stringify(form) });
      saveScanSession({ id: String(created.id), url: form.website_url, name: form.audit_name });
      router.push(`/admin/website-audit/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start audit');
      setSaving(false);
    }
  }

  if (loading) return <NewAuditSkeleton />;

  return (
    <div className="audit-fade">
      <AuditScanOverlay open={saving} url={form.website_url} aiEnabled={Boolean(form.ai_enabled)} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Website Audit</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">New Audit</h1>
      <p className="mt-1 text-sm text-slate-500">Configure a new audit to scan website health, usability, and technical SEO.</p>
      {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={onSubmit} className="space-y-4">
          <Section n={1} title="Audit Basics" subtitle="Provide the basic details for your website audit." delay={0}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Audit name" required icon="ClipboardDocumentListIcon">
                <input className={fieldClass} placeholder="e.g. Company Website Audit" value={form.audit_name} onChange={(e) => setForm({ ...form, audit_name: e.target.value })} required />
              </Field>
              <Field label="Website URL" icon="GlobeAltIcon">
                <input className={fieldClass} placeholder="https://example.com" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} required />
              </Field>
              <Field label="Project" icon="FolderIcon">
                <select className={fieldClass} value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">None</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.project_name}</option>)}
                </select>
              </Field>
              <Field label="Environment" icon="ServerStackIcon">
                <select className={fieldClass} value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })}>
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>
            </div>
          </Section>

          <Section n={2} title="Scan Scope" subtitle="Define how much of the site to scan." delay={80}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Audit scope" icon="Squares2X2Icon">
                <select className={fieldClass} value={form.audit_scope} onChange={(e) => setForm({ ...form, audit_scope: e.target.value })}>
                  <option value="single">Single page</option>
                  <option value="website">Whole website</option>
                  <option value="selected">Selected pages</option>
                </select>
              </Field>
              <Field label="Maximum pages">
                <input
                  type="number"
                  min={1}
                  max={maxAllowed}
                  disabled={form.audit_scope === 'single'}
                  className={fieldClass}
                  value={form.audit_scope === 'single' ? 1 : form.max_pages}
                  onChange={(e) => setForm({ ...form, max_pages: Number(e.target.value) })}
                />
                <p className="mt-1 text-xs text-slate-400">Set the maximum number of pages to crawl (1–{maxAllowed}).</p>
              </Field>
            </div>
          </Section>

          <Section n={3} title="Checks Included" subtitle="Select the checks and analysis to include in this audit." delay={140}>
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckCard icon="ComputerDesktopIcon" title="Desktop check" description="Analyze desktop performance and UX." checked={form.desktop_enabled} onChange={(desktop_enabled) => setForm({ ...form, desktop_enabled })} />
              <CheckCard icon="DevicePhoneMobileIcon" title="Mobile check" description="Analyze mobile performance and UX." checked={form.mobile_enabled} onChange={(mobile_enabled) => setForm({ ...form, mobile_enabled })} />
              <CheckCard icon="DocumentTextIcon" title="Include forms (safe validation)" description="Test forms with safe, non-intrusive validation." checked={form.forms_enabled} onChange={(forms_enabled) => setForm({ ...form, forms_enabled })} />
              <CheckCard icon="SparklesIcon" title="Include AI review" description="Get AI-powered insights and recommendations." checked={form.ai_enabled} onChange={(ai_enabled) => setForm({ ...form, ai_enabled })} />
            </div>
          </Section>

          <Section n={4} title="Notes" subtitle="Add any additional information or special instructions (optional)." delay={200}>
            <textarea
              className={`${fieldClass} min-h-[96px]`}
              maxLength={1000}
              placeholder="e.g. Focus on core user journeys, checkout flow, etc."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <p className="mt-1 text-right text-xs text-slate-400">{form.notes.length}/1000</p>
          </Section>

          <div className="flex justify-end gap-3 pt-2" style={{ animationDelay: '260ms' }}>
            <Link href="/admin/website-audit" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
            <BusyButton type="submit" busy={saving} className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95">
              <Icon name="MagnifyingGlassIcon" size={16} />
              {saving ? 'Starting scan…' : 'Start Scan'}
            </BusyButton>
          </div>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-6">
          <InsightCard
            delay={60}
            tone="rose"
            icon="ChartBarIcon"
            title="Website Audit Overview"
            body={last
              ? `Last scan scored ${last.overall_score ?? '—'} with ${last.critical_count || 0} critical and ${last.high_count || 0} high issues. ${overview.audits_this_month} audit(s) this month.`
              : 'Our audit scans your website to identify performance issues, SEO opportunities, accessibility improvements and more.'}
          />
          <div className="audit-fade rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" style={{ animationDelay: '120ms' }}>
            <p className="text-sm font-semibold text-slate-800">Scan Includes</p>
            <p className="mt-1 text-xs text-slate-500">We analyze multiple aspects of your site health and provide actionable insights.</p>
            <ul className="mt-3 space-y-3 text-sm">
              <IncludeRow icon="BoltIcon" color="bg-orange-100 text-orange-600" title="Performance" text="Page speed, Core Web Vitals, load time" />
              <IncludeRow icon="MagnifyingGlassIcon" color="bg-emerald-100 text-emerald-700" title="SEO" text="On-page SEO, meta tags, structured data" />
              <IncludeRow icon="EyeIcon" color="bg-sky-100 text-sky-700" title="Accessibility" text="WCAG checks, usability, best practices" />
              <IncludeRow icon="LinkIcon" color="bg-violet-100 text-violet-700" title="Links & Content" text="Broken links, redirects, content quality" />
              {form.forms_enabled ? <IncludeRow icon="DocumentTextIcon" color="bg-amber-100 text-amber-700" title="Forms" text="Safe validation and accessible labels" /> : null}
              {form.ai_enabled ? <IncludeRow icon="SparklesIcon" color="bg-pink-100 text-pink-700" title="Web Master Agent" text="Selective visual and content judgment" /> : null}
            </ul>
          </div>
          <div key={`dur-${duration.label}-${last?.duration_minutes || 0}`} className="audit-stat-pulse rounded-2xl border border-orange-100 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Icon name="ClockIcon" size={18} /></span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{last?.duration_minutes ? 'Last scan duration' : 'Estimated Duration'}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{last?.duration_minutes ? `~${last.duration_minutes} min` : duration.label}</p>
                <p className="text-xs text-slate-500">{last?.duration_minutes ? 'Updated from the latest completed audit.' : 'Depending on your site size and page limit.'}</p>
              </div>
            </div>
          </div>
          <div key={`pages-${plannedPages(form)}-${last?.pages_scanned || 0}`} className="audit-stat-pulse rounded-2xl border border-orange-100 bg-orange-50 p-4" style={{ animationDelay: '80ms' }}>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Icon name="DocumentDuplicateIcon" size={18} /></span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{last ? 'Pages scanned' : 'Pages Limit'}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{last ? `${last.pages_scanned || 0} of ${last.max_pages || plannedPages(form)}` : `${plannedPages(form)} pages`}</p>
                <p className="text-xs text-slate-500">{last ? 'Actual pages from the last completed scan. This audit is set to ' + plannedPages(form) + ' pages.' : `You can set a maximum of 1–${maxAllowed} pages to crawl per audit.`}</p>
              </div>
            </div>
          </div>
          {last?.overall_score != null ? (
            <div key={String(last.overall_score)} className="audit-stat-pulse rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Last overall score</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{last.overall_score}</p>
              <Link className="text-xs font-medium text-secondary" href={`/admin/website-audit/${last.id}`}>View last report</Link>
            </div>
          ) : null}
          <div className="audit-fade rounded-2xl border border-emerald-100 bg-emerald-50 p-4" style={{ animationDelay: '180ms' }}>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Icon name="LightBulbIcon" size={18} className="text-emerald-600" /> Best Practice Tips
            </div>
            <ul className="space-y-1.5 text-sm text-slate-600">
              <li>✓ Start with a smaller page limit for faster results</li>
              <li>✓ Include both desktop and mobile checks</li>
              <li>✓ Enable form checking for better insights</li>
              <li>✓ Use AI review for detailed recommendations</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({ n, title, subtitle, delay, children }: { n: number; title: string; subtitle: string; delay: number; children: React.ReactNode }) {
  return (
    <section className="audit-fade rounded-2xl border border-slate-100 bg-white p-5 shadow-sm" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-50 text-xs font-semibold text-secondary">{n}</span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, icon, children }: { label: string; required?: boolean; icon?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="mb-1.5 flex items-center gap-1.5">
        {icon ? <Icon name={icon} size={14} className="text-slate-400" /> : null}
        {label}{required ? <span className="text-secondary">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function CheckCard({ icon, title, description, checked, onChange }: { icon: string; title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${checked ? 'border-secondary/40 bg-orange-50/60' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <span className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${checked ? 'bg-orange-100 text-secondary' : 'bg-slate-100 text-slate-500'}`}>
        <Icon name={icon} size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
      <span className={`mt-1 h-4 w-4 rounded border ${checked ? 'border-secondary bg-secondary' : 'border-slate-300 bg-white'}`} />
    </button>
  );
}

function IncludeRow({ icon, color, title, text }: { icon: string; color: string; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}><Icon name={icon} size={16} /></span>
      <span>
        <span className="block font-medium text-slate-800">{title}</span>
        <span className="text-xs text-slate-500">{text}</span>
      </span>
    </li>
  );
}

function InsightCard({ delay, tone, icon, title, body }: { delay: number; tone: 'rose' | 'orange'; icon: string; title: string; body: string }) {
  const wrap = tone === 'rose' ? 'border-rose-100 bg-rose-50' : 'border-orange-100 bg-orange-50';
  return (
    <div className={`audit-fade rounded-2xl border p-4 ${wrap}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-secondary shadow-sm"><Icon name={icon} size={18} /></span>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function NewAuditSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-3 w-32 rounded bg-slate-200" />
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-40 rounded-2xl bg-slate-100" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <div key={item} className="h-28 rounded-2xl bg-slate-100" />)}
        </div>
      </div>
    </div>
  );
}
