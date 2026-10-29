'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AnalyseModal, { type AnalyseConfig } from '@/components/admin/youtube/AnalyseModal';
import ChannelDraftForm from '@/components/admin/youtube/ChannelDraftForm';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { csvValues, FilterMenu } from '@/components/admin/youtube/FilterMenu';
import { DATE_PRESETS, EMPTY_FILTERS, PlacementBadge, applyPreset, handleLabel, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import { allow, ProjectRequired, useProjectId, useProjectPlatform, useYoutubeAccess, useYoutubePageBase, useYoutubeRailActions, yt } from '@/components/admin/youtube/YoutubeFrame';
import { PlatformLogo } from '@/components/marketing/BrandIcons';
import { AD_FORMAT_FILTERS, POST_FORMAT_FILTERS, facebookPageConnectHref, fetchBusyMessage, fetchLoaderMessage, fetchOverlayNote, platformCopy, researchContentHref, splitFetchMessage, titleCase } from '@/lib/research/platforms';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import SafeImage from '@/components/ui/SafeImage';
import { formatAgo } from '@/lib/youtube/home-display';
import { lengthLabel } from '@/lib/youtube/parse';
import { MAX_PROJECT_COMPETITORS } from '@/lib/youtube/workspace-nav';

const AVATAR_TONES = [
  'bg-orange-100 text-orange-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
];

function compactMetric(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return number.toLocaleString('en-IN');
}

function interactions(video: Record<string, any>) {
  if (video.like_count == null && video.comment_count == null && video.share_count == null) return '—';
  return compactMetric(Number(video.like_count || 0) + Number(video.comment_count || 0) + Number(video.share_count || 0));
}

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function initials(name?: string | null) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || 'C') + (parts[1]?.[0] || '')).toUpperCase();
}

function Avatar({ src, name, className = 'h-10 w-10', tone = 'bg-slate-800 text-white' }: { src?: string | null; name?: string | null; className?: string; tone?: string }) {
  const mark = <span className={`inline-flex items-center justify-center rounded-full text-[11px] font-bold ${className} ${tone}`}>{initials(name)}</span>;
  if (!src) return mark;
  return <SafeImage src={src} alt="" className={`${className} rounded-full object-cover`} fallback={mark} />;
}

