'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import AdminStatCard from '@/components/admin/AdminStatCard';
import { CHANNEL_COLORS, ChartCard, MonthBarChart, PlacementBadge, downloadProjectExport } from '@/components/admin/youtube/research-ui';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { metric, ProjectRequired, useProjectId, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

function CompareVideos() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const search = useSearchParams();
  const ids = search?.get('ids') || '';
  const [videos, setVideos] = useState<Record<string, any>[]>([]);
  const [projectName, setProjectName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState<'xlsx' | 'docx' | ''>('');

  useEffect(() => {
    if (!projectId || ids.split(',').filter(Boolean).length < 2) {
      setReady(true);
      return;
    }
    Promise.all([yt(`projects/${projectId}`), yt(`projects/${projectId}/compare/videos?ids=${ids}`)]).then(([project, body]) => {
      setProjectName(project.name || '');
      setVideos(body.videos || []);
      setNotice(body.notice || '');
    }).catch((err) => setError(err.message)).finally(() => setReady(true));
  }, [projectId, ids]);

  const exportFile = async (format: 'xlsx' | 'docx') => {
    try {
      setExporting(format);
      await downloadProjectExport({
        type: 'comparison',
        format,
        project_id: projectId,
        project_name: projectName,
        video_ids: videos.map((video) => video.id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export');
    } finally {
      setExporting('');
    }
  };

  const rows: { label: string; render: (video: Record<string, any>) => React.ReactNode }[] = [
    { label: 'Channel', render: (video) => video.channel_name || '—' },
    { label: 'Published', render: (video) => video.published_at ? String(video.published_at).slice(0, 10) : '—' },
    { label: 'Duration', render: (video) => video.duration || '—' },
    { label: 'Content on thumbnail', render: (video) => video.thumbnail_caption || 'Not recorded' },
    { label: 'Organic or paid', render: (video) => <PlacementBadge value={video.placement_label} /> },
    { label: 'Video viewership', render: (video) => metric(video.view_count) },
    { label: 'Watch hours', render: () => '—' },
    { label: 'Likes', render: (video) => metric(video.like_count) },
    { label: 'Comments', render: (video) => metric(video.comment_count) },
    { label: 'Tags', render: (video) => video.stale ? 'Refresh required' : (video.tags?.length ? video.tags.join(', ') : 'No tags available') },
    { label: 'Topic', render: (video) => video.topic_name || '—' },
    { label: 'Category', render: (video) => video.category_label || '—' },
  ];
  const chart = videos.map((video) => ({
    month: String(video.title || video.youtube_video_id).slice(0, 22),
    Views: video.view_count,
    Likes: video.like_count,
    Comments: video.comment_count,
  }));

  if (!ready && !error) return <PageLoader label="Loading comparison…" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={`${base}/videos`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-secondary">
            ← Back to research
          </Link>
          <p className="mt-2 text-sm text-slate-500">Public counts sit side by side. A higher number is not a claim that the title or thumbnail caused it.</p>
        </div>
        {videos.length >= 2 ? (
          <span className="flex flex-wrap gap-2">
            <AdminButton variant="primary" loading={exporting === 'xlsx'} disabled={Boolean(exporting)} onClick={() => exportFile('xlsx')}>Excel report</AdminButton>
            <AdminButton loading={exporting === 'docx'} disabled={Boolean(exporting)} onClick={() => exportFile('docx')}>Word report</AdminButton>
          </span>
        ) : null}
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {notice ? <p className="text-xs text-slate-500">{notice}</p> : null}
      {!ids || ids.split(',').filter(Boolean).length < 2 ? <p className="text-sm text-slate-500">Select at least two videos on the Videos page.</p> : null}
      {videos.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {videos.map((video) => (
              <div key={video.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" loading="lazy" className="mb-2 h-28 w-full rounded-lg object-cover" /> : <div className="mb-2 h-28 rounded-lg bg-slate-100" />}
                <p className="line-clamp-2 text-sm font-semibold">{video.title || video.youtube_video_id}</p>
                <p className="mt-1 text-xs text-slate-500">{video.channel_name || '—'}</p>
                <AdminBadge variant={video.relationship === 'own' ? 'indigo' : 'default'}>{video.relationship === 'own' ? 'Own' : 'Competitor'}</AdminBadge>
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminStatCard label="Videos compared" value={videos.length} icon="FilmIcon" />
            <AdminStatCard label="Videos with view counts" value={videos.filter((video) => video.view_count != null).length} icon="ChartBarIcon" />
            <AdminStatCard label="Highest public views" value={metric(Math.max(...videos.map((video) => Number(video.view_count || 0))))} hint="Current public count, not Analytics" />
          </div>
          <ChartCard title="Public counts" hint="Current public view, like, and comment counts. Missing values stay blank.">
            <MonthBarChart data={chart} bars={[{ key: 'Views', color: CHANNEL_COLORS[0] }, { key: 'Likes', color: CHANNEL_COLORS[1] }, { key: 'Comments', color: CHANNEL_COLORS[2] }]} />
          </ChartCard>
          <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-400">
                  <th className="px-3 py-3">Detail</th>
                  {videos.map((video) => <th key={video.id} className="px-3 py-3">{video.title || video.youtube_video_id}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-500">{row.label}</td>
                    {videos.map((video) => <td key={video.id} className="px-3 py-3 align-top">{row.render(video)}</td>)}
                  </tr>
                ))}
                <tr className="border-t border-slate-100">
                  <td className="px-3 py-3 font-semibold text-slate-500">Description</td>
                  {videos.map((video) => (
                    <td key={video.id} className="px-3 py-3 align-top">
                      <p className={expanded.includes(video.id) ? 'whitespace-pre-wrap' : 'line-clamp-3 whitespace-pre-wrap'}>{video.description || '—'}</p>
                      {video.description ? <button type="button" className="mt-1 text-xs font-semibold text-sky-700" onClick={() => setExpanded((current) => current.includes(video.id) ? current.filter((id) => id !== video.id) : [...current, video.id])}>{expanded.includes(video.id) ? 'Collapse' : 'View full description'}</button> : null}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>
        </>
      ) : null}
      <Link className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700" href={`${base}/videos`}>Back to research</Link>
    </div>
  );
}

export default function ComparePage() {
  return <ProjectRequired><Suspense fallback={<PageLoader label="Loading comparison…" />}><CompareVideos /></Suspense></ProjectRequired>;
}
