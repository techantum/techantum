'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import { EMPTY_FILTERS, PlacementBadge, ResearchFilters, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { PartnerStatTile } from '@/components/partner/PartnerUi';
import { allow, metric, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import { lengthLabel, WATCH_HOURS_NOTE } from '@/lib/youtube/parse';

function VideoCard({
  video,
  selected,
  onToggle,
}: {
  video: Record<string, any>;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`flex gap-3 rounded-2xl border bg-white p-3 ${selected ? 'border-secondary ring-1 ring-secondary/20' : 'border-slate-200'}`}>
      <label className="mt-1 shrink-0">
        <span className="sr-only">Select video</span>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </label>
      {video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt="" loading="lazy" className="h-20 w-32 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No thumbnail</span>
      )}
      <div className="min-w-0 flex-1">
        <button type="button" className="line-clamp-2 text-left text-sm font-semibold text-slate-900" onClick={onToggle}>
          {video.title || (video.stale ? 'Refresh required' : video.youtube_video_id)}
        </button>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
          <span className="font-medium text-slate-600">Content on thumbnail: </span>
          {video.thumbnail_caption || 'Not recorded'}
        </p>
        <p className="mt-1 truncate text-xs text-slate-500">{video.channel_name || '—'} · {video.published_at ? String(video.published_at).slice(0, 10) : '—'}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span>Length {lengthLabel(video) || '—'}</span>
          <span>Viewership {metric(video.view_count)}</span>
          <span title={WATCH_HOURS_NOTE}>Watch hours —</span>
          <span>{metric(video.like_count)} likes</span>
          <span>{metric(video.comment_count)} comments</span>
          <PlacementBadge value={video.placement_label} />
        </p>
      </div>
    </article>
  );
}

