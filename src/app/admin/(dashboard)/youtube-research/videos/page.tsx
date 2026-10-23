'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { ChartCard, EMPTY_FILTERS, MonthBarChart, PlacementBadge, ResearchFilters, applyPreset, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import { allow, metric, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

const control = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm';

function tagText(video: Record<string, any>) {
  if (video.stale) return 'Refresh required';
  if (!video.tags?.length) return 'No tags available';
  return video.tags.join(', ');
}

function Explorer() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const router = useRouter();
  const search = useSearchParams();
  const access = useYoutubeAccess();
  const canEdit = allow(access, 'youtube_research.research.edit');
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [topics, setTopics] = useState<Record<string, string>[]>([]);
  const [filterOptions, setFilterOptions] = useState<ResearchFilterOptions>({});
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, channelIds: search?.get('channel') || '', sort: 'published_at' });
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [insights, setInsights] = useState<Record<string, any> | null>(null);

  const load = async (nextPage = 1, next = filters) => {
    const params = new URLSearchParams({ ...next, page: String(nextPage), pageSize: '20' });
    const [body, insightRows] = await Promise.all([yt(`projects/${projectId}/videos?${params}`), yt(`projects/${projectId}/insights?${new URLSearchParams(next)}`)]);
    setRows(body.rows || []);
    setTotal(body.total || 0);
    setInsights(insightRows);
  };

  useEffect(() => {
    if (!projectId) return;
    const channelIds = search?.get('channel') || '';
    (async () => {
      try {
        const [channelRows, topicRows] = await Promise.all([
          yt(`projects/${projectId}/channels`),
          yt(`projects/${projectId}/topics`),
        ]);
        setChannels(channelRows);
        setTopics(topicRows);
        await load(1);
        const options = await yt(`projects/${projectId}/filters${channelIds ? `?channelIds=${channelIds}` : ''}`);
        setFilterOptions(options);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load videos');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const open = async (id: string) => {
    setDetail(await yt(`projects/${projectId}/videos/${id}`));
  };

  const saveResearch = async () => {
    if (!detail) return;
    await yt(`projects/${projectId}/videos/${detail.id}/research`, { method: 'PATCH', body: JSON.stringify(detail) });
    setMessage('Research saved for this project.');
    setDetail(null);
    await load(page);
  };

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AdminButton
          variant="primary"
          disabled={selected.length < 2}
          onClick={() => router.push(`${base}/compare?ids=${selected.join(',')}`)}
        >
          Compare videos{selected.length ? ` (${selected.length})` : ''}
        </AdminButton>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {insights ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard label="Matching videos" value={metric(insights.imported)} icon="FilmIcon" />
          <AdminStatCard label="Public views" value={metric(insights.views)} hint="Sum of current public views on matching imported rows" icon="ChartBarIcon" />
          <AdminStatCard label="Shorts" value={metric(insights.shorts)} icon="PlayCircleIcon" />
          <AdminStatCard label="Categorized" value={metric(insights.categorized)} icon="TagIcon" />
        </div>
      ) : null}
      {insights?.months?.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard title="Matching videos by month" hint="Publish months of imported videos that match these filters.">
            <MonthBarChart data={insights.months.map((item: Record<string, any>) => ({ month: item.month, Imported: item.imported }))} bars={[{ key: 'Imported', color: '#EA580C' }]} />
          </ChartCard>
          <ChartCard title="Public views of matching videos" hint="Current lifetime public views for videos published that month.">
            <MonthBarChart data={insights.months.map((item: Record<string, any>) => ({ month: item.month, Views: item.views }))} bars={[{ key: 'Views', color: '#2563EB' }]} />
          </ChartCard>
        </div>
      ) : null}
      <ResearchFilters
        value={filters}
        options={{
          ...filterOptions,
          channels: filterOptions.channels || channels.map((channel) => ({
            id: channel.id,
            label: `${channel.relationship === 'own' ? 'Own · ' : ''}${channel.channel_name || channel.youtube_channel_id}`,
          })),
        }}
        onChange={(next) => {
          setFilters({ ...filters, ...next, sort: filters.sort });
          if (next.channelIds !== filters.channelIds) {
            yt(`projects/${projectId}/filters${next.channelIds ? `?channelIds=${next.channelIds}` : ''}`).then(setFilterOptions).catch(() => undefined);
          }
        }}
        onApply={(next) => {
          const used = { ...filters, ...(next || {}), sort: filters.sort };
          setFilters(used);
          setPage(1);
          load(1, used).catch((err) => setError(err.message));
        }}
        onReset={() => {
          const next = { ...EMPTY_FILTERS, sort: 'published_at' };
          setFilters(next);
          setPage(1);
          load(1, next).catch((err) => setError(err.message));
        }}
        selectedCount={selected.length}
        compareDisabled={selected.length < 2}
        onCompare={() => router.push(`${base}/compare?ids=${selected.join(',')}`)}
      />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">{['Select to compare', 'Video', 'Channel', 'Type', 'Placement', 'Topic', 'Published', 'Views', 'Likes', 'Comments', 'Details'].map((heading) => <th key={heading} className="px-3 py-3">{heading === 'Details' ? '' : heading}</th>)}</tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-3"><input type="checkbox" title="Select to compare" aria-label="Select to compare" checked={selected.includes(row.id)} onChange={() => setSelected((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id].slice(0, 6))} /></td>
                  <td className="px-3 py-3"><button type="button" className="max-w-[240px] truncate text-left font-medium" title={row.title || row.youtube_video_id} onClick={() => open(row.id)}>{row.title || (row.stale ? 'Refresh required' : row.youtube_video_id)}</button></td>
                  <td className="px-3 py-3"><span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.relationship === 'own' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{row.relationship === 'own' ? 'Own' : 'Competitor'}</span>{row.channel_name || '—'}</td>
                  <td className="px-3 py-3">{row.content_label || '—'}</td>
                  <td className="px-3 py-3"><PlacementBadge value={row.placement_label} /></td>
                  <td className="px-3 py-3">{row.topic_name || '—'}</td>
                  <td className="px-3 py-3">{row.published_at ? String(row.published_at).slice(0, 10) : '—'}</td>
                  <td className="px-3 py-3">{metric(row.view_count)}</td>
                  <td className="px-3 py-3">{metric(row.like_count)}</td>
                  <td className="px-3 py-3">{metric(row.comment_count)}</td>
                  <td className="px-3 py-3 text-xs font-semibold"><button type="button" className="text-sky-700" onClick={() => open(row.id)}>Details</button></td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-500">No videos match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>{total} videos · Select at least two rows to compare</span>
          <span className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); load(next); }}>Previous</button>
            <span>{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => { const next = page + 1; setPage(next); load(next); }}>Next</button>
          </span>
        </div>
      </section>
      {detail ? (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setDetail(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold">{detail.title || detail.youtube_video_id}</h2>
            <p className="mt-1 text-sm text-slate-500">{detail.channel_name || '—'} · {detail.content_label || 'Length not supplied'} · {detail.placement_label || 'Placement not retrieved'} · {detail.published_at ? String(detail.published_at).slice(0, 10) : '—'} · {detail.category_label || 'Category not supplied'}</p>
            {detail.watch_url ? <a className="mt-2 inline-block text-sm text-sky-700" href={detail.watch_url} target="_blank" rel="noreferrer">Open YouTube</a> : null}
            <section className="mt-4 space-y-2 text-sm">
              <h3 className="font-semibold">YouTube metadata</h3>
              <p className="whitespace-pre-wrap text-slate-600">{detail.description || 'No description supplied.'}</p>
              <p>Tags: {tagText(detail)}</p>
              <p>Language: {detail.default_language || detail.default_audio_language || 'Not supplied'}</p>
              <p>Views {metric(detail.view_count)} · Likes {metric(detail.like_count)} · Comments {metric(detail.comment_count)}</p>
              <p className="text-xs text-slate-400">Missing counts are left blank. They are not zero.</p>
            </section>
            {canEdit ? (
              <section className="mt-4 space-y-3">
                <h3 className="text-sm font-semibold">Research details</h3>
                <select className={control} value={detail.topic_id || ''} onChange={(event) => setDetail({ ...detail, topic_id: event.target.value })}>
                  <option value="">No topic</option>
                  {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                </select>
                <input className={control} placeholder="Thumbnail caption" value={detail.thumbnail_caption || ''} onChange={(event) => setDetail({ ...detail, thumbnail_caption: event.target.value })} />
                <textarea className="h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Research notes" value={detail.research_notes || ''} onChange={(event) => setDetail({ ...detail, research_notes: event.target.value })} />
                <AdminButton variant="primary" onClick={() => saveResearch().catch((err) => setError(err.message))}>Save research</AdminButton>
              </section>
            ) : null}
            <div className="mt-4"><Link className="text-sm font-semibold text-slate-600" href={`${base}/compare?ids=${detail.id}`}>Add to comparison from the list</Link></div>
            <AdminButton className="mt-4" onClick={() => setDetail(null)}>Close</AdminButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function VideosPage() {
  return <ProjectRequired><Suspense fallback={<p className="text-sm text-slate-500">Loading videos...</p>}><Explorer /></Suspense></ProjectRequired>;
}
