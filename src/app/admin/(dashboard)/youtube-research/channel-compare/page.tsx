'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import {
  DATE_PRESETS,
  EMPTY_FILTERS,
  HorizontalMetricBars,
  TimeViewsChart,
  VIDEO_SORTS,
  applyPreset,
  downloadProjectExport,
  handleLabel,
  type ResearchFilterOptions,
  type ResearchFilterState,
} from '@/components/admin/youtube/research-ui';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { allow, metric, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, useYoutubeRailActions, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import { formatAgo, projectInitials } from '@/lib/youtube/home-display';
import { MAX_PROJECT_COMPETITORS } from '@/lib/youtube/workspace-nav';

const selectClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800';
const VIEW_BUCKETS = [
  { id: '', label: 'Any views', min: '', max: '' },
  { id: '1k', label: '1K+ views', min: '1000', max: '' },
  { id: '10k', label: '10K+ views', min: '10000', max: '' },
  { id: '100k', label: '100K+ views', min: '100000', max: '' },
];
const LENGTH_BUCKETS = [
  { id: '', label: 'Any length', min: '', max: '', content: '' },
  { id: 'short', label: 'Shorts', min: '', max: '', content: 'short' },
  { id: 'video', label: 'Videos', min: '', max: '', content: 'video' },
  { id: '1m', label: 'Under 1 min', min: '', max: '60', content: '' },
  { id: '8m', label: '1–8 min', min: '60', max: '480', content: '' },
  { id: 'long', label: '8+ min', min: '480', max: '', content: '' },
];

function actionsPerThousandViews(actions: number | null | undefined, views: number | null | undefined) {
  if (actions == null || views == null || views <= 0) return null;
  return Math.round((actions / views) * 1000 * 10) / 10;
}

function compactMetric(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  const abs = Math.abs(number);
  if (abs >= 1_00_00_000) return `${(number / 1_00_00_000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (abs >= 1_00_000) return `${(number / 1_00_000).toFixed(1).replace(/\.0$/, '')}L`;
  if (abs >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return Math.round(number).toLocaleString('en-IN');
}

function queryFrom(filters: ResearchFilterState & { minViews?: string; minDuration?: string; maxDuration?: string }, ids: string[]) {
  const params = new URLSearchParams({
    q: filters.q || '',
    channelIds: (filters.channelIds || ids.join(',')),
    topicId: filters.topicId || '',
    tag: filters.tag || '',
    categoryId: filters.categoryId || '',
    from: filters.from || '',
    to: filters.to || '',
    content: filters.content || '',
    placement: filters.placement || '',
    minViews: filters.minViews || '',
    minDuration: filters.minDuration || '',
    maxDuration: filters.maxDuration || '',
    sort: filters.sort || 'view_count',
  });
  return params.toString();
}

function bucketLabel(value: string, grain?: string) {
  if (grain !== 'week') return value;
  const weeks = Math.round((Date.now() - new Date(value).getTime()) / (7 * 86_400_000));
  if (weeks <= 0) return 'Now';
  return `${weeks}w`;
}

function weeksInRange(from?: string, to?: string) {
  if (!from || !to) return 0;
  return Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / (7 * 86_400_000));
}

function ChannelSetup({
  channels,
  analyses,
  manage,
  base,
  projectId,
  onChanged,
}: {
  channels: Record<string, any>[];
  analyses: Record<string, any>[];
  manage: boolean;
  base: string;
  projectId: string;
  onChanged: () => Promise<unknown>;
}) {
  const own = channels.find((channel) => channel.relationship === 'own');
  const competitors = channels.filter((channel) => channel.relationship === 'competitor');
  const imported = channels.reduce((sum, channel) => sum + Number(channel.videos_imported || 0), 0);
  const [addInput, setAddInput] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const setup = [
    { key: 'own', label: 'Own channel', detail: own ? 'Connected' : 'Not connected', done: Boolean(own) },
    { key: 'competitors', label: 'Competitors', detail: `${competitors.length} of ${MAX_PROJECT_COMPETITORS}`, done: competitors.length > 0 },
    { key: 'import', label: 'Import videos', detail: imported ? `${imported} imported` : 'None imported', done: imported > 0 },
    { key: 'analysis', label: 'Run AI analysis', detail: analyses.length ? `${analyses.length} saved` : 'Not started', done: analyses.length > 0 },
  ];
  const addCompetitor = async () => {
    if (!addInput.trim()) return;
    setBusy('add');
    setError('');
    try {
      await yt(`projects/${projectId}/channels`, { method: 'POST', body: JSON.stringify({ input: addInput.trim(), relationship: 'competitor' }) });
      setAddInput('');
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the channel');
    } finally {
      setBusy('');
    }
  };
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Research setup · {setup.filter((item) => item.done).length} of {setup.length}</p>
          <p className="text-xs text-slate-500">Add competitors, import videos, then run this analysis.</p>
        </div>
        <Link className={partnerBtnSecondary} href={`${base}/channels?from=analysis&add=competitor`}>Add competitor</Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {setup.map((step) => (
          <div key={step.key}>
            <div className={`h-1 rounded-full ${step.done ? 'bg-secondary' : 'bg-slate-200'}`} />
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{step.label}</p>
            <p className="text-sm text-slate-700">{step.detail}</p>
          </div>
        ))}
      </div>
      {manage ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-dashed border-slate-200 pt-3 sm:flex-row sm:items-center">
          <input id="add-competitor" className={`${partnerInput} sm:max-w-md`} placeholder="Paste a YouTube channel URL or @handle" value={addInput} onChange={(event) => setAddInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCompetitor(); } }} />
          <AdminButton variant="primary" loading={busy === 'add'} disabled={competitors.length >= MAX_PROJECT_COMPETITORS} onClick={addCompetitor}>Add</AdminButton>
          <p className="sm:ml-auto text-xs text-slate-400">Up to {MAX_PROJECT_COMPETITORS} competitors per project</p>
        </div>
      ) : null}
    </section>
  );
}

function AnalysisDetail() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const router = useRouter();
  const search = useSearchParams();
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const canImport = allow(access, 'youtube_research.videos.import');
  const canExport = allow(access, 'youtube_research.reports.export');
  const preset = DATE_PRESETS.find((item) => item.id === '90') || DATE_PRESETS[2];
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, any>[]>([]);
  const [filterOptions, setFilterOptions] = useState<ResearchFilterOptions>({});
  const [filters, setFilters] = useState<ResearchFilterState & { minViews?: string; minDuration?: string; maxDuration?: string }>({ ...EMPTY_FILTERS, ...applyPreset(preset.id), sort: 'view_count' });
  const [range, setRange] = useState(preset.id);
  const [insights, setInsights] = useState<Record<string, any> | null>(null);
  const [compared, setCompared] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const manageView = search?.get('manage') === '1';

  useEffect(() => {
    if (manageView) router.replace(`${base}/channels?from=analysis`);
  }, [manageView, base, router]);

  const idsFor = (next = filters, channelRows = channels) => {
    if (next.channelIds) return channelRows.filter((channel) => channel.id === next.channelIds).map((channel) => channel.id);
    return channelRows.map((channel) => channel.id);
  };

  const load = useCallback(async (next = filters, channelRows = channels) => {
    const ids = idsFor(next, channelRows);
    const query = queryFrom(next, ids);
    const [insightBody, compareBody] = await Promise.all([
      ids.length ? yt(`projects/${projectId}/insights?${query}`) : Promise.resolve(null),
      ids.length ? yt(`projects/${projectId}/compare/channels?${query}`) : Promise.resolve({ channels: [] }),
    ]);
    setInsights(insightBody);
    setCompared(compareBody.channels || []);
    return insightBody;
  }, [channels, filters, projectId]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      try {
        const [channelRows, listed, options] = await Promise.all([
          yt(`projects/${projectId}/channels`),
          yt(`projects/${projectId}/ai-analyses`).catch(() => ({ rows: [] })),
          yt(`projects/${projectId}/filters`).catch(() => ({})),
        ]);
        setChannels(channelRows);
        setAnalyses(listed.rows || listed || []);
        setFilterOptions(options);
        await load(filters, channelRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load analysis');
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const apply = async (next = filters) => {
    setLoading(true);
    setError('');
    try {
      setFilters(next);
      await load(next);
      const options = await yt(`projects/${projectId}/filters${next.channelIds ? `?channelIds=${next.channelIds}` : ''}`);
      setFilterOptions(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply filters');
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    if (!canImport || !channels.length) return;
    setBusy('fetch');
    setError('');
    try {
      await yt(`projects/${projectId}/import`, { method: 'POST', body: JSON.stringify({ mode: 'available', channel_ids: channels.map((channel) => channel.id) }) });
      setMessage('Public videos were fetched from YouTube.');
      const channelRows = await yt(`projects/${projectId}/channels`);
      setChannels(channelRows);
      await apply(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch videos');
    } finally {
      setBusy('');
    }
  };

  const exportRows = useCallback(async () => {
    setBusy('export');
    setError('');
    try {
      await downloadProjectExport({
        type: 'videos',
        format: 'xlsx',
        projectId,
        channelIds: idsFor(),
        ...filters,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export');
    } finally {
      setBusy('');
    }
  }, [filters, projectId, channels]);

  const saveReport = async () => {
    const videoIds = (insights?.topVideos || []).map((video: Record<string, any>) => video.id).filter(Boolean).slice(0, 12);
    if (!videoIds.length) {
      setError('Import videos before saving a report.');
      return;
    }
    setBusy('report');
    setError('');
    try {
      const analysis = await yt(`projects/${projectId}/ai-analyses`, {
        method: 'POST',
        body: JSON.stringify({
          name: `Channel analysis · ${insights?.imported || videoIds.length} videos`,
          goals: ['views', 'engagement'],
          video_ids: videoIds,
        }),
      });
      await yt(`projects/${projectId}/research-reports`, {
        method: 'POST',
        body: JSON.stringify({
          name: `Channel analysis · ${new Date().toISOString().slice(0, 10)}`,
          report_type: 'competitor',
          analysis_id: analysis.id,
        }),
      });
      router.push(`${base}/reports`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the report');
    } finally {
      setBusy('');
    }
  };

  const headerActions = useMemo(() => (
    <>
      <Link className={partnerBtnSecondary} href={`${base}/channels?from=analysis`}>
        <Icon name="UserGroupIcon" size={16} /> Channel management
      </Link>
      {canExport ? (
        <button type="button" className={partnerBtnSecondary} disabled={busy === 'export'} onClick={exportRows}>
          <Icon name="ArrowDownTrayIcon" size={16} /> Export
        </button>
      ) : null}
    </>
  ), [base, busy, canExport, exportRows]);

  useYoutubeRailActions(headerActions);

  const own = channels.find((channel) => channel.relationship === 'own');
  const imported = Number(insights?.imported || 0);
  const views = Number(insights?.views || 0);
  const avgViews = imported ? views / imported : null;
  const actions = (insights?.likes == null && insights?.comments == null) ? null : Number(insights?.likes || 0) + Number(insights?.comments || 0);
  const ownInsights = compared.find((channel) => channel.relationship === 'own')?.insights;
  const competitorInsights = compared.filter((channel) => channel.relationship === 'competitor');
  const rangeLabel = DATE_PRESETS.find((item) => item.id === range)?.label || 'Selected dates';
  const buckets = [...new Set((insights?.series || []).map((item: { bucket: string }) => item.bucket))].sort() as string[];
  const timeRows = buckets.map((bucket) => ({
    label: bucketLabel(bucket, insights?.grain),
    own: Number((insights?.series || []).find((item: Record<string, any>) => item.bucket === bucket && item.relationship === 'own')?.views || 0),
    competitors: Number((insights?.series || []).filter((item: Record<string, any>) => item.bucket === bucket && item.relationship === 'competitor').reduce((sum: number, item: Record<string, any>) => sum + Number(item.views || 0), 0)),
  }));
  const totalCompareViews = compared.reduce((sum, channel) => sum + Number(channel.insights?.views || 0), 0);
  const spanWeeks = weeksInRange(filters.from, filters.to);

  if (!ready && !error) return <PageLoader label="Loading analysis…" />;

  if (manageView) return <PageLoader label="Opening channel management…" />;

  if (!channels.length) {
    return (
      <div className="space-y-4">
        {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
        <ChannelSetup channels={channels} analyses={analyses} manage={manage} base={base} projectId={projectId} onChanged={async () => {
          const channelRows = await yt(`projects/${projectId}/channels`);
          setChannels(channelRows);
        }} />
        <Link className={partnerBtnPrimary} href={`${base}/channels?from=analysis`}>Open channel management</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {!imported ? <ChannelSetup channels={channels} analyses={analyses} manage={manage} base={base} projectId={projectId} onChanged={async () => { const channelRows = await yt(`projects/${projectId}/channels`); setChannels(channelRows); }} /> : null}

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">YouTube</span>
            <span className="text-xs text-slate-400">YouTube Research is YouTube-only</span>
          </div>
          <p className="text-xs text-slate-400">{channels.length} channel{channels.length === 1 ? '' : 's'} in scope</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[16rem] flex-1">
            <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${partnerInput} h-10 pl-9`}
              placeholder="Search title, description or tags"
              value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); apply({ ...filters, q: event.currentTarget.value }); } }}
            />
          </label>
          <select className={selectClass} value={filters.tag} onChange={(event) => apply({ ...filters, tag: event.target.value })}>
            <option value="">All tags</option>
            {(filterOptions.tags || []).map((item) => <option key={item.tag} value={item.tag}>{item.tag}</option>)}
          </select>
          <select className={selectClass} value={filters.placement} onChange={(event) => apply({ ...filters, placement: event.target.value })}>
            <option value="">Organic & paid</option>
            <option value="organic">Organic</option>
            <option value="paid">Paid</option>
          </select>
          <select className={selectClass} value={VIEW_BUCKETS.find((item) => item.min === (filters.minViews || ''))?.id || ''} onChange={(event) => {
            const bucket = VIEW_BUCKETS.find((item) => item.id === event.target.value) || VIEW_BUCKETS[0];
            apply({ ...filters, minViews: bucket.min });
          }}>
            {VIEW_BUCKETS.map((item) => <option key={item.id || 'any'} value={item.id}>{item.label}</option>)}
          </select>
          <select className={selectClass} value={LENGTH_BUCKETS.find((item) => item.content === (filters.content || '') && item.min === (filters.minDuration || '') && item.max === (filters.maxDuration || ''))?.id || ''} onChange={(event) => {
            const bucket = LENGTH_BUCKETS.find((item) => item.id === event.target.value) || LENGTH_BUCKETS[0];
            apply({ ...filters, content: bucket.content, minDuration: bucket.min, maxDuration: bucket.max });
          }}>
            {LENGTH_BUCKETS.map((item) => <option key={item.id || 'any'} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {DATE_PRESETS.map((item) => (
            <button key={item.id} type="button" className={`rounded-full px-3 py-1 text-xs font-semibold ${range === item.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => { setRange(item.id); apply({ ...filters, ...applyPreset(item.id) }); }}>
              {item.short}
            </button>
          ))}
          <input type="date" className={selectClass} value={filters.from} onChange={(event) => { setRange(''); setFilters({ ...filters, from: event.target.value }); }} />
          <input type="date" className={selectClass} value={filters.to} onChange={(event) => { setRange(''); setFilters({ ...filters, to: event.target.value }); }} />
          <select className={`${selectClass} ml-auto`} value={filters.channelIds || ''} onChange={(event) => apply({ ...filters, channelIds: event.target.value })}>
            <option value="">All channels</option>
            {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.relationship === 'own' ? 'You · ' : ''}{channel.channel_name || channel.youtube_channel_id}</option>)}
          </select>
          <select className={selectClass} value={filters.content === 'short' || filters.content === 'video' ? filters.content : ''} onChange={(event) => apply({ ...filters, content: event.target.value, minDuration: '', maxDuration: '' })}>
            <option value="">All formats</option>
            <option value="short">Shorts</option>
            <option value="video">Videos</option>
          </select>
          <select className={selectClass} value={filters.categoryId} onChange={(event) => apply({ ...filters, categoryId: event.target.value })}>
            <option value="">All categories</option>
            {(filterOptions.categories || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <select className={selectClass} value={filters.sort || 'view_count'} onChange={(event) => apply({ ...filters, sort: event.target.value })}>
            {VIDEO_SORTS.map((item) => <option key={item.id} value={item.id}>Sort: {item.label}</option>)}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">Showing analysis for <span className="font-semibold text-slate-700">{metric(imported)} videos</span> · {rangeLabel}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={partnerBtnSecondary} onClick={() => { const next = { ...EMPTY_FILTERS, ...applyPreset(preset.id), sort: 'view_count' }; setRange(preset.id); apply(next); }}>Clear</button>
            {canImport ? <AdminButton variant="primary" loading={busy === 'fetch'} onClick={fetchVideos}><Icon name="ArrowDownTrayIcon" size={16} /> Fetch</AdminButton> : null}
            <AdminButton variant="secondary" loading={loading} onClick={() => apply()}>Apply dates</AdminButton>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Videos</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">{metric(imported)}</p>
          <p className="mt-1 text-xs text-slate-400">
            <span className="text-secondary">You {metric(ownInsights?.imported)}</span>
            <span className="mx-1">·</span>
            Comp {metric(competitorInsights.reduce((sum, channel) => sum + Number(channel.insights?.imported || 0), 0))}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Total views</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">{compactMetric(views)}</p>
          <p className="mt-1 text-xs text-slate-400">
            <span className="text-secondary">You {compactMetric(ownInsights?.views)}</span>
            <span className="mx-1">·</span>
            Comp {compactMetric(competitorInsights.reduce((sum, channel) => sum + Number(channel.insights?.views || 0), 0))}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Avg views / video</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">{compactMetric(avgViews)}</p>
          <p className="mt-1 text-xs text-slate-400">
            <span className="text-secondary">You {ownInsights?.imported ? compactMetric(Number(ownInsights.views || 0) / Number(ownInsights.imported)) : '—'}</span>
            <span className="mx-1">·</span>
            Comp {(() => {
              const count = competitorInsights.reduce((sum, channel) => sum + Number(channel.insights?.imported || 0), 0);
              const value = competitorInsights.reduce((sum, channel) => sum + Number(channel.insights?.views || 0), 0);
              return count ? compactMetric(value / count) : '—';
            })()}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Likes + comments</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">{compactMetric(actions)}</p>
          <p className="mt-1 text-xs text-slate-400" title="Public likes plus comments. This is not a YouTube Analytics engagement rate.">
            {actionsPerThousandViews(actions, views) == null ? '—' : `${actionsPerThousandViews(actions, views)} per 1K views`}
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bricolage text-base font-semibold text-slate-900">Views over time</h2>
            <p className="text-xs text-slate-400">Public views of imported videos by publish {insights?.grain || 'month'}</p>
          </div>
          <div className="h-72">{loading ? <PageLoader label="Updating…" /> : <TimeViewsChart data={timeRows} />}</div>
        </section>
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-bricolage text-base font-semibold text-slate-900">Avg views by format</h2>
            <HorizontalMetricBars rows={(insights?.formats || []).map((item: Record<string, any>) => ({ label: item.label, value: Number(item.avg_views || 0) }))} formatValue={compactMetric} />
          </section>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-bricolage text-base font-semibold text-slate-900">Top categories</h2>
            <HorizontalMetricBars
              rows={(insights?.categories || []).filter((item: Record<string, any>) => item.category && item.category !== 'Not supplied').slice(0, 6).map((item: Record<string, any>) => ({ label: item.category, value: Number(item.count || 0) }))}
              formatValue={(value) => `${value} vids`}
            />
          </section>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-bricolage text-base font-semibold text-slate-900">Channel comparison</h2>
          <p className="text-xs text-slate-400">{compared.length} channel{compared.length === 1 ? '' : 's'}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Videos</th>
                <th className="px-4 py-3">Avg views</th>
                <th className="px-4 py-3" title="Public likes plus comments per 1,000 views. Not YouTube Analytics.">Likes+comments / 1K</th>
                <th className="px-4 py-3">Posts / wk</th>
                <th className="px-4 py-3">Share of views</th>
              </tr>
            </thead>
            <tbody>
              {compared.map((channel) => {
                const count = Number(channel.insights?.imported || 0);
                const channelViews = Number(channel.insights?.views || 0);
                const likes = Number(channel.insights?.likes || 0) + Number(channel.insights?.comments || 0);
                const perK = actionsPerThousandViews(channel.insights?.likes == null && channel.insights?.comments == null ? null : likes, channelViews);
                const share = totalCompareViews ? Math.round((channelViews / totalCompareViews) * 100) : 0;
                const posts = spanWeeks ? count / spanWeeks : count;
                return (
                  <tr key={channel.id} className={`border-t border-slate-50 ${channel.relationship === 'own' ? 'bg-rose-50/40' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700">{projectInitials(channel.channel_name || 'CH')}</span>}
                        <div>
                          <p className="font-semibold text-slate-900">{channel.channel_name || channel.youtube_channel_id}</p>
                          <p className="text-xs text-slate-400">{handleLabel(channel.channel_handle) || (channel.relationship === 'own' ? 'You' : 'Competitor')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{metric(count)}</td>
                    <td className="px-4 py-3">{count ? compactMetric(channelViews / count) : '—'}</td>
                    <td className="px-4 py-3">{perK == null ? '—' : perK}</td>
                    <td className="px-4 py-3">{spanWeeks ? posts.toFixed(1) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-1.5 rounded-full ${channel.relationship === 'own' ? 'bg-secondary' : 'bg-slate-400'}`} style={{ width: `${Math.min(100, share)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!compared.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Add channels to compare imported video views.</p> : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-bricolage text-base font-semibold text-slate-900">Top performing videos</h2>
          <p className="text-xs text-slate-400">by current sort</p>
        </div>
        <ul>
          {(insights?.topVideos || []).map((video: Record<string, any>, index: number) => (
            <li key={video.id} className="flex items-center gap-3 border-t border-slate-50 px-4 py-3">
              <span className="w-8 text-xs font-semibold text-slate-400">#{String(index + 1).padStart(2, '0')}</span>
              {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-12 w-[4.5rem] rounded-lg object-cover" /> : <span className="h-12 w-[4.5rem] rounded-lg bg-slate-100" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{video.title || video.youtube_video_id}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${video.relationship === 'own' ? 'bg-rose-50 text-secondary' : 'bg-slate-100 text-slate-600'}`}>{video.relationship === 'own' ? 'You' : 'Comp'}</span>
                  <span>{video.channel_name}</span>
                  <span>{video.content_label || 'Video'}</span>
                  <span>{formatAgo(video.published_at)}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800">{compactMetric(video.view_count)}</p>
                <p className="text-xs text-slate-400">{compactMetric(Number(video.like_count || 0) + Number(video.comment_count || 0))} likes+comments</p>
              </div>
            </li>
          ))}
        </ul>
        {!(insights?.topVideos || []).length ? <p className="px-4 py-10 text-center text-sm text-slate-500">Fetch videos to rank public view counts.</p> : null}
      </section>

      <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4">
        <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-white shadow-xl">
          <p className="truncate text-sm">{metric(imported)} videos · YouTube · {rangeLabel.toLowerCase()}</p>
          <div className="flex shrink-0 gap-2">
            {canExport ? <button type="button" className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold" disabled={busy === 'export'} onClick={exportRows}>Export</button> : null}
            <button type="button" className="rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold" disabled={busy === 'report' || !imported} onClick={saveReport}>{busy === 'report' ? 'Saving…' : 'Save report'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChannelComparePage() {
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading analysis…" />}>
        <AnalysisDetail />
      </Suspense>
    </ProjectRequired>
  );
}
