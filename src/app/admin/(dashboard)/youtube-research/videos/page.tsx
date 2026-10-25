'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import ChannelDraftForm from '@/components/admin/youtube/ChannelDraftForm';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { DATE_PRESETS, EMPTY_FILTERS, PlacementBadge, applyPreset, handleLabel, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import { allow, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, useYoutubeRailActions, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import { formatAgo } from '@/lib/youtube/home-display';
import { lengthLabel } from '@/lib/youtube/parse';
import { MAX_PROJECT_COMPETITORS } from '@/lib/youtube/workspace-nav';

function compactMetric(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return number.toLocaleString('en-IN');
}

function interactions(video: Record<string, any>) {
  if (video.like_count == null && video.comment_count == null) return '—';
  return compactMetric(Number(video.like_count || 0) + Number(video.comment_count || 0));
}

function Chip({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
}

function Explorer() {
  const projectId = useProjectId();
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
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, channelIds: search?.get('channel') || '', sort: 'published_at' });
  const [range, setRange] = useState('all');
  const [adding, setAdding] = useState<'own' | 'competitor' | ''>(search?.get('add') === 'own' ? 'own' : search?.get('add') === 'competitor' ? 'competitor' : '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [paging, setPaging] = useState<'prev' | 'next' | ''>('');
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState('');

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
    if (next.channelIds) return channelRows.filter((channel) => channel.id === next.channelIds).map((channel) => channel.id);
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
    setMessage('Fetching public videos from the channels in this project…');
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
        setMessage('Videos are still being fetched from these channels…');
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return load(1, next, channelRows);
      }
      if (failed.length && failed.length === (imported.results || []).length) {
        throw new Error(failed[0].error || 'Could not fetch videos from these channels');
      }
      const body = await load(1, next, channelRows);
      const added = (imported.results || []).reduce((sum: number, job: { inserted_count?: number; updated_count?: number }) => sum + Number(job.inserted_count || 0) + Number(job.updated_count || 0), 0);
      setMessage(added ? `Fetched ${added} video${added === 1 ? '' : 's'} from YouTube.` : 'No new public videos were returned for these channels.');
      return body;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch videos from these channels');
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
        setError(err instanceof Error ? err.message : 'Could not load videos');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 12)));
  };

  const runComparison = useCallback(async (report: boolean) => {
    if (!selected.length) {
      setError('Select at least one video to analyse. Own + competitor pairs work best.');
      return;
    }
    setBusy(report ? 'report' : 'summary');
    setError('');
    try {
      const analysis = await yt(`projects/${projectId}/ai-analyses`, {
        method: 'POST',
        body: JSON.stringify({
          name: report ? `Video comparison · ${selected.length} videos` : 'Selected video comparison',
          goals: ['views', 'engagement'],
          source: 'selected',
          videoIds: selected,
          contentFocus: ['titles', 'thumbnails', 'competitor_insights'],
          outputs: ['improve_existing', 'gap_report'],
        }),
      });
      if (report) {
        await yt(`projects/${projectId}/research-reports`, {
          method: 'POST',
          body: JSON.stringify({
            name: `Video comparison · ${selected.length} videos`,
            report_type: 'competitor',
            analysis_id: analysis.id,
          }),
        });
        router.push(`${base}/reports`);
        return;
      }
      router.push(`${base}/analysis?id=${analysis.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : report ? 'Could not generate the report' : 'Could not generate the summary');
    } finally {
      setBusy('');
    }
  }, [base, projectId, router, selected]);

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
        onClick={() => { if (selected.length) runComparison(false); else router.push(`${base}/analysis`); }}
      >
        <Icon name="LightBulbIcon" size={16} /> Analyse results
      </button>
    </>
  ), [base, busy, manage, router, runComparison, selected.length]);

  useYoutubeRailActions(headerAction);

  const applyFilters = (used: typeof filters) => {
    setFiltering(true);
    setPage(1);
    load(1, used).catch((err) => setError(err.message)).finally(() => setFiltering(false));
  };

  const resetFilters = () => {
    const next = { ...EMPTY_FILTERS, sort: 'published_at' };
    setRange('all');
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

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const selectClass = 'h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700';

  if (loading) return <PageLoader label="Loading research…" />;

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}

      {manage && (!own || !competitors.length) ? (
        <section className="flex flex-col gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{!own ? 'Connect your YouTube channel to start research' : 'Add a competitor to compare against'}</p>
            <p className="text-xs text-slate-600">Channel management keeps own and competitor channels for this project.</p>
          </div>
          <Link href={`${base}/channels?from=research${own ? '&add=competitor' : '&add=own'}`} className={partnerBtnPrimary}>
            Open channel management
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Platform</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-900 bg-white px-3 py-1 text-sm font-semibold text-slate-900">
              <span className="text-secondary">▶</span> YouTube
            </span>
            <span className="text-xs text-slate-400">YouTube Research is YouTube-only</span>
          </div>
          <p className="text-xs font-medium text-slate-500">{channels.length} YouTube channel{channels.length === 1 ? '' : 's'} in this project</p>
        </div>

        <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="min-w-[16rem] flex-1">
            <p className="mb-2 text-xs font-semibold text-slate-500">Your YouTube channel</p>
            {own ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                {own.thumbnail_url ? <img src={own.thumbnail_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-[10px] font-bold text-secondary">YT</span>}
                <span className="min-w-0 truncate text-sm font-medium">{handleLabel(own.channel_handle) || own.channel_name || own.youtube_channel_id}</span>
                <Chip className="bg-emerald-50 text-emerald-700">Connected</Chip>
              </div>
            ) : manage ? (
              adding === 'own' ? (
                <ChannelDraftForm compact relationship="own" projectId={projectId} hasOwn={false} onSaved={async () => { setAdding(''); const next = await reloadChannels(); await fetchFromChannels(next); }} onCancel={() => setAdding('')} />
              ) : (
                <button type="button" className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-secondary" onClick={() => setAdding('own')}>Connect your channel</button>
              )
            ) : (
              <p className="text-sm text-slate-400">No own channel yet</p>
            )}
          </div>
          <div className="min-w-0 flex-[2]">
            <p className="mb-2 text-xs font-semibold text-slate-500">Competitor channels · {competitors.length}</p>
            <div className="flex flex-wrap items-center gap-2">
              {competitors.map((row) => (
                <span key={row.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-sm">
                  {row.thumbnail_url ? <img src={row.thumbnail_url} alt="" className="h-6 w-6 rounded-full object-cover" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold">{String(row.channel_name || 'C').slice(0, 2)}</span>}
                  <span className="max-w-[10rem] truncate">{row.channel_name || handleLabel(row.channel_handle)}</span>
                  {manage ? <button type="button" className="text-slate-400 hover:text-rose-600" aria-label="Remove competitor" disabled={busy === `remove:${row.id}`} onClick={() => removeChannel(row)}>×</button> : null}
                </span>
              ))}
              {manage && competitors.length < MAX_PROJECT_COMPETITORS ? (
                adding === 'competitor' ? (
                  <ChannelDraftForm compact relationship="competitor" projectId={projectId} hasOwn={Boolean(own)} onSaved={async () => { setAdding(''); const next = await reloadChannels(); await fetchFromChannels(next); }} onCancel={() => setAdding('')} />
                ) : (
                  <button type="button" className="rounded-full border border-dashed border-secondary px-3 py-1.5 text-sm font-semibold text-secondary" onClick={() => setAdding('competitor')}>+ Add competitor</button>
                )
              ) : manage && competitors.length >= MAX_PROJECT_COMPETITORS ? (
                <Link href={`${base}/channels?from=research`} className="text-xs font-semibold text-slate-500">Manage competitors</Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[16rem] flex-1">
            <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={`${partnerInput} h-10 pl-9`}
              placeholder="Search title, description or tags"
              value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyFilters({ ...filters, q: event.currentTarget.value }); } }}
            />
          </label>
          <select className={selectClass} value={range} onChange={(event) => {
            const id = event.target.value;
            setRange(id);
            const next = { ...filters, ...applyPreset(id) };
            setFilters(next);
            applyFilters(next);
          }}>
            {DATE_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>
          <select className={selectClass} value={filters.channelIds || ''} onChange={(event) => {
            const next = { ...filters, channelIds: event.target.value };
            setFilters(next);
            applyFilters(next);
          }}>
            <option value="">All channels</option>
            {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.relationship === 'own' ? 'You · ' : ''}{channel.channel_name || channel.youtube_channel_id}</option>)}
          </select>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className={selectClass} value={filters.content} onChange={(event) => { const next = { ...filters, content: event.target.value }; setFilters(next); applyFilters(next); }}>
            <option value="">All formats</option>
            <option value="short">Shorts</option>
            <option value="video">Videos</option>
          </select>
          <select className={selectClass} value={filters.categoryId} onChange={(event) => { const next = { ...filters, categoryId: event.target.value }; setFilters(next); applyFilters(next); }}>
            <option value="">All categories</option>
            {(filterOptions.categories || []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <select className={selectClass} value={filters.tag} onChange={(event) => { const next = { ...filters, tag: event.target.value }; setFilters(next); applyFilters(next); }}>
            <option value="">All tags</option>
            {(filterOptions.tags || []).map((item) => <option key={item.tag} value={item.tag}>{item.tag}</option>)}
          </select>
          <select className={selectClass} value={filters.placement} onChange={(event) => { const next = { ...filters, placement: event.target.value }; setFilters(next); applyFilters(next); }}>
            <option value="">Organic & paid</option>
            <option value="organic">Organic</option>
            <option value="paid">Paid</option>
          </select>
          <select className={`${selectClass} ml-auto`} value={filters.sort || 'published_at'} onChange={(event) => { const next = { ...filters, sort: event.target.value }; setFilters(next); applyFilters(next); }}>
            <option value="published_at">Sort: Newest</option>
            <option value="view_count">Sort: Most viewed</option>
            <option value="like_count">Sort: Most liked</option>
            <option value="comment_count">Sort: Most commented</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-400">Set filters, then fetch the latest videos from YouTube.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={partnerBtnSecondary} onClick={() => applyFilters(filters)}>Search</button>
            <button type="button" className={partnerBtnSecondary} onClick={resetFilters}>Reset filters</button>
            {canImport ? <AdminButton variant="secondary" loading={fetching} disabled={!channels.length} onClick={() => fetchFromChannels(channels)}><Icon name="ArrowDownTrayIcon" size={16} /> Fetch videos</AdminButton> : null}
            <AdminButton variant="primary" loading={busy === 'summary'} disabled={!selected.length || Boolean(busy)} onClick={() => runComparison(false)}>
              <Icon name="LightBulbIcon" size={16} /> Analyse
            </AdminButton>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{filtering ? 'Updating…' : `${total} results`}</span>
          <Chip className="bg-slate-100 text-slate-600">YouTube</Chip>
        </div>
        {selected.length ? (
          <button type="button" className="text-sm font-semibold text-secondary" onClick={() => setSelected([])}>Clear selection ({selected.length})</button>
        ) : (
          <button type="button" className="text-sm font-semibold text-slate-400" onClick={resetFilters}>Clear all</button>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3">Research</th>
                <th className="px-3 py-3">Channel</th>
                <th className="px-3 py-3">Published</th>
                <th className="px-3 py-3 text-right">Views</th>
                <th className="px-3 py-3 text-right" title="Public likes plus comments. This is not a YouTube Analytics engagement rate.">Likes + comments</th>
                <th className="px-3 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((video) => {
                const duration = lengthLabel(video);
                const ownRow = video.relationship === 'own';
                return (
                  <tr key={video.id} className={`border-t border-slate-50 ${selected.includes(video.id) ? 'bg-orange-50/40' : 'hover:bg-slate-50/80'}`}>
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.includes(video.id)} onChange={() => toggle(video.id)} aria-label={`Select ${video.title || 'video'}`} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-start gap-3">
                        <span className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover" /> : null}
                          {duration ? <span className="absolute bottom-1 right-1 rounded bg-slate-900/80 px-1 text-[10px] font-semibold text-white">{duration}</span> : null}
                        </span>
                        <span>
                          <button type="button" className="line-clamp-2 text-left font-semibold text-slate-900" onClick={() => toggle(video.id)}>{video.title || video.youtube_video_id}</button>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {video.content_label ? <Chip className="bg-slate-100 text-slate-600">{video.content_label}</Chip> : null}
                            <PlacementBadge value={video.placement_label} />
                            {video.topic_name ? <Chip className="bg-violet-50 text-violet-700">{video.topic_name}</Chip> : null}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <span className="text-secondary">▶</span>
                        <span className="truncate">{video.channel_name || '—'}</span>
                        {ownRow ? <Chip className="bg-rose-50 text-secondary">You</Chip> : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{formatAgo(video.published_at)}</td>
                    <td className="px-3 py-3 text-right font-medium">{compactMetric(video.view_count)}</td>
                    <td className="px-3 py-3 text-right text-slate-600">{interactions(video)}</td>
                    <td className="px-3 py-3 text-right">
                      {video.watch_url || video.youtube_video_id ? (
                        <a className="font-semibold text-secondary" href={video.watch_url || `https://www.youtube.com/watch?v=${video.youtube_video_id}`} target="_blank" rel="noreferrer">View</a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-800">{fetching ? 'Fetching public videos…' : channels.length ? 'No videos match these filters' : 'No YouTube channels in this project yet'}</p>
            <p className="mt-1 text-sm text-slate-500">{fetching ? 'This can take a minute.' : channels.length ? 'Fetch from YouTube or reset filters.' : 'Add your channel and competitors, then fetch videos.'}</p>
            {!channels.length && manage ? <Link href={`${base}/channels?from=research`} className={`${partnerBtnPrimary} mt-4`}>Open channel management</Link> : null}
            {channels.length && !fetching ? (
              <div className="mt-4 flex justify-center gap-2">
                {canImport ? <AdminButton variant="primary" onClick={() => fetchFromChannels(channels)}>Fetch videos</AdminButton> : null}
                <button type="button" className={partnerBtnSecondary} onClick={resetFilters}>Reset filters</button>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total} videos</span>
          <span className="flex gap-2">
            <button type="button" className={`${partnerBtnSecondary} !px-3 !py-1.5 text-xs disabled:opacity-50`} disabled={page <= 1 || Boolean(paging)} onClick={() => { const next = page - 1; setPage(next); setPaging('prev'); load(next).catch((err) => setError(err.message)).finally(() => setPaging('')); }}>Previous</button>
            <span className="self-center">{page} / {totalPages}</span>
            <button type="button" className={`${partnerBtnSecondary} !px-3 !py-1.5 text-xs disabled:opacity-50`} disabled={page >= totalPages || Boolean(paging)} onClick={() => { const next = page + 1; setPage(next); setPaging('next'); load(next).catch((err) => setError(err.message)).finally(() => setPaging('')); }}>Next</button>
          </span>
        </div>
      </section>
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
