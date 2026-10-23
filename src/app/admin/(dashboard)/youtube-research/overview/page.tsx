'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminSection from '@/components/admin/AdminSection';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { ChartCard, MonthBarChart, VideoMiniTable, handleLabel } from '@/components/admin/youtube/research-ui';
import { metric, ProjectRequired, useProjectId, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

function Overview() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [insights, setInsights] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!projectId) return;
    yt(`projects/${projectId}/overview`)
      .then((overview) => {
        setData(overview);
        setInsights(overview.insights || null);
      })
      .catch((err) => setError(err.message));
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
          <div className="reveal-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminStatCard label="Own channel" value={own ? 1 : 0} icon="PlayCircleIcon" />
            <AdminStatCard label="Competitor channels" value={competitors.length} icon="UserGroupIcon" />
            <AdminStatCard label="Imported videos" value={metric(insights?.imported ?? data.videos)} icon="FilmIcon" />
            <AdminStatCard label="Videos categorized" value={metric(insights?.categorized ?? data.categorized)} icon="TagIcon" />
            <AdminStatCard label="Awaiting review" value={metric(data.awaitingReview)} icon="ClockIcon" />
          </div>
          {!own ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No channels added yet. Add your YouTube channel to begin competitor research.</p> : null}
          {own && !competitors.length ? <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Add competitor channels to start comparing content.</p> : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Imported videos by month" hint="Publish months of videos saved in this project.">
              <MonthBarChart data={months} bars={[{ key: 'Imported', color: '#EA580C' }]} empty="Import videos to see this chart." />
            </ChartCard>
            <ChartCard title="Public views of imported videos" hint="Current lifetime public views for videos published that month. Not monthly Analytics.">
              <MonthBarChart data={months} bars={[{ key: 'Views', color: '#2563EB' }]} empty="Import videos to see this chart." />
            </ChartCard>
          </div>
          <AdminSection title="Project channels" icon="UserGroupIcon" action={<Link className="text-sm font-semibold text-secondary" href={`${base}/channels`}>{own ? 'Manage channels' : 'Add own channel'}</Link>}>
            {channels.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {channels.slice(0, 6).map((channel: Record<string, any>) => (
                  <Link key={channel.id} href={`${base}/videos?channel=${channel.id}`} className="ui-card flex gap-3 rounded-xl border border-slate-100 p-3">
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
          <VideoMiniTable title="Recent videos" href={`${base}/videos`} rows={insights?.recentVideos || data.recentVideos || []} empty="Import videos to see them here." />
          <p className="text-xs text-slate-400">{data.notice}</p>
        </>
      ) : !error ? <p className="text-sm text-slate-500">Loading overview...</p> : null}
    </div>
  );
}

export default function OverviewPage() {
  return <ProjectRequired><Overview /></ProjectRequired>;
}
