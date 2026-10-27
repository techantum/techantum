'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';

const SAMPLE_HEAD = `<!-- Example: Google Analytics (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>`;

const SAMPLE_FOOTER = `<!-- Example: Chat widget -->
<script>
  (function(w, d, s, u) {
    w.__chatWidget = w.__chatWidget || function () { (w.__chatWidget.q = w.__chatWidget.q || []).push(arguments); };
    var h = d.getElementsByTagName(s)[0], t = d.createElement(s);
    t.async = true; t.src = u;
    h.parentNode.insertBefore(t, h);
  })(window, document, 'script', 'https://example.com/widget.js');
</script>`;

export default function CustomScriptsPage() {
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [headerOn, setHeaderOn] = useState(true);
  const [footerOn, setFooterOn] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    fetch('/api/admin/scripts')
      .then((r) => r.json())
      .then((data) => {
        setHeader(data.header_scripts || '');
        setFooter(data.footer_scripts || '');
        setHeaderOn(data.header_scripts_enabled !== false);
        setFooterOn(data.footer_scripts_enabled !== false);
        setUpdatedAt(data.scripts_updated_at || data.updated_at || '');
        setUpdatedBy(data.scripts_updated_by || 'Super Admin');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/scripts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header_scripts: header,
          footer_scripts: footer,
          header_scripts_enabled: headerOn,
          footer_scripts_enabled: footerOn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setUpdatedAt(data.scripts_updated_at || new Date().toISOString());
      setUpdatedBy(data.scripts_updated_by || 'Super Admin');
      setMessage('Scripts saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading scripts…</p>;

  return (
    <div className="w-full space-y-5">
      <AdminPageHeader
        kicker="Settings"
        title="Custom Scripts"
        description="Manage global code snippets that are added to the website head tag and footer/body-end tag. Use this to add analytics, chat widgets, verification tags, or other custom scripts across the entire site."
        action={
          <div className="flex gap-2">
            <AdminButton onClick={load}>Reset</AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={save}>
              <Icon name="ArrowDownTrayIcon" size={16} /> Save changes
            </AdminButton>
          </div>
        }
      />
      {message ? <p className={`text-sm ${message.toLowerCase().includes('fail') ? 'text-rose-600' : 'text-emerald-700'}`}>{message}</p> : null}

      <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">Common use cases</p>
        <p className="mt-1 text-amber-800/90">Add code snippets for Google Analytics, Meta Pixel, Search Console verification, chat widgets, custom CSS/JS embeds, or any other third-party integrations.</p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="CodeBracketIcon" size={16} className="text-secondary" /> Head Tag Scripts
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Global</span>
              </p>
              <span className="text-xs text-slate-400">All pages</span>
            </div>
            <p className="px-4 pt-2 text-xs text-slate-500">Injected inside &lt;head&gt; on all pages.</p>
            <textarea
              spellCheck={false}
              className="mt-2 min-h-[220px] w-full resize-y border-0 bg-[#0f172a] px-4 py-3 font-mono text-xs leading-5 text-emerald-200 outline-none placeholder:text-emerald-200/50"
              value={header}
              placeholder={SAMPLE_HEAD}
              onChange={(event) => setHeader(event.target.value)}
            />
            <p className="px-4 py-2 text-[11px] text-slate-400">Use for meta verification tags, analytics, structured data, CSS links, or third-party head scripts.</p>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Icon name="CodeBracketIcon" size={16} className="text-secondary" /> Footer / End of Body Scripts
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Global</span>
              </p>
              <span className="text-xs text-slate-400">All pages</span>
            </div>
            <p className="px-4 pt-2 text-xs text-slate-500">Injected before &lt;/body&gt; on all pages.</p>
            <textarea
              spellCheck={false}
              className="mt-2 min-h-[200px] w-full resize-y border-0 bg-[#0f172a] px-4 py-3 font-mono text-xs leading-5 text-sky-200 outline-none placeholder:text-sky-200/50"
              value={footer}
              placeholder={SAMPLE_FOOTER}
              onChange={(event) => setFooter(event.target.value)}
            />
            <p className="px-4 py-2 text-[11px] text-slate-400">Use for chat widgets, tracking pixels, footer JavaScript, or other deferred integrations.</p>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="BookOpenIcon" size={16} className="text-secondary" /> Script Guidelines
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" /> Only paste trusted code from reliable sources.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" /> These scripts will be added to the entire website (all pages).</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" /> Avoid adding duplicate tracking codes.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" /> Use head scripts for meta tags, analytics, structured data, or CSS.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" /> Use footer scripts for chat widgets, tracking pixels, or deferred JavaScript.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" /> Test your changes after publishing to ensure everything works correctly.</li>
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Icon name="Cog6ToothIcon" size={16} className="text-secondary" /> Script Settings
            </h3>
            <label className="mt-4 flex items-center justify-between text-sm">
              Enable head scripts
              <button type="button" role="switch" aria-checked={headerOn} onClick={() => setHeaderOn(!headerOn)} className={`relative h-6 w-11 rounded-full ${headerOn ? 'bg-secondary' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${headerOn ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
            <p className="mt-1 text-[11px] text-slate-400">Add head tag scripts to your website.</p>
            <label className="mt-4 flex items-center justify-between text-sm">
              Enable footer scripts
              <button type="button" role="switch" aria-checked={footerOn} onClick={() => setFooterOn(!footerOn)} className={`relative h-6 w-11 rounded-full ${footerOn ? 'bg-secondary' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${footerOn ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>
            <p className="mt-1 text-[11px] text-slate-400">Add footer/body-end scripts to your website.</p>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
            <h3 className="flex items-center gap-2 font-semibold">
              <Icon name="ClockIcon" size={16} className="text-secondary" /> Last Updated
            </h3>
            <dl className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between"><dt>Updated on</dt><dd>{updatedAt ? new Date(updatedAt).toLocaleString('en-IN') : '—'}</dd></div>
              <div className="flex justify-between"><dt>Updated by</dt><dd>{updatedBy || 'Super Admin'}</dd></div>
              <div className="flex justify-between"><dt>Status</dt><dd className="text-emerald-600">● Active</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