function Explorer() {
  const projectId = useProjectId();
  const platform = useProjectPlatform();
  const copy = platformCopy(platform);
  const base = useYoutubePageBase();
  const router = useRouter();
  const search = useSearchParams();
  const access = useYoutubeAccess();
  const canImport = allow(access, 'youtube_research.videos.import');
  const manage = allow(access, 'youtube_research.channels.manage');
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [filterOptions, setFilterOptions] = useState<ResearchFilterOptions>({});
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [picked, setPicked] = useState<Record<string, any>>({});
  const [analyseOpen, setAnalyseOpen] = useState(false);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, channelIds: search?.get('channel') || '', sort: 'published_at', placement: 'organic' });
  const [range, setRange] = useState('all');
  const [adding, setAdding] = useState<'own' | 'competitor' | ''>(search?.get('add') === 'own' ? 'own' : search?.get('add') === 'competitor' ? 'competitor' : '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [paging, setPaging] = useState<'prev' | 'next' | ''>('');
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState('');
  const [menu, setMenu] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const own = channels.find((channel) => channel.relationship === 'own');
  const competitors = channels.filter((channel) => channel.relationship === 'competitor');

  const videoQuery = (nextPage: number, next: typeof filters, channelIds: string[]) => {
    const params = new URLSearchParams({
      q: next.q || '',
      channelIds: channelIds.join(','),
      topicId: next.topicId || '',
      tag: next.tag || '',
      categoryId: next.categoryId || '',
      from: next.from || '',
      to: next.to || '',
      content: next.content || '',
      placement: next.placement || '',
      sort: next.sort || 'published_at',
      page: String(nextPage),
      pageSize: '20',
    });
    return params.toString();
  };

  const idsFor = (next = filters, channelRows = channels) => {
    const selected = csvValues(next.channelIds || '');
    if (selected.length) return channelRows.filter((channel) => selected.includes(channel.id)).map((channel) => channel.id);
    return channelRows.map((channel) => channel.id);
  };

  const load = async (nextPage = 1, next = filters, channelRows = channels) => {
    const ids = idsFor(next, channelRows);
    const body = ids.length
      ? await yt(`projects/${projectId}/videos?${videoQuery(nextPage, next, ids)}`)
      : { rows: [], total: 0 };
    setRows(body.rows || []);
    setTotal(body.total || 0);
    return body;
  };

  const fetchFromChannels = async (channelRows: Record<string, any>[], next = filters) => {
    if (!canImport || !channelRows.length) return null;
    setFetching(true);
    setError('');
    setMessage('');
    try {
      const imported = await yt(`projects/${projectId}/import`, {
        method: 'POST',
        body: JSON.stringify({
          mode: 'available',
          channel_ids: channelRows.map((channel) => channel.id).filter(Boolean),
        }),
      });
      const failed = (imported.results || []).filter((job: { error?: string | null }) => job.error);
      const running = failed.filter((job: { error?: string | null }) => /already running/i.test(String(job.error || '')));
      if (running.length) {
        setMessage(fetchBusyMessage(copy));
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return load(1, next, channelRows);
      }
      if (failed.length && failed.length === (imported.results || []).length) {
        throw new Error(failed[0].error || `Could not fetch ${copy.contentPlural} from these ${copy.entityPlural}`);
      }
      const body = await load(1, next, channelRows);
      let options = filterOptions;
      try {
        options = await yt(`projects/${projectId}/filters${next.channelIds ? `?channelIds=${next.channelIds}` : ''}`);
        setFilterOptions(options);
      } catch {
        /* Table data is more important than filter counts. */
      }
      const failedPages = failed.filter((job: { error?: string | null }) => !/already running/i.test(String(job.error || '')));
      const posts = Number((options.placement || []).find((item) => item.id === 'organic')?.count || 0);
      const ads = Number((options.placement || []).find((item) => item.id === 'paid')?.count || 0);
      const summary = splitFetchMessage(copy, posts, ads);
      setMessage(
        failedPages.length
          ? `${summary} ${failedPages.length} ${copy.entity}${failedPages.length === 1 ? '' : 's'} returned no public ${copy.contentPlural}.`
          : summary,
      );
      return body;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not fetch ${copy.contentPlural} from these ${copy.entityPlural}`);
      try {
        return await load(1, next, channelRows);
      } catch {
        return null;
      }
    } finally {
      setFetching(false);
    }
  };

  const reloadChannels = async () => {
    const channelRows = await yt(`projects/${projectId}/channels`);
    setChannels(channelRows);
    return channelRows;
  };

  useEffect(() => {
    if (!projectId) return;
    const channelIds = search?.get('channel') || '';
    (async () => {
      try {
        const channelRows = await reloadChannels();
        const listed = await load(1, filters, channelRows);
        const empty = !(listed.total || listed.rows?.length);
        if (canImport && channelRows.length && empty) {
          const targets = channelIds
            ? channelRows.filter((channel: Record<string, any>) => channel.id === channelIds || channel.youtube_channel_id === channelIds)
            : channelRows;
          await fetchFromChannels(targets.length ? targets : channelRows);
        }
        const options = await yt(`projects/${projectId}/filters${channelIds ? `?channelIds=${channelIds}` : ''}`);
        setFilterOptions(options);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not load ${copy.contentPlural}`);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    const add = search?.get('add');
    if (add === 'own' || add === 'competitor') {
      setAdding(add);
      router.replace(researchContentHref(base), { scroll: false });
    }
    const fbError = search?.get('facebook_error');
    const fbOk = search?.get('facebook_connected');
    if (fbError) {
      setError(fbError);
      router.replace(researchContentHref(base), { scroll: false });
    } else if (fbOk) {
      setMessage(`Connected ${fbOk} Facebook Page${fbOk === '1' ? '' : 's'}. Fetch posts to import clicks, views, likes, comments, and ads.`);
      router.replace(researchContentHref(base), { scroll: false });
    }
  }, [search, base, router]);

  const toggle = (id: string, video?: Record<string, any>) => {
    setSelected((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 12);
      return next;
    });
    setPicked((current) => {
      if (current[id]) {
        const { [id]: _removed, ...rest } = current;
        return rest;
      }
      const row = video || rows.find((item) => item.id === id);
      if (!row) return current;
      const entries = Object.entries({ ...current, [id]: row }).slice(-12);
      return Object.fromEntries(entries);
    });
  };

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu('');
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openAnalyse = () => {
    if (selected.length < 2) {
      setError('Select at least two videos to compare.');
      return;
    }
    setError('');
    setAnalyseOpen(true);
  };

  const createAnalysis = async (config: AnalyseConfig, name: string, mode: 'compare' | 'insights' = 'compare') => yt(`projects/${projectId}/ai-analyses`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      mode,
      goals: config.goals,
      primaryGoal: config.primaryGoal,
      source: 'selected',
      videoIds: selected,
      contentFocus: ['titles', 'thumbnails', 'competitor_insights'],
      targetAges: config.targetAges,
      targetGenders: config.targetGenders,
      geographies: config.geographies,
      languages: config.languages,
      interests: config.interests,
      devices: config.devices,
      audienceNotes: config.audienceNotes,
      outputs: ['improve_existing', 'gap_report'],
    }),
  });

  const runAnalysis = async (config: AnalyseConfig) => {
    setBusy('summary');
    setError('');
    try {
      const analysis = await createAnalysis(config, 'Video comparison', 'compare');
      setAnalyseOpen(false);
      router.push(`${base}/channel-compare?id=${analysis.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the analysis');
    } finally {
      setBusy('');
    }
  };

  const headerAction = useMemo(() => (
    <>
      {manage ? (
        <Link href={`${base}/channels?from=research`} className={partnerBtnSecondary}>
          <Icon name="UserGroupIcon" size={16} /> Channel management
        </Link>
      ) : null}
      <button
        type="button"
        className={partnerBtnPrimary}
        disabled={Boolean(busy)}
        onClick={() => { if (selected.length >= 2) setAnalyseOpen(true); else router.push(`${base}/channel-compare`); }}
      >
        <Icon name="LightBulbIcon" size={16} /> Analyse results
      </button>
    </>
  ), [base, busy, manage, router, selected.length]);

  useYoutubeRailActions(headerAction);

  const applyFilters = (used: typeof filters) => {
    setFiltering(true);
    setPage(1);
    load(1, used).catch((err) => setError(err.message)).finally(() => setFiltering(false));
  };

  const resetFilters = () => {
    const next = { ...EMPTY_FILTERS, sort: 'published_at', placement: filters.placement === 'paid' ? 'paid' : 'organic' };
    setRange('all');
    setFilters(next);
    applyFilters(next);
  };

  const setBucket = (id: 'posts' | 'ads') => {
    const paid = id === 'ads';
    const allowed = new Set((paid ? AD_FORMAT_FILTERS : copy.id === 'youtube' ? [{ id: 'short' }, { id: 'video' }] : POST_FORMAT_FILTERS).map((item) => item.id));
    const next = {
      ...filters,
      placement: paid ? 'paid' : 'organic',
      content: csvValues(filters.content).filter((item) => allowed.has(item)).join(','),
    };
    setFilters(next);
    applyFilters(next);
  };

  const removeChannel = async (row: Record<string, any>) => {
    if (!window.confirm(`Remove ${row.channel_name || row.youtube_channel_id} from this project?`)) return;
    setBusy(`remove:${row.id}`);
    try {
      await yt(`projects/${projectId}/channels/${row.id}`, { method: 'DELETE' });
      const next = await reloadChannels();
      await load(1, filters, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the channel');
    } finally {
      setBusy('');
    }
  };

  const savedChannel = async () => {
    setAdding('');
    const next = await reloadChannels();
    await fetchFromChannels(next);
  };

  const generateReport = async () => {
    if (!selected.length) {
      setError('Select at least one video to generate a report.');
      return;
    }
    setBusy('report');
    setError('');
    setMessage('');
    try {
      const report = await yt(`projects/${projectId}/research-reports`, {
        method: 'POST',
        body: JSON.stringify({
          name: `Selected videos · ${selected.length} · ${new Date().toISOString().slice(0, 10)}`,
          report_type: 'performance',
          videoIds: selected,
        }),
      });
      router.push(`${base}/reports/${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the report');
    } finally {
      setBusy('');
    }
  };

  const channelFor = (video: Record<string, any>) => channels.find((channel) => channel.id === video.channel_id);

  const openMenu = (id: string, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    setMenu(menu === id ? '' : id);
  };

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const patchFilters = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    applyFilters(next);
  };
  const contentOptions = filters.placement === 'paid'
    ? AD_FORMAT_FILTERS.map((item) => ({ ...item, count: (filterOptions.content || []).find((row) => row.id === item.id)?.count }))
    : copy.id === 'youtube'
      ? [
        { id: 'short', label: 'Shorts', count: (filterOptions.content || []).find((row) => row.id === 'short')?.count },
        { id: 'video', label: 'Videos', count: (filterOptions.content || []).find((row) => row.id === 'video')?.count },
      ]
      : POST_FORMAT_FILTERS.map((item) => ({ ...item, count: (filterOptions.content || []).find((row) => row.id === item.id)?.count }));
  const pageIds = rows.map((row) => String(row.id));
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const menuVideo = rows.find((row) => String(row.id) === menu);

  if (loading) return <PageLoader label="Loading research…" />;

  return (
    <div className="flex h-[calc(100dvh-var(--yt-sticky)+5.5rem)] flex-col gap-3">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {copy.id === 'facebook' && own && !own.meta_connected ? (
        <AdminAlert>
          Connect this Facebook Page with a Page admin login to import your post clicks, views, likes, comments, and ads. Competitor ads still come from Ad Library.
          {manage ? (
            <a className="ml-2 font-semibold text-secondary" href={facebookPageConnectHref(projectId, `${base}/posts`)}>Connect Facebook Page</a>
          ) : null}
        </AdminAlert>
      ) : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      <section className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Platform</span>
            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-sm font-semibold ${copy.accent}`}>
              <PlatformLogo platform={platform} className="h-6 w-6" />
              {copy.label}
            </span>
            <span className="text-xs text-slate-400">This project researches {copy.label} {copy.entityPlural}</span>
          </div>
          <p className="text-xs font-medium text-slate-500">{channels.length} {copy.label} {channels.length === 1 ? copy.entity : copy.entityPlural} in this project</p>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(17rem,20rem)_1fr] xl:items-start">
          <div>
            <p className="mb-2 text-xs font-semibold text-slate-500">{copy.ownLabel}</p>
            {own ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <Avatar src={own.thumbnail_url} name={own.channel_name} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{handleLabel(own.channel_handle) || own.channel_name || own.youtube_channel_id}</p>
                  <p className="truncate text-xs text-slate-400">{own.channel_name || `Your ${copy.entity}`}</p>
                </div>
                {copy.id === 'facebook' && !own.meta_connected && manage ? (
                  <a className="text-xs font-semibold text-secondary" href={facebookPageConnectHref(projectId, `${base}/posts`)}>Connect Page</a>
                ) : (
                  <Chip className="bg-emerald-50 text-emerald-700">Connected</Chip>
                )}
              </div>
            ) : manage ? (
              <button type="button" className="flex w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 px-3 py-6 text-sm font-semibold text-secondary hover:border-secondary/50 hover:bg-orange-50/40" onClick={() => setAdding('own')}>
                Connect your {copy.entity}
              </button>
            ) : (
              <p className="rounded-2xl border border-slate-100 px-3 py-6 text-sm text-slate-400">No own {copy.entity} yet</p>
            )}
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold text-slate-500">{copy.competitorLabel} · {competitors.length}</p>
            <div className="flex flex-wrap items-stretch gap-3">
              {competitors.map((row, index) => (
                <div key={row.id} className="flex min-w-[13.5rem] flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:max-w-[18rem]">
                  <Avatar src={row.thumbnail_url} name={row.channel_name} className="h-11 w-11" tone={AVATAR_TONES[index % AVATAR_TONES.length]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.channel_name || handleLabel(row.channel_handle)}</p>
                    <p className="truncate text-xs text-slate-400">{handleLabel(row.channel_handle) || row.youtube_channel_id}</p>
                  </div>
                  {manage ? (
                    <button type="button" className="rounded-full p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${row.channel_name || 'competitor'}`} disabled={busy === `remove:${row.id}`} onClick={() => removeChannel(row)}>
                      <Icon name="XMarkIcon" size={16} />
                    </button>
                  ) : null}
                </div>
              ))}
              {manage && competitors.length < MAX_PROJECT_COMPETITORS ? (
                <button type="button" className="inline-flex min-h-[4.25rem] min-w-[11rem] items-center justify-center gap-1.5 rounded-2xl border border-dashed border-secondary/70 px-4 text-sm font-semibold text-secondary hover:bg-orange-50/70" onClick={() => setAdding('competitor')}>
                  <Icon name="PlusIcon" size={16} /> Add competitor {copy.entity}
                </button>
              ) : manage ? (
                <Link href={`${base}/channels?from=research`} className="self-center text-xs font-semibold text-slate-500">Manage competitors</Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
        <div className="z-20 shrink-0 space-y-2 border-b border-slate-100 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {([{ id: 'posts', label: copy.id === 'youtube' ? 'Videos' : 'Posts', count: (filterOptions.placement || []).find((item) => item.id === 'organic')?.count || 0 }, { id: 'ads', label: 'Ads', count: (filterOptions.placement || []).find((item) => item.id === 'paid')?.count || 0 }] as const).map((tab) => {
              const active = tab.id === 'ads' ? filters.placement === 'paid' : filters.placement !== 'paid';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBucket(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {tab.label} {tab.count}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${partnerInput} h-10 rounded-full pl-9`}
                placeholder={`Enter ${copy.content} title or keyword`}
                value={filters.q}
                onChange={(event) => setFilters({ ...filters, q: event.target.value })}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyFilters({ ...filters, q: event.currentTarget.value }); } }}
              />
            </label>
            <FilterMenu
              label="Time"
              value={range}
              options={DATE_PRESETS.map((preset) => ({ id: preset.id, label: preset.id === 'all' ? 'All time' : preset.label }))}
              onChange={(id) => {
                const nextId = id || 'all';
                setRange(nextId);
                patchFilters(applyPreset(nextId));
              }}
            />
            <FilterMenu
              label={copy.entityPlural}
              allLabel={`All ${copy.entityPlural}`}
              multiple
              value={filters.channelIds || ''}
              options={channels.map((channel) => ({
                id: String(channel.id),
                label: `${channel.relationship === 'own' ? 'You · ' : ''}${channel.channel_name || channel.youtube_channel_id}`,
              }))}
              onChange={(channelIds) => patchFilters({ channelIds })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {copy.id === 'youtube' && filters.placement === 'paid' ? null : (
              <FilterMenu
                label={filters.placement === 'paid' ? 'Ads' : copy.id === 'youtube' ? 'Formats' : 'Posts'}
                allLabel={filters.placement === 'paid' ? 'All ads' : copy.id === 'youtube' ? 'All formats' : 'All posts'}
                multiple
                value={filters.content}
                options={contentOptions}
                onChange={(content) => patchFilters({ content })}
              />
            )}
            {copy.id === 'youtube' ? (
              <FilterMenu
                label="Categories"
                allLabel="All categories"
                multiple
                value={filters.categoryId}
                options={(filterOptions.categories || []).map((item) => ({ id: item.id, label: item.label, count: item.count }))}
                onChange={(categoryId) => patchFilters({ categoryId })}
              />
            ) : null}
            {(filterOptions.tags || []).length ? (
              <FilterMenu
                label="Tags"
                allLabel="All tags"
                multiple
                value={filters.tag}
                options={(filterOptions.tags || []).map((item) => ({ id: item.tag, label: item.tag, count: item.count }))}
                onChange={(tag) => patchFilters({ tag })}
              />
            ) : null}
            <FilterMenu
              label="Sort"
              value={filters.sort || 'published_at'}
              options={[
                { id: 'published_at', label: 'Newest' },
                { id: 'view_count', label: 'Most viewed' },
                { id: 'like_count', label: 'Most liked' },
                { id: 'comment_count', label: 'Most commented' },
              ]}
              onChange={(sort) => patchFilters({ sort: sort || 'published_at' })}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button type="button" className={partnerBtnPrimary} onClick={() => applyFilters(filters)}>Search</button>
              <button type="button" className="text-sm font-semibold text-slate-500 hover:text-slate-800" onClick={resetFilters}>Reset filters</button>
              {canImport ? <AdminButton variant="secondary" loading={fetching} process={false} disabled={!channels.length} onClick={() => fetchFromChannels(channels)}><Icon name="ArrowDownTrayIcon" size={16} /> {copy.fetchLabel}</AdminButton> : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-800">{filtering ? 'Updating…' : `${total} ${filters.placement === 'paid' ? (total === 1 ? 'ad' : 'ads') : (total === 1 ? copy.content : copy.contentPlural)}`}</span>
            <Chip className="bg-slate-100 text-slate-600">{copy.label}</Chip>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-secondary" checked={allPageSelected} onChange={() => {
                    if (allPageSelected) {
                      setSelected((current) => current.filter((id) => !pageIds.includes(id)));
                      setPicked((current) => {
                        const next = { ...current };
                        pageIds.forEach((id) => { delete next[id]; });
                        return next;
                      });
                    } else {
                      setSelected((current) => [...new Set([...current, ...pageIds])].slice(0, 12));
                      setPicked((current) => ({ ...current, ...Object.fromEntries(rows.map((video) => [video.id, video])) }));
                    }
                  }} aria-label="Select all on this page" />
                </th>
                <th className="px-3 py-3">{titleCase(copy.content)}</th>
                <th className="px-3 py-3">{titleCase(copy.entity)}</th>
                <th className="px-3 py-3">Published</th>
                <th className="px-3 py-3 text-right">{copy.id === 'facebook' ? 'Views / reach' : 'Views'}</th>
                {copy.id === 'facebook' ? <th className="px-3 py-3 text-right">Clicks</th> : null}
                {copy.id === 'facebook' ? <th className="px-3 py-3 text-right">Likes</th> : null}
                {copy.id === 'facebook' ? <th className="px-3 py-3 text-right">Comments</th> : null}
                <th className="px-3 py-3 text-right" title={copy.id === 'youtube' ? 'Public likes plus comments. This is not a YouTube Analytics engagement rate.' : 'Likes, comments, and shares when Facebook returns them.'}>{copy.id === 'facebook' ? 'Engagement' : 'Likes + comments'}</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((video, index) => {
                const duration = lengthLabel(video);
                const ownRow = video.relationship === 'own';
                const channel = channelFor(video);
                const watch = video.watch_url || (video.youtube_video_id ? `https://www.youtube.com/watch?v=${video.youtube_video_id}` : '');
                return (
                  <tr key={video.id} className={`border-t border-slate-50 ${selected.includes(video.id) ? 'bg-slate-50/80' : 'hover:bg-slate-50/70'}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-secondary" checked={selected.includes(video.id)} onChange={() => toggle(video.id, video)} aria-label={`Select ${video.title || copy.content}`} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
                          {duration ? <span className="absolute inset-x-0 bottom-0 bg-slate-900/75 py-0.5 text-center text-[9px] font-semibold text-white">{duration}</span> : null}
                        </span>
                        <span>
                          <button type="button" className="line-clamp-2 text-left font-medium text-slate-900" onClick={() => toggle(video.id, video)}>{video.title || video.youtube_video_id}</button>
                          {video.description && video.description !== video.title ? (
                            <span className="mt-0.5 line-clamp-2 text-xs text-slate-500">{video.description}</span>
                          ) : null}
                          <span className="mt-1 flex flex-wrap gap-1">
                            {video.content_label ? <Chip className="bg-slate-100 text-slate-600">{video.content_label}</Chip> : null}
                            <PlacementBadge value={video.placement_label} />
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar src={video.channel_thumbnail_url || channel?.thumbnail_url} name={video.channel_name} className="h-8 w-8" tone={AVATAR_TONES[index % AVATAR_TONES.length]} />
                        <span className="truncate font-medium text-slate-800">{video.channel_name || '—'}</span>
                        {ownRow ? <Chip className="bg-rose-50 text-secondary">You</Chip> : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{formatAgo(video.published_at)}</td>
                    <td className="px-3 py-3 text-right font-medium">{compactMetric(video.view_count ?? video.impression_count)}</td>
                    {copy.id === 'facebook' ? <td className="px-3 py-3 text-right text-slate-600">{compactMetric(video.click_count)}</td> : null}
                    {copy.id === 'facebook' ? <td className="px-3 py-3 text-right text-slate-600">{compactMetric(video.like_count)}</td> : null}
                    {copy.id === 'facebook' ? <td className="px-3 py-3 text-right text-slate-600">{compactMetric(video.comment_count)}</td> : null}
                    <td className="px-3 py-3 text-right text-slate-600">{interactions(video)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {watch ? <a className="px-2 font-semibold text-secondary" href={watch} target="_blank" rel="noreferrer">View</a> : null}
                        <button type="button" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="More actions" onClick={(event) => openMenu(String(video.id), event)}>
                          <Icon name="EllipsisVerticalIcon" size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!rows.length ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-800">{fetching ? fetchLoaderMessage(copy) : channels.length ? `No ${copy.contentPlural} match these filters` : `No ${copy.label} ${copy.entityPlural} in this project yet`}</p>
            <p className="mt-1 text-sm text-slate-500">{fetching ? fetchOverlayNote(copy) : channels.length ? `Fetch from ${copy.label} or reset filters.` : `Connect your ${copy.entity}, add competitors, then fetch ${copy.contentPlural}.`}</p>
            {!channels.length && manage ? (
              <button type="button" className={`${partnerBtnPrimary} mt-4`} onClick={() => setAdding('own')}>Connect your {copy.entity}</button>
            ) : null}
            {channels.length && !fetching ? (
              <div className="mt-4 flex justify-center gap-2">
                {canImport ? <AdminButton variant="primary" process={false} onClick={() => fetchFromChannels(channels)}>{copy.fetchLabel}</AdminButton> : null}
                <button type="button" className={partnerBtnSecondary} onClick={resetFilters}>Reset filters</button>
              </div>
            ) : null}
          </div>
        ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total} {copy.contentPlural}</span>
          <span className="flex items-center gap-3">
            <button type="button" className="font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40" disabled={page <= 1 || Boolean(paging)} onClick={() => { const next = page - 1; setPage(next); setPaging('prev'); load(next).catch((err) => setError(err.message)).finally(() => setPaging('')); }}>Previous</button>
            <span>{page} / {totalPages}</span>
            <button type="button" className="font-semibold text-secondary hover:text-secondary/80 disabled:opacity-40" disabled={page >= totalPages || Boolean(paging)} onClick={() => { const next = page + 1; setPage(next); setPaging('next'); load(next).catch((err) => setError(err.message)).finally(() => setPaging('')); }}>Next</button>
          </span>
        </div>
      </section>

      {adding ? (
        <ChannelDraftForm
          modal
          relationship={adding}
          projectId={projectId}
          hasOwn={Boolean(own)}
          competitorCount={competitors.length}
          competitorLimit={MAX_PROJECT_COMPETITORS}
          platform={platform}
          onSaved={savedChannel}
          onCancel={() => setAdding('')}
        />
      ) : null}

      {selected.length ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
            <span className="inline-flex items-center gap-2 pl-2 text-sm font-semibold text-slate-700">
              {selected.length} selected
              <button type="button" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Clear selection" onClick={() => { setSelected([]); setPicked({}); }}>
                <Icon name="XMarkIcon" size={16} />
              </button>
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={Boolean(busy) || selected.length < 2}
              title={selected.length < 2 ? 'Select at least two videos to compare' : 'Run a goal-based comparison'}
              onClick={openAnalyse}
            >
              <Icon name="ChartBarIcon" size={16} /> Analyse selected
            </button>
            <button type="button" className="btn-primary" disabled={Boolean(busy)} onClick={generateReport}>
              <Icon name="DocumentChartBarIcon" size={16} /> Generate report
            </button>
          </div>
        </div>
      ) : null}

      {menu && menuVideo && typeof document !== 'undefined'
        ? createPortal(
          <div ref={menuRef} className="fixed z-[80] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg" style={{ top: menuPos.top, right: menuPos.right }}>
            {menuVideo.watch_url || menuVideo.youtube_video_id ? (
              <a className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50" href={menuVideo.watch_url || `https://www.youtube.com/watch?v=${menuVideo.youtube_video_id}`} target="_blank" rel="noreferrer" onClick={() => setMenu('')}>
                <NavIcon name="PlayCircleIcon" itemKey="youtube" className="h-7 w-7 rounded-lg" size={14} /> Open on YouTube
              </a>
            ) : null}
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" onClick={() => {
              setSelected((current) => (current.includes(menuVideo.id) ? current : [...current, menuVideo.id].slice(0, 12)));
              setPicked((current) => ({ ...current, [menuVideo.id]: menuVideo }));
              setMenu('');
            }}>
              <NavIcon name="CheckCircleIcon" itemKey="select" delay={80} className="h-7 w-7 rounded-lg" size={14} /> Select
            </button>
            <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" onClick={() => {
              const url = menuVideo.watch_url || `https://www.youtube.com/watch?v=${menuVideo.youtube_video_id}`;
              navigator.clipboard?.writeText(url).catch(() => undefined);
              setMenu('');
            }}>
              <NavIcon name="LinkIcon" itemKey="copy" delay={160} className="h-7 w-7 rounded-lg" size={14} /> Copy link
            </button>
          </div>,
          document.body,
        )
        : null}

      {fetching ? <FetchVideosOverlay platform={platform} /> : null}
      {busy === 'report' ? <FetchVideosOverlay mode="report" platform={platform} /> : null}

      {analyseOpen ? (
        <AnalyseModal
          variant="direct"
          platform={platform}
          videos={selected.map((id) => picked[id] || rows.find((row) => row.id === id)).filter(Boolean)}
          busy={busy === 'summary'}
          error={error}
          onClose={() => { if (busy !== 'summary') setAnalyseOpen(false); }}
          onGenerate={runAnalysis}
        />
      ) : null}
    </div>
  );
}

export default function VideosPage() {
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading research…" />}>
        <Explorer />
      </Suspense>
    </ProjectRequired>
  );
}