function Explorer() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const router = useRouter();
  const search = useSearchParams();
  const access = useYoutubeAccess();
  const canImport = allow(access, 'youtube_research.videos.import');
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [filterOptions, setFilterOptions] = useState<ResearchFilterOptions>({});
  const [ownRows, setOwnRows] = useState<Record<string, any>[]>([]);
  const [competitorRows, setCompetitorRows] = useState<Record<string, any>[]>([]);
  const [ownTotal, setOwnTotal] = useState(0);
  const [competitorTotal, setCompetitorTotal] = useState(0);
  const [ownSummary, setOwnSummary] = useState<Record<string, any> | null>(null);
  const [competitorSummary, setCompetitorSummary] = useState<Record<string, any> | null>(null);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, channelIds: search?.get('channel') || '', sort: 'published_at' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [paging, setPaging] = useState<'prev' | 'next' | ''>('');
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState('');

  const ownChannels = channels.filter((channel) => channel.relationship === 'own');
  const competitorChannels = channels.filter((channel) => channel.relationship === 'competitor');

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
      pageSize: '24',
    });
    return params.toString();
  };

  const idsFor = (kind: 'own' | 'competitor', next = filters, channelRows = channels) => {
    const pool = channelRows.filter((channel) => (kind === 'own' ? channel.relationship === 'own' : channel.relationship === 'competitor'));
    if (next.channelIds) return pool.filter((channel) => channel.id === next.channelIds).map((channel) => channel.id);
    return pool.map((channel) => channel.id);
  };

  const load = async (nextPage = 1, next = filters, channelRows = channels) => {
    const ownIds = idsFor('own', next, channelRows);
    const competitorIds = idsFor('competitor', next, channelRows);
    const [ownBody, competitorBody] = await Promise.all([
      ownIds.length ? yt(`projects/${projectId}/videos?${videoQuery(nextPage, next, ownIds)}`) : { rows: [], total: 0, summary: null },
      competitorIds.length ? yt(`projects/${projectId}/videos?${videoQuery(nextPage, next, competitorIds)}`) : { rows: [], total: 0, summary: null },
    ]);
    setOwnRows(ownBody.rows || []);
    setCompetitorRows(competitorBody.rows || []);
    setOwnTotal(ownBody.total || 0);
    setCompetitorTotal(competitorBody.total || 0);
    setOwnSummary(ownBody.summary || null);
    setCompetitorSummary(competitorBody.summary || null);
    return { own: ownBody, competitor: competitorBody };
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
      setMessage(added ? `Fetched ${added} video${added === 1 ? '' : 's'} from added channels.` : 'No new public videos were returned for these channels.');
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

  useEffect(() => {
    if (!projectId) return;
    const channelIds = search?.get('channel') || '';
    (async () => {
      try {
        const channelRows = await yt(`projects/${projectId}/channels`);
        setChannels(channelRows);
        const listed = await load(1, filters, channelRows);
        const empty = !(listed.own.total || listed.own.rows?.length || listed.competitor.total || listed.competitor.rows?.length);
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

  const runComparison = async (report: boolean) => {
    if (selected.length < 2) {
      setError('Select at least two videos, ideally one own and one competitor.');
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
  };

  const totalPages = Math.max(1, Math.ceil(Math.max(ownTotal, competitorTotal) / 24));
  const applyFilters = (used: typeof filters) => {
    setFiltering(true);
    setPage(1);
    load(1, used).catch((err) => setError(err.message)).finally(() => setFiltering(false));
  };

  const viewership = ownSummary?.viewership == null && competitorSummary?.viewership == null
    ? null
    : Number(ownSummary?.viewership || 0) + Number(competitorSummary?.viewership || 0);

  if (loading) return <PageLoader label="Loading videos…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2">
        {canImport ? (
          <AdminButton variant="secondary" loading={fetching} disabled={!channels.length} onClick={() => fetchFromChannels(channels)}>
            Fetch videos from channels
          </AdminButton>
        ) : null}
        <AdminButton variant="secondary" loading={busy === 'summary'} disabled={selected.length < 2 || Boolean(busy)} onClick={() => runComparison(false)}>
          Generate Summary
        </AdminButton>
        <AdminButton variant="primary" loading={busy === 'report'} disabled={selected.length < 2 || Boolean(busy)} onClick={() => runComparison(true)}>
          Generate Report
        </AdminButton>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {fetching ? <PageLoader label="Fetching videos from YouTube…" /> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PartnerStatTile label="Organic videos" value={Number(ownSummary?.organic_videos || 0) + Number(competitorSummary?.organic_videos || 0)} icon="PlayCircleIcon" tone="emerald" />
        <PartnerStatTile label="Paid videos" value={Number(ownSummary?.paid_videos || 0) + Number(competitorSummary?.paid_videos || 0)} icon="MegaphoneIcon" tone="amber" />
        <PartnerStatTile label="Video viewership" value={metric(viewership)} icon="EyeIcon" tone="sky" />
        <PartnerStatTile label="Watch hours" value="—" icon="ClockIcon" tone="violet" />
      </div>
      <p className="text-xs text-slate-500">{WATCH_HOURS_NOTE}</p>
      <ResearchFilters
        value={filters}
        options={{
          ...filterOptions,
          channels: filterOptions.channels || channels.map((channel) => ({
            id: channel.id,
            label: `${channel.relationship === 'own' ? 'Own · ' : ''}${channel.channel_name || channel.youtube_channel_id}`,
          })),
        }}
        onChange={(next) => setFilters({ ...filters, ...next })}
        searching={filtering}
        onApply={(next) => {
          const used = { ...filters, ...(next || {}) };
          setFilters(used);
          applyFilters(used);
        }}
        onReset={() => {
          const next = { ...EMPTY_FILTERS, sort: 'published_at' };
          setFilters(next);
          applyFilters(next);
        }}
        selectedCount={selected.length}
      />
      <p className="text-xs text-slate-500">
        {selected.length
          ? `${selected.length} video${selected.length === 1 ? '' : 's'} selected. Generate Summary opens the side-by-side comparison. Generate Report saves it under Reports.`
          : 'Select videos from both columns, then generate a summary or a report.'}
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bricolage text-base font-semibold text-slate-900">Own videos</h2>
            <span className="text-xs text-slate-400">{ownTotal} matching</span>
          </div>
          <div className="space-y-3">
            {ownRows.map((row) => (
              <VideoCard key={row.id} video={row} selected={selected.includes(row.id)} onToggle={() => toggle(row.id)} />
            ))}
            {!ownChannels.length ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Add your own channel from Dashboard to see its videos here.</p>
            ) : !ownRows.length ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{fetching ? 'Fetching public videos…' : 'No own videos match these filters.'}</p>
            ) : null}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bricolage text-base font-semibold text-slate-900">Competitor videos</h2>
            <span className="text-xs text-slate-400">{competitorTotal} matching</span>
          </div>
          <div className="space-y-3">
            {competitorRows.map((row) => (
              <VideoCard key={row.id} video={row} selected={selected.includes(row.id)} onToggle={() => toggle(row.id)} />
            ))}
            {!competitorChannels.length ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">Add competitor channels to compare performance beside your videos.</p>
            ) : !competitorRows.length ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">{fetching ? 'Fetching public videos…' : 'No competitor videos match these filters.'}</p>
            ) : null}
          </div>
        </section>
      </div>
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{ownTotal + competitorTotal} videos across both columns</span>
        <span className="flex gap-2">
          <button type="button" className="inline-flex items-center gap-1 disabled:opacity-50" disabled={page <= 1 || Boolean(paging)} onClick={() => { const next = page - 1; setPage(next); setPaging('prev'); load(next).catch((err) => setError(err.message)).finally(() => setPaging('')); }}>{paging === 'prev' ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}Previous</button>
          <span>{page} / {totalPages}</span>
          <button type="button" className="inline-flex items-center gap-1 disabled:opacity-50" disabled={page >= totalPages || Boolean(paging)} onClick={() => { const next = page + 1; setPage(next); setPaging('next'); load(next).catch((err) => setError(err.message)).finally(() => setPaging('')); }}>{paging === 'next' ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}Next</button>
        </span>
      </div>
    </div>
  );
}

export default function VideosPage() {
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading videos…" />}>
        <Explorer />
      </Suspense>
    </ProjectRequired>
  );
}
