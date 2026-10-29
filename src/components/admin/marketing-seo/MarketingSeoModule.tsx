'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
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

function Card({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 font-bricolage text-2xl font-semibold text-slate-900">{value ?? '—'}</p>
    </div>
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
  const [keywordForm, setKeywordForm] = useState({ keyword: '', usage_type: 'seo', service_category: 'website-development', is_negative: false });
  const [assetForm, setAssetForm] = useState({ asset_type: 'headline', text: '', service_category: 'general' });
  const [draft, setDraft] = useState<any>({ name: '', landing_page: 'https://techantum.com/', headline_ids: [], description_ids: [], keyword_ids: [], negative_keyword_ids: [], callout_ids: [], sitelink_ids: [] });
  const [filter, setFilter] = useState('');
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
  const visibleKeywords = keywords.filter((row) => `${row.keyword} ${row.service_category}`.toLowerCase().includes(filter.toLowerCase()));
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

  const snippetTitle = selectedPage?.title || selectedPage?.name || 'Page title';
  const snippetDesc = selectedPage?.description || 'Meta description appears here.';

  const metric = (value: unknown) => (value == null || value === 'Not Connected' ? 'Not Connected' : String(value));

  return (
    <div className="w-full space-y-5">
      <AdminPageHeader
        title="SEO & Google Ads"
        description="Monitor site health, keywords, and reusable Google Ads assets. Live ads are never published from this workspace."
      />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-100 bg-white p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${tab === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card label="SEO Health Score" value={overview.healthScore ?? 'Not run'} />
            <Card label="Indexed Pages" value={metric(overview.indexedPages)} />
            <Card label="SEO Issues Pending" value={overview.issuesPending} />
            <Card label="Organic Search Clicks" value={metric(overview.organicClicks)} />
            <Card label="Saved SEO Keywords" value={overview.seoKeywords} />
            <Card label="Saved Google Ads Keywords" value={overview.adsKeywords} />
            <Card label="Saved Ad Assets" value={overview.adAssets} />
            <Card label="Campaign Drafts" value={overview.campaignDrafts} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-100 bg-white p-5">
              <h2 className="font-bricolage text-lg font-semibold">SEO Status</h2>
              <p className="mt-1 text-sm text-slate-500">Last audit {overview.lastAuditAt ? new Date(overview.lastAuditAt).toLocaleString() : 'has not run yet'}.</p>
              <ul className="mt-3 space-y-2 text-sm">
                {(audit?.issues || []).filter((row: any) => row.status === 'failed').slice(0, 6).map((row: any) => (
                  <li key={row.id} className="rounded-xl bg-rose-50 px-3 py-2 text-rose-900">{row.check_name}: {row.issue_description}</li>
                ))}
                {!audit?.issues?.some((row: any) => row.status === 'failed') ? <li className="text-slate-500">No failed checks in the latest run.</li> : null}
              </ul>
            </section>
            <section className="rounded-2xl border border-slate-100 bg-white p-5">
              <h2 className="font-bricolage text-lg font-semibold">Search Performance</h2>
              {overview.gsc?.connected && overview.snapshot ? (
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-slate-400">Clicks</dt><dd className="font-semibold">{overview.snapshot.clicks}</dd></div>
                  <div><dt className="text-slate-400">Impressions</dt><dd className="font-semibold">{overview.snapshot.impressions}</dd></div>
                  <div><dt className="text-slate-400">CTR</dt><dd className="font-semibold">{overview.snapshot.ctr}</dd></div>
                  <div><dt className="text-slate-400">Avg position</dt><dd className="font-semibold">{overview.snapshot.position}</dd></div>
                </dl>
              ) : <p className="mt-2 text-sm text-slate-500">Data unavailable until Search Console is connected.</p>}
            </section>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton variant="primary" loading={busy === 'audit'} onClick={() => run('audit', async () => { await api('audit/run', { method: 'POST', body: '{}' }); setTab('audit'); })}>Run SEO Audit</AdminButton>
            <AdminButton onClick={() => setTab('keywords')}>Add Keyword</AdminButton>
            <AdminButton onClick={() => setTab('ads')}>Add Ad Asset</AdminButton>
            <AdminButton onClick={() => setTab('campaigns')}>Create Ad Draft</AdminButton>
            <a className="btn-secondary" href="/sitemap.xml" target="_blank" rel="noreferrer">View Sitemap</a>
            <a className="btn-secondary" href="/robots.txt" target="_blank" rel="noreferrer">View Robots.txt</a>
            <AdminButton onClick={() => setTab('integrations')}>Connect Search Console</AdminButton>
          </div>
        </div>
      ) : null}

      {tab === 'audit' ? (
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bricolage text-lg font-semibold">Technical SEO audit</h2>
              <p className="text-sm text-slate-500">Automatic checks are separate from manual task status. Completing a task does not mark the issue verified.</p>
            </div>
            <AdminButton variant="primary" loading={busy === 'audit'} onClick={() => run('audit', async () => { await api('audit/run', { method: 'POST', body: '{}' }); })}>Re-run checks</AdminButton>
          </div>
          <p className="text-xs text-slate-400">Last successful audit: {audit?.run?.finished_at ? new Date(audit.run.finished_at).toLocaleString() : 'Never'} · Health {audit?.run?.health_score ?? '—'}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>{['Check', 'URL', 'Status', 'Priority', 'Task', 'Action'].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {(audit?.issues || []).map((row: any) => (
                  <tr key={row.id} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-3 font-medium">{row.check_name}</td>
                    <td className="py-2 pr-3 text-xs text-slate-500">{row.affected_url}</td>
                    <td className="py-2 pr-3">{row.status}</td>
                    <td className="py-2 pr-3">{row.priority}</td>
                    <td className="py-2 pr-3">{row.fix_status}</td>
                    <td className="py-2 pr-3">
                      <select className={inputClass} value={row.fix_status} onChange={(event) => run('issue', async () => { await api('audit/issues', { method: 'PATCH', body: JSON.stringify({ id: row.id, fix_status: event.target.value }) }); })}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed_manual">Completed (manual)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'pages' ? (
        <div className="grid gap-5 xl:grid-cols-[18rem_1fr]">
          <aside className="rounded-2xl border border-slate-100 bg-white p-3">
            {pages.map((page) => (
              <button key={page.path} type="button" onClick={() => setSelectedPage(page)} className={`block w-full rounded-xl px-3 py-2 text-left text-sm ${selectedPage?.path === page.path ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                {page.name}<span className="block text-xs opacity-70">{page.path}</span>
              </button>
            ))}
          </aside>
          {selectedPage ? (
            <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-emerald-700">techantum.com{selectedPage.path === '/' ? '' : selectedPage.path}</p>
                <p className="text-lg text-sky-800">{snippetTitle}</p>
                <p className="text-sm text-slate-600">{snippetDesc}</p>
                <p className="mt-1 text-xs text-slate-400">Title {String(snippetTitle).length}/60 · Description {String(snippetDesc).length}/160</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">SEO title<input className={`${inputClass} mt-1`} value={selectedPage.title || ''} onChange={(event) => setSelectedPage({ ...selectedPage, title: event.target.value })} /></label>
                <label className="text-sm">Primary keyword<input className={`${inputClass} mt-1`} value={selectedPage.primary_keyword || ''} onChange={(event) => setSelectedPage({ ...selectedPage, primary_keyword: event.target.value })} /></label>
                <label className="text-sm sm:col-span-2">Meta description<textarea className={`${areaClass} mt-1`} rows={3} value={selectedPage.description || ''} onChange={(event) => setSelectedPage({ ...selectedPage, description: event.target.value })} /></label>
                <label className="text-sm">Canonical URL<input className={`${inputClass} mt-1`} value={selectedPage.canonical_url || ''} onChange={(event) => setSelectedPage({ ...selectedPage, canonical_url: event.target.value })} /></label>
                <label className="text-sm">OG image<input className={`${inputClass} mt-1`} value={selectedPage.og_image_url || ''} onChange={(event) => setSelectedPage({ ...selectedPage, og_image_url: event.target.value })} /></label>
                <label className="text-sm">OG title<input className={`${inputClass} mt-1`} value={selectedPage.og_title || ''} onChange={(event) => setSelectedPage({ ...selectedPage, og_title: event.target.value })} /></label>
                <label className="text-sm">OG description<input className={`${inputClass} mt-1`} value={selectedPage.og_description || ''} onChange={(event) => setSelectedPage({ ...selectedPage, og_description: event.target.value })} /></label>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton onClick={() => run('page', async () => { await api('pages', { method: 'POST', body: JSON.stringify({ ...selectedPage, publish_state: 'draft' }) }); setMessage('Draft saved. Public HTML is unchanged until you publish.'); })}>Save Draft</AdminButton>
                <AdminButton variant="primary" onClick={() => run('page', async () => { const saved = await api('pages', { method: 'POST', body: JSON.stringify({ ...selectedPage, publish_state: 'published' }) }); setSelectedPage(saved); setMessage('Published. This metadata is now used on the live page.'); })}>Publish</AdminButton>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'keywords' ? (
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5">
          <div className="grid gap-2 md:grid-cols-5">
            <input className={inputClass} placeholder="Keyword" value={keywordForm.keyword} onChange={(event) => setKeywordForm({ ...keywordForm, keyword: event.target.value })} />
            <select className={inputClass} value={keywordForm.usage_type} onChange={(event) => setKeywordForm({ ...keywordForm, usage_type: event.target.value })}>
              <option value="seo">SEO</option>
              <option value="ads">Google Ads</option>
              <option value="both">Both</option>
            </select>
            <select className={inputClass} value={keywordForm.service_category} onChange={(event) => setKeywordForm({ ...keywordForm, service_category: event.target.value })}>
              {categories.map((item: any) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={keywordForm.is_negative} onChange={(event) => setKeywordForm({ ...keywordForm, is_negative: event.target.checked })} /> Negative</label>
            <AdminButton variant="primary" onClick={() => run('keyword', async () => { await api('keywords', { method: 'POST', body: JSON.stringify(keywordForm) }); setKeywordForm({ ...keywordForm, keyword: '' }); })}>Add Keyword</AdminButton>
          </div>
          <input className={inputClass} placeholder="Search keywords" value={filter} onChange={(event) => setFilter(event.target.value)} />
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400"><tr>{['Keyword', 'Type', 'Category', 'Priority', 'Negative', ''].map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
              <tbody>
                {visibleKeywords.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-medium">{row.keyword}{row.is_favorite ? ' ★' : ''}</td>
                    <td className="py-2 pr-3">{row.usage_type}</td>
                    <td className="py-2 pr-3">{row.service_category}</td>
                    <td className="py-2 pr-3">{row.priority}</td>
                    <td className="py-2 pr-3">{row.is_negative ? 'Yes' : ''}</td>
                    <td className="py-2 pr-3">
                      <button className="text-sky-700" type="button" onClick={() => run('fav', async () => { await api('keywords', { method: 'PATCH', body: JSON.stringify({ ...row, is_favorite: !row.is_favorite }) }); })}>Favorite</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <a className="text-sm text-sky-700" href="/api/admin/marketing-seo/keywords/export">Export CSV</a>
        </section>
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
