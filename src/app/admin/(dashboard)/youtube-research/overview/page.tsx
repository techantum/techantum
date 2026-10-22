'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { ChartCard, EMPTY_FILTERS, MonthBarChart, ResearchFilters, SimpleBars, VideoMiniTable, applyPreset, handleLabel, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import { metric, ProjectRequired, useProjectId, yt } from '@/components/admin/youtube/YoutubeFrame';

function Overview() {
  const projectId = useProjectId();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [insights, setInsights] = useState<Record<string, any> | null>(null);
  const [filterOptions, setFilterOptions] = useState<ResearchFilterOptions>({});
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [error, setError] = useState('');

  const load = async (next = filters) => {
    const params = new URLSearchParams(next);
    const [overview, insightRows] = await Promise.all([yt(`projects/${projectId}/overview`), yt(`projects/${projectId}/insights?${params}`)]);
    setData(overview);
    setInsights(insightRows);
  };

  useEffect(() => {
    if (!projectId) return;
    Promise.all([yt(`projects/${projectId}/filters`), load()]).then(([options]) => setFilterOptions(options)).catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const own = data?.project?.channels?.find((channel: { relationship: string }) => channel.relationship === 'own');
  const competitors = data?.project?.channels?.filter((channel: { relationship: string }) => channel.relationship === 'competitor') || [];
  const channels = own ? [own, ...competitors] : competitors;
  const months = (insights?.months || []).map((item: Record<string, any>) => ({ month: item.month, Imported: item.imported, Views: item.views }));

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminStatCard label="Own channel" value={own ? 1 : 0} icon="PlayCircleIcon" />
            <AdminStatCard label="Competitor channels" value={competitors.length} icon="UserGroupIcon" />
            <AdminStatCard label="Imported videos" value={metric(insights?.imported ?? data.videos)} icon="FilmIcon" />
            <AdminStatCard label="Videos categorized" value={metric(insights?.categorized ?? data.categorized)} icon="TagIcon" />
            <AdminStatCard label="Awaiting review" value={metric(data.awaitingReview)} icon="ClockIcon" />
          </div>
          <ResearchFilters
            value={filters}
            options={filterOptions}
            onChange={setFilters}
            onApply={(next) => { const used = next || filters; setFilters(used); load(used).catch((err) => setError(err.message)); }}
            onReset={() => { const next = { ...EMPTY_FILTERS, ...applyPreset('all') }; setFilters(next); load(next).catch((err) => setError(err.message)); }}
          />
          {!own ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No channels added yet. Add your YouTube channel to begin competitor research.</p> : null}
          {own && !competitors.length ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Add competitor channels to start comparing content.</p> : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Imported videos by month" hint="Publish months of videos saved in this project.">
              <MonthBarChart data={months} bars={[{ key: 'Imported', color: '#EA580C' }]} />
            </ChartCard>
            <ChartCard title="Public views of imported videos" hint="Current lifetime public views for videos published that month. Not monthly Analytics.">
              <MonthBarChart data={months} bars={[{ key: 'Views', color: '#2563EB' }]} />
            </ChartCard>
          </div>
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <AdminSection title="Project channels" icon="UserGroupIcon" action={<Link className="text-sm font-semibold text-secondary" href="/admin/youtube-research/channels">{own ? 'Manage channels' : 'Add own channel'}</Link>}>
                {channels.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {channels.slice(0, 6).map((channel: Record<string, any>) => (
                      <Link key={channel.id} href={`/admin/youtube-research/videos?channel=${channel.id}`} className="flex gap-3 rounded-xl border border-slate-100 p-3 hover:border-slate-200">
                        {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">YT</span>}
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900">{channel.channel_name || channel.youtube_channel_id}</span>
                            <AdminBadge variant={channel.relationship === 'own' ? 'indigo' : 'default'}>{channel.relationship === 'own' ? 'Own' : 'Competitor'}</AdminBadge>
                          </span>
                          <span className="mt-1 block truncate text-xs text-slate-500">{handleLabel(channel.channel_handle) || channel.youtube_channel_id}</span>
                          <span className="mt-1 block text-xs text-slate-500">{metric(channel.subscriber_count)} subscribers · {metric(channel.video_count)} public videos · {metric(channel.videos_imported)} imported</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-500">Channels you add for this project appear here.</p>}
              </AdminSection>
            </div>
            <div className="xl:col-span-2">
              <ChartCard title="Topics on imported videos">
                <SimpleBars rows={(insights?.topics || []).map((item: { topic: string; count: number }) => ({ label: item.topic, value: item.count }))} />
              </ChartCard>
            </div>
          </div>
          <VideoMiniTable title="Recent videos" href="/admin/youtube-research/videos" rows={insights?.recentVideos || data.recentVideos || []} empty="Import videos to see them here." />
          <p className="text-xs text-slate-400">{data.notice}</p>
        </>
      ) : !error ? <p className="text-sm text-slate-500">Loading overview...</p> : null}
    </div>
  );
}

export default function OverviewPage() {
  return <ProjectRequired><Overview /></ProjectRequired>;
}
