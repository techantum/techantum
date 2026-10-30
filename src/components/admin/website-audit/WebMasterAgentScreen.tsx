'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BusyButton, PageRedirectLoader, saveScanSession } from './AuditBusy';

const EXTRA_KEY = 'techantum.webmaster.extras';
const inputClass = 'mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#6D5CFF] focus:ring-2 focus:ring-[#6D5CFF]/15';
const card = 'rounded-[20px] border border-slate-100 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`/api/admin/website-audit/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function WebMasterAgentScreen() {
  const router = useRouter();
  const [agent, setAgent] = useState<any>(null);
  const [extras, setExtras] = useState({ website_url: 'https://techantum.com', frequency: 'weekly' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState('');
  const [redirecting, setRedirecting] = useState('');

  useEffect(() => {
    api('webmaster/settings').then(setAgent).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
    try {
      const raw = localStorage.getItem(EXTRA_KEY);
      if (raw) setExtras((current) => ({ ...current, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
  }, []);

  function persistExtras(next: typeof extras) {
    setExtras(next);
    try { localStorage.setItem(EXTRA_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  async function save() {
    setSaving('save');
    setError('');
    try {
      persistExtras(extras);
      setAgent(await api('webmaster/settings', { method: 'POST', body: JSON.stringify(agent) }));
      setNotice('Agent settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving('');
    }
  }

  async function runTest() {
    setSaving('test');
    setRedirecting('Starting a test audit…');
    try {
      persistExtras(extras);
      const created = await api('audits', {
        method: 'POST',
        body: JSON.stringify({
          audit_name: 'Web Master test audit',
          website_url: extras.website_url,
          max_pages: Number(agent.max_ai_pages || 5),
          ai_enabled: agent.agent_enabled !== false,
          desktop_enabled: true,
          mobile_enabled: true,
          forms_enabled: true,
          audit_scope: 'website',
          environment: 'production',
        }),
      });
      saveScanSession({ id: created.id, url: extras.website_url, name: created.audit_name });
      router.push(`/admin/website-audit/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test audit failed');
      setSaving('');
      setRedirecting('');
    }
  }

  if (!agent) {
    return error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const enabled = agent.agent_enabled !== false;
  const checks = [
    { key: 'review_uiux', title: 'UI/UX Review', hint: 'Check design, usability and user experience issues.', wrap: 'bg-violet-50 border-violet-100', icon: 'SwatchIcon' },
    { key: 'review_content', title: 'Content Review', hint: 'Analyze page content, meta data and keywords.', wrap: 'bg-emerald-50 border-emerald-100', icon: 'DocumentTextIcon' },
    { key: 'review_images', title: 'Image Review', hint: 'Check image size, alt text and optimization.', wrap: 'bg-orange-50 border-orange-100', icon: 'PhotoIcon' },
    { key: 'review_seo_interpretation', title: 'SEO Interpretation', hint: 'Analyze SEO issues (based on best practices).', wrap: 'bg-sky-50 border-sky-100', icon: 'MagnifyingGlassIcon' },
  ];

  return (
    <div className="audit-fade relative space-y-4 pb-10">
      <PageRedirectLoader open={Boolean(redirecting)} label={redirecting} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-slate-400">
            <Link href="/admin" className="hover:text-slate-600">Home</Link><span className="px-1.5">›</span>
            <Link href="/admin/website-audit" className="hover:text-slate-600">Website Audit</Link><span className="px-1.5">›</span>Web Master Agent
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-slate-900">Web Master Agent</h1>
          <p className="mt-1 text-sm text-slate-400">Configure and run the AI agent to automatically audit your website and identify SEO, content and technical issues.</p>
        </div>
        <Link href="/admin/website-audit/history" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700">
          <Icon name="ClockIcon" size={16} /> View Audit History
        </Link>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className={card}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500"><Icon name="Cog6ToothIcon" size={16} /></span>
              Agent Configuration
            </h2>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className={`relative h-6 w-11 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-slate-200'}`}>
                <input type="checkbox" className="peer sr-only" checked={enabled} onChange={(e) => setAgent({ ...agent, agent_enabled: e.target.checked })} />
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-5' : 'left-0.5'}`} />
              </span>
              Agent Enabled {enabled ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">Active</span> : null}
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website URL *">
              <div className="relative">
                <Icon name="GlobeAltIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={`${inputClass} pl-9`} value={extras.website_url} onChange={(e) => persistExtras({ ...extras, website_url: e.target.value })} placeholder="https://techantum.com" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Enter your website URL including https://</p>
            </Field>
            <Field label="Audit frequency">
              <select className={inputClass} value={extras.frequency} onChange={(e) => persistExtras({ ...extras, frequency: e.target.value })}>
                <option value="manual">Manual</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">How often the agent should run automatically.</p>
            </Field>
            <Field label="Max pages to audit">
              <input type="number" className={inputClass} value={agent.max_ai_pages || 5} onChange={(e) => setAgent({ ...agent, max_ai_pages: Number(e.target.value) })} />
              <p className="mt-1 text-[11px] text-slate-400">Maximum number of pages to scan per run.</p>
            </Field>
            <Field label="AI model">
              <select className={inputClass} value={agent.ai_model || ''} onChange={(e) => setAgent({ ...agent, ai_model: e.target.value || null })}>
                <option value="">Uses AI Gateway (Default)</option>
                <option value="gpt-4o-mini">GPT-4o mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">AI model used for analysis.</p>
            </Field>
            <Field label="Confidence threshold">
              <div className="relative">
                <Icon name="ChartBarIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="number" step="0.05" min="0.1" max="1" className={`${inputClass} pl-9`} value={agent.confidence_threshold || 0.6} onChange={(e) => setAgent({ ...agent, confidence_threshold: Number(e.target.value) })} />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Minimum confidence score to flag an issue (0.1 – 1.0).</p>
            </Field>
            <Field label="Techantum standard version">
              <select className={inputClass} value={agent.techantum_standard_version || '1.0'} onChange={(e) => setAgent({ ...agent, techantum_standard_version: e.target.value })}>
                <option value="1.0">1.0</option>
                <option value="1.1">1.1</option>
              </select>
              <p className="mt-1 text-[11px] text-slate-400">Use Techantum audit rules and best practices.</p>
            </Field>
            <Field label="Content character limit">
              <input type="number" className={inputClass} value={agent.content_character_limit || 2000} onChange={(e) => setAgent({ ...agent, content_character_limit: Number(e.target.value) })} />
              <p className="mt-1 text-[11px] text-slate-400">Maximum characters to analyze per page.</p>
            </Field>
          </div>

          <h3 className="mb-3 mt-6 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-500"><Icon name="Squares2X2Icon" size={16} /></span>
            Audit Checks
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {checks.map((item) => (
              <label key={item.key} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 ${item.wrap}`}>
                <input type="checkbox" className="mt-1 accent-[#6D5CFF]" checked={agent[item.key] !== false} onChange={(e) => setAgent({ ...agent, [item.key]: e.target.checked })} />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{item.title}</span>
                  <span className="text-[12px] text-slate-500">{item.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <BusyButton busy={saving === 'test'} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700" onClick={() => void runTest()}>
              <Icon name="PlayIcon" size={16} /> Run Test Audit
            </BusyButton>
            <BusyButton busy={saving === 'save'} className="inline-flex h-11 items-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white" onClick={() => void save()}>
              <Icon name="BoltIcon" size={16} /> Save Agent Settings
            </BusyButton>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Run a quick test to validate settings. Analysis is rules-first; the agent reviews compact evidence only.</p>
        </section>

        <aside className="space-y-4">
          <section className={`${card} bg-sky-50/60`}>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Icon name="SparklesIcon" size={18} className="text-sky-500" /> How Web Master Agent Works</h3>
            <p className="mt-2 text-sm text-slate-500">The AI agent scans your website, analyzes key SEO and content elements, and identifies issues so you can take action.</p>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              {['Crawls the website pages', 'Analyzes each page', 'Identifies issues', 'Generates a report'].map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[11px] font-semibold text-white">{index + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
          </section>
          <section className={`${card} bg-emerald-50/70`}>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Icon name="LightBulbIcon" size={18} className="text-emerald-500" /> Best Practices</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {['Start with 50–100 pages for medium websites', 'Use confidence threshold between 0.5 – 0.7', 'Keep content limit at 2000 characters', 'Run weekly or monthly for regular monitoring', 'Review and share reports with your team'].map((item) => (
                <li key={item} className="flex gap-2"><Icon name="CheckCircleIcon" size={16} className="mt-0.5 text-emerald-500" />{item}</li>
              ))}
            </ul>
          </section>
          <section className={`${card} bg-violet-50/70`}>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900"><Icon name="QuestionMarkCircleIcon" size={18} className="text-violet-500" /> Need Help?</h3>
            <p className="mt-2 text-sm text-slate-500">Learn more about audit checks, settings and how to interpret the results.</p>
            <Link href="/admin/website-audit/standards" className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-violet-600 ring-1 ring-violet-100">
              <Icon name="BookOpenIcon" size={16} /> View Documentation
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{children}</label>;
}
