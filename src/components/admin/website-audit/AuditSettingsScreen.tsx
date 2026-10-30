'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BusyButton } from './AuditBusy';
import { DEFAULT_SETTINGS } from '@/lib/website-audit/defaults';

const EXTRA_KEY = 'techantum.audit.settings.extras';
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

export default function AuditSettingsScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [extras, setExtras] = useState({
    environment: 'production',
    crawl: 'internal',
    user_agent: 'Techantum Audit Bot (default)',
    schedule_enabled: false,
    frequency: 'weekly',
    day_time: 'Monday, 09:00 AM',
    model_override: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([api('settings'), api('webmaster/settings')])
      .then(([nextSettings, nextAgent]) => {
        setSettings(nextSettings);
        setAgent(nextAgent);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
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
    setSaving(true);
    setError('');
    try {
      persistExtras(extras);
      const [nextSettings, nextAgent] = await Promise.all([
        api('settings', { method: 'POST', body: JSON.stringify(settings) }),
        api('webmaster/settings', { method: 'POST', body: JSON.stringify({ ...agent, ai_model: extras.model_override || agent.ai_model }) }),
      ]);
      setSettings(nextSettings);
      setAgent(nextAgent);
      setNotice('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    setSettings({ ...DEFAULT_SETTINGS });
    persistExtras({
      environment: 'production',
      crawl: 'internal',
      user_agent: 'Techantum Audit Bot (default)',
      schedule_enabled: false,
      frequency: 'weekly',
      day_time: 'Monday, 09:00 AM',
      model_override: '',
    });
  }

  if (!settings || !agent) {
    return error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  const scopes = [
    { key: 'ai_review_enabled', title: 'AI review (Recommended)', hint: 'Use AI to analyze content, design and identify issues.', icon: 'SparklesIcon', wrap: 'text-violet-500' },
    { key: 'lighthouse_enabled', title: 'Lighthouse / Performance', hint: 'Check performance, speed and Core Web Vitals.', icon: 'BoltIcon', wrap: 'text-emerald-500' },
    { key: 'accessibility_enabled', title: 'Accessibility', hint: 'Check WCAG accessibility standards.', icon: 'EyeIcon', wrap: 'text-sky-500' },
    { key: 'forms_enabled', title: 'Forms', hint: 'Validate forms and input fields.', icon: 'ClipboardDocumentListIcon', wrap: 'text-orange-500' },
    { key: 'review_content', title: 'Content review', hint: 'Analyze page content, meta data and keywords.', icon: 'DocumentTextIcon', wrap: 'text-fuchsia-500', agent: true },
    { key: 'review_images', title: 'Image review', hint: 'Check image size, alt text and optimization.', icon: 'PhotoIcon', wrap: 'text-pink-500', agent: true },
    { key: 'review_seo_interpretation', title: 'SEO interpretation', hint: 'Provide SEO insights based on best practices.', icon: 'LinkIcon', wrap: 'text-violet-500', agent: true },
  ];

  return (
    <div className="audit-fade space-y-4 pb-10">
      <div>
        <p className="text-[12px] text-slate-400">
          <Link href="/admin" className="hover:text-slate-600">Home</Link><span className="px-1.5">›</span>
          <Link href="/admin/website-audit" className="hover:text-slate-600">Website Audit</Link><span className="px-1.5">›</span>Settings
        </p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-slate-900">Website Audit Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Configure how the AI agent scans your website and what to include in the audit.</p>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className={card}>
            <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500"><Icon name="Cog6ToothIcon" size={16} /></span>
              General Settings
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default maximum pages" hint="Default number of pages to scan for a new audit.">
                <input type="number" className={inputClass} value={settings.default_max_pages} onChange={(e) => setSettings({ ...settings, default_max_pages: Number(e.target.value) })} />
              </Field>
              <Field label="Maximum allowed pages" hint="Maximum limit for manual or scheduled audits.">
                <input type="number" className={inputClass} value={settings.max_pages} onChange={(e) => setSettings({ ...settings, max_pages: Number(e.target.value) })} />
              </Field>
              <Field label="AI visual pages" hint="Number of pages to analyze with AI for visual review (UI/UX).">
                <input type="number" className={inputClass} value={settings.ai_max_pages} onChange={(e) => setSettings({ ...settings, ai_max_pages: Number(e.target.value) })} />
              </Field>
              <Field label="Confidence threshold" hint="Minimum confidence score to flag an issue (0.1 – 1.0).">
                <input type="number" step="0.05" min="0.1" max="1" className={inputClass} value={settings.ai_confidence_threshold} onChange={(e) => setSettings({ ...settings, ai_confidence_threshold: Number(e.target.value) })} />
              </Field>
            </div>
          </section>

          <section className={card}>
            <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-500"><Icon name="CpuChipIcon" size={16} /></span>
              AI & Model Settings
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="AI model" hint="AI model used for website analysis.">
                <select className={inputClass} value={agent.ai_model || ''} onChange={(e) => setAgent({ ...agent, ai_model: e.target.value })}>
                  <option value="">Uses AI Gateway (Default)</option>
                  <option value="gpt-4o-mini">GPT-4o mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                </select>
              </Field>
              <Field label="AI model override (Optional)" hint="Override the default model if required.">
                <input className={inputClass} value={extras.model_override} onChange={(e) => persistExtras({ ...extras, model_override: e.target.value })} placeholder="Auto (Recommended)" />
              </Field>
            </div>
          </section>

          <section className={card}>
            <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-500"><Icon name="GlobeAltIcon" size={16} /></span>
              Environment & Crawl Settings
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Environment" hint="Select the environment for audits.">
                <select className={inputClass} value={extras.environment} onChange={(e) => persistExtras({ ...extras, environment: e.target.value })}>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </Field>
              <Field label="Crawl behavior" hint="Choose how the agent should crawl your website.">
                <select className={inputClass} value={extras.crawl} onChange={(e) => persistExtras({ ...extras, crawl: e.target.value })}>
                  <option value="internal">Follow internal links only</option>
                  <option value="selected">Selected URLs only</option>
                </select>
              </Field>
              <Field label="User agent" hint="Identifies the bot during crawling (optional).">
                <input className={inputClass} value={extras.user_agent} onChange={(e) => persistExtras({ ...extras, user_agent: e.target.value })} />
              </Field>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className={`${card} bg-sky-50/50`}>
            <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <Icon name="AdjustmentsHorizontalIcon" size={18} className="text-sky-500" /> Audit Scope
            </h2>
            <p className="mb-3 text-sm text-slate-500">Select what areas to include in the website audit.</p>
            <div className="space-y-2">
              {scopes.map((item) => {
                const checked = item.agent ? agent[item.key] !== false : Boolean(settings[item.key]);
                return (
                  <label key={item.key} className="flex cursor-pointer gap-3 rounded-xl bg-white/80 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[#6D5CFF]"
                      checked={checked}
                      onChange={(e) => {
                        if (item.agent) setAgent({ ...agent, [item.key]: e.target.checked });
                        else setSettings({ ...settings, [item.key]: e.target.checked });
                      }}
                    />
                    <span>
                      <span className={`flex items-center gap-1.5 text-sm font-semibold text-slate-800`}><Icon name={item.icon} size={14} className={item.wrap} />{item.title}</span>
                      <span className="text-[12px] text-slate-500">{item.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
          <section className={`${card} bg-emerald-50/60`}>
            <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <Icon name="CalendarDaysIcon" size={18} className="text-emerald-500" /> Schedule (Optional)
            </h2>
            <p className="text-sm text-slate-500">Automate audits to run regularly.</p>
            <label className="mt-3 flex items-center justify-between text-sm">
              Enable scheduled audits
              <span className={`relative h-6 w-11 rounded-full ${extras.schedule_enabled ? 'bg-emerald-400' : 'bg-slate-200'}`}>
                <input type="checkbox" className="sr-only" checked={extras.schedule_enabled} onChange={(e) => persistExtras({ ...extras, schedule_enabled: e.target.checked })} />
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${extras.schedule_enabled ? 'left-5' : 'left-0.5'}`} />
              </span>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select className={inputClass} value={extras.frequency} onChange={(e) => persistExtras({ ...extras, frequency: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select className={inputClass} value={extras.day_time} onChange={(e) => persistExtras({ ...extras, day_time: e.target.value })}>
                <option>Monday, 09:00 AM</option>
                <option>Tuesday, 09:00 AM</option>
                <option>Friday, 06:00 PM</option>
              </select>
            </div>
          </section>
        </aside>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium" onClick={() => void reset()}>Reset to Default</button>
        <BusyButton busy={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-secondary px-5 text-sm font-semibold text-white" onClick={() => void save()}>
          Save Settings
        </BusyButton>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      {children}
      {hint ? <span className="mt-1 block text-[11px] font-normal text-slate-400">{hint}</span> : null}
    </label>
  );
}
