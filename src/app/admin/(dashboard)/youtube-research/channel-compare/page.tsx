'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import { CHANNEL_COLORS, ChartCard, EMPTY_FILTERS, MonthBarChart, ResearchFilters, SimpleBars, VideoMiniTable, applyPreset, downloadProjectExport, handleLabel, mergeMonths, type ResearchFilterOptions } from '@/components/admin/youtube/research-ui';
import { metric, ProjectRequired, useProjectId, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

function ChannelCompare() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const [projectName, setProjectName] = useState('');
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [filterOptions, setFilterOptions] = useState<ResearchFilterOptions>({});
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [tab, setTab] = useState('overview');
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([yt(`projects/${projectId}`), yt(`projects/${projectId}/channels`), yt(`projects/${projectId}/filters`)]).then(([project, channelRows, options]) => {
      setProjectName(project.name || '');
      setChannels(channelRows);
      setFilterOptions(options);
      setSelected(channelRows.slice(0, 6).map((channel: { id: string }) => channel.id));
    }).catch((err) => setError(err.message));
  }, [projectId]);

  const compare = async (ids = selected, next = filters) => {
    if (!ids.length) {
      setError('Select at least one channel.');
      return;
    }
    const params = new URLSearchParams({ ...next, ids: ids.join(',') });
    try {
      setBusy(true);
      setData(await yt(`projects/${projectId}/compare/channels?${params}`));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not compare channels');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (projectId && selected.length) compare(selected, filters).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, selected.join(',')]);

  const compared = data?.channels || [];
  const monthRows = useMemo(() => mergeMonths(compared), [compared]);
  const importedBars = compared.map((channel: Record<string, any>, index: number) => ({
    key: `${channel.channel_name || channel.youtube_channel_id} imported`,
    color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
  }));
  const viewBars = compared.map((channel: Record<string, any>, index: number) => ({
    key: `${channel.channel_name || channel.youtube_channel_id} views`,
    color: CHANNEL_COLORS[index % CHANNEL_COLORS.length],
  }));

  const toggle = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      return [...current, id].slice(0, 6);
    });
  };

  const exportFile = async (format: 'xlsx' | 'docx') => {
    try {
      await downloadProjectExport({
        type: 'competitors',
        format,
        project_id: projectId,
        project_name: projectName,
        channel_ids: selected,
        ...filters,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={`${base}/channels`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-secondary">
            ← Back to Channels
          </Link>
          <h2 className="mt-2 font-bricolage text-xl font-bold text-slate-900">Channel Comparison</h2>
          <p className="mt-1 text-sm text-slate-500">Public YouTube Data API values and imported videos for this project. These counts are not YouTube Analytics and are not a ranking.</p>
        </div>
        <span className="flex flex-wrap gap-2">
          <Link href={`${base}/channels`} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Back to Channels</Link>
          <AdminButton variant="primary" disabled={!selected.length} onClick={() => exportFile('xlsx')}>Excel report</AdminButton>
          <AdminButton disabled={!selected.length} onClick={() => exportFile('docx')}>Word report</AdminButton>
        </span>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-slate-800">Select channels to compare</p>
          <span className="flex flex-wrap gap-2 text-xs font-semibold">
            <button type="button" className="text-secondary" onClick={() => setSelected(channels.slice(0, 6).map((channel) => channel.id))}>Select all</button>
            <button type="button" className="text-slate-600" onClick={() => setSelected(channels.filter((channel) => channel.relationship === 'own').map((channel) => channel.id))}>Own only</button>
            <button type="button" className="text-slate-600" onClick={() => setSelected(channels.filter((channel) => channel.relationship === 'competitor').slice(0, 6).map((channel) => channel.id))}>Competitors only</button>
            <button type="button" className="text-slate-600" onClick={() => setSelected([])}>Clear all</button>
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {channels.map((channel) => (
            <label key={channel.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${selected.includes(channel.id) ? 'border-secondary bg-orange-50/40' : 'border-slate-200'}`}>
              <input type="checkbox" className="mt-1" checked={selected.includes(channel.id)} onChange={() => toggle(channel.id)} />
              {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs">YT</span>}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{channel.channel_name || channel.youtube_channel_id}</span>
                <span className="block truncate text-xs text-slate-500">{handleLabel(channel.channel_handle) || channel.youtube_channel_id}</span>
                <AdminBadge variant={channel.relationship === 'own' ? 'indigo' : 'default'}>{channel.relationship === 'own' ? 'Own channel' : 'Competitor'}</AdminBadge>
              </span>
            </label>
          ))}
          <Link href={`${base}/channels`} className="flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-500">+ Add channel</Link>
        </div>
      </section>
      <ResearchFilters
        value={filters}
        options={filterOptions}
        onChange={setFilters}
        onApply={(next) => { const used = next || filters; setFilters(used); compare(selected, used); }}
        onReset={() => { const next = { ...EMPTY_FILTERS, ...applyPreset('all') }; setFilters(next); compare(selected, next); }}
      />
      {data ? (
        <>
          <p className="text-xs text-slate-500">{data.notice} The Data API does not provide subscriber or view history, so growth percentages are not shown.</p>
          <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
            {[['overview', 'Overview'], ['totals', 'Public totals'], ['content', 'Content analysis'], ['posting', 'Posting frequency']].map(([id, label]) => (
              <button key={id} type="button" className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === id ? 'bg-secondary text-white' : 'text-slate-600'}`} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          {tab === 'overview' || tab === 'totals' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {compared.map((channel: Record<string, any>) => (
                <div key={channel.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : null}
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{channel.channel_name || channel.youtube_channel_id}</p>
                      <AdminBadge variant={channel.relationship === 'own' ? 'indigo' : 'default'}>{channel.relationship === 'own' ? 'Own' : 'Competitor'}</AdminBadge>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-[10px] uppercase text-slate-400">Subscribers</p><p className="font-semibold">{metric(channel.subscriber_count)}</p></div>
                    <div><p className="text-[10px] uppercase text-slate-400">Public videos</p><p className="font-semibold">{metric(channel.video_count)}</p></div>
                    <div><p className="text-[10px] uppercase text-slate-400">Channel views</p><p className="font-semibold">{metric(channel.view_count)}</p></div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{metric(channel.insights?.imported)} imported videos match the filters · {metric(channel.insights?.views)} public views on those imported rows</p>
                </div>
              ))}
            </div>
          ) : null}
          {tab === 'overview' || tab === 'posting' ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard title="Videos published" hint="Counts of imported videos by publish month, not audience reach.">
                <MonthBarChart data={monthRows} bars={importedBars} />
              </ChartCard>
              <ChartCard title="Public views of imported videos" hint="Current lifetime public views for videos published that month. This is not monthly Analytics.">
                <MonthBarChart data={monthRows} bars={viewBars} />
              </ChartCard>
            </div>
          ) : null}
          {tab === 'totals' ? (
            <div className="grid gap-4 xl:grid-cols-3">
              <ChartCard title="Current subscribers"><SimpleBars rows={compared.map((channel: Record<string, any>) => ({ label: channel.channel_name || channel.youtube_channel_id, value: Number(channel.subscriber_count || 0) }))} /></ChartCard>
              <ChartCard title="Current public video count"><SimpleBars rows={compared.map((channel: Record<string, any>) => ({ label: channel.channel_name || channel.youtube_channel_id, value: Number(channel.video_count || 0) }))} color="#0F766E" /></ChartCard>
              <ChartCard title="Current channel views"><SimpleBars rows={compared.map((channel: Record<string, any>) => ({ label: channel.channel_name || channel.youtube_channel_id, value: Number(channel.view_count || 0) }))} color="#2563EB" /></ChartCard>
            </div>
          ) : null}
          {tab === 'content' ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {compared.map((channel: Record<string, any>, index: number) => (
                <ChartCard key={channel.id} title={`${channel.channel_name || channel.youtube_channel_id} topics`} hint="Project topics on imported videos.">
                  <SimpleBars color={CHANNEL_COLORS[index % CHANNEL_COLORS.length]} rows={(channel.insights?.topics || []).map((item: { topic: string; count: number }) => ({ label: item.topic, value: item.count }))} />
                </ChartCard>
              ))}
            </div>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <VideoMiniTable title="Top imported videos" href={`${base}/videos`} rows={compared.flatMap((channel: Record<string, any>) => channel.insights?.topVideos || []).sort((a: Record<string, any>, b: Record<string, any>) => Number(b.view_count || 0) - Number(a.view_count || 0)).slice(0, 8)} empty="Import videos to compare public view counts." />
            <VideoMiniTable title="Recent imported videos" href={`${base}/videos`} rows={compared.flatMap((channel: Record<string, any>) => channel.insights?.recentVideos || []).sort((a: Record<string, any>, b: Record<string, any>) => String(b.published_at || '').localeCompare(String(a.published_at || ''))).slice(0, 8)} empty="No imported videos match these filters." />
          </div>
        </>
      ) : busy ? <p className="text-sm text-slate-500">Loading comparison...</p> : null}
    </div>
  );
}

export default function ChannelComparePage() {
  return <ProjectRequired><ChannelCompare /></ProjectRequired>;
}
