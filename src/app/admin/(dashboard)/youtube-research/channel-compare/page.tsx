'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AnalysisComplete from '@/components/admin/youtube/AnalysisComplete';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { allow, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, useYoutubeRailActions, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import { compactCount, formatPublished } from '@/lib/youtube/analysis-display';

function AnalysisWorkspace() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const router = useRouter();
  const search = useSearchParams();
  const analysisId = search?.get('id') || '';
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [current, setCurrent] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  const listHref = `${base}/channel-compare`;

  useEffect(() => {
    if (!projectId) return;
    setReady(false);
    setError('');
    (async () => {
      try {
        if (analysisId) {
          setCurrent(await yt(`projects/${projectId}/ai-analyses/${analysisId}`));
        } else {
          setCurrent(null);
          setRows(await yt(`projects/${projectId}/ai-analyses`).then((listed) => listed.rows || listed || []));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load analysis');
        setCurrent(null);
      } finally {
        setReady(true);
      }
    })();
  }, [projectId, analysisId]);

  const headerActions = useMemo(() => (
    analysisId ? (
      <Link className={partnerBtnSecondary} href={listHref}>← Back to analysis list</Link>
    ) : (
      <>
        {manage ? (
          <Link className={partnerBtnSecondary} href={`${base}/channels?from=analysis`}>
            <Icon name="UserGroupIcon" size={16} /> Channel management
          </Link>
        ) : null}
        <Link className={partnerBtnPrimary} href={`${base}/videos`}>
          <Icon name="SparklesIcon" size={16} /> Analyse videos
        </Link>
      </>
    )
  ), [analysisId, base, listHref, manage]);
  useYoutubeRailActions(headerActions);

  const saveAction = async (id: string, status: string) => {
    try {
      await yt(`projects/${projectId}/ai-actions/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (analysisId) setCurrent(await yt(`projects/${projectId}/ai-analyses/${analysisId}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update action');
    }
  };

  const videos = rows.flatMap((row) => (Array.isArray(row.videos) ? row.videos : []).map((video: Record<string, any>) => ({
    ...video,
    analysisId: row.id,
    analysisName: row.name,
    analysisStatus: row.status,
    analysedAt: row.created_at,
  })));

  if (!ready && !error) return <PageLoader label={analysisId ? 'Loading analysis result…' : 'Loading analysed videos…'} />;

  if (analysisId) {
    return (
      <div className="space-y-4">
        {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={listHref} className="inline-flex items-center gap-1 text-sm font-semibold text-secondary">
            ← Back to analysis list
          </Link>
        </div>
        {current?.status === 'ready' ? (
          <AnalysisComplete analysis={current} onStatus={saveAction} />
        ) : current ? (
          <p className="text-sm text-slate-500">This analysis is {current.status}. {current.error_summary || 'Open the list and try another run from Research.'}</p>
        ) : !error ? (
          <PageLoader label="Loading analysis result…" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bricolage text-xl font-semibold text-slate-900">Analysed videos</h2>
          <p className="text-sm text-slate-500">Each row is a video from a completed analysis. Open the result for goal gaps, suggestions, and full stats.</p>
        </div>
        <Link href={`${base}/videos`} className={partnerBtnPrimary}>Select videos on Research</Link>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Video</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Views</th>
                <th className="px-4 py-3 text-right">Likes</th>
                <th className="px-4 py-3 text-right">Comments</th>
                <th className="px-4 py-3">Analysis</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={`${video.analysisId}-${video.id}`} className="border-t border-slate-50 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-12 w-[4.5rem] rounded-lg object-cover" /> : <span className="h-12 w-[4.5rem] rounded-lg bg-slate-100" />}
                      <span className="line-clamp-2 font-medium text-slate-900">{video.title || video.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{video.relationship === 'own' ? 'You' : 'Competitor'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatPublished(video.published_at)}</td>
                  <td className="px-4 py-3 text-right font-medium">{compactCount(video.view_count)}</td>
                  <td className="px-4 py-3 text-right">{compactCount(video.like_count)}</td>
                  <td className="px-4 py-3 text-right">{compactCount(video.comment_count)}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-500">{video.analysisName}</p>
                    <AdminBadge variant={video.analysisStatus === 'ready' ? 'green' : video.analysisStatus === 'failed' ? 'rose' : 'default'}>{video.analysisStatus}</AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-sm font-semibold text-secondary" onClick={() => router.push(`${listHref}?id=${video.analysisId}`)}>Open result</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!videos.length ? (
          <div className="px-4 py-12 text-center">
            <p className="font-semibold text-slate-800">No analysed videos yet</p>
            <p className="mt-1 text-sm text-slate-500">Select videos on Research, choose objectives, then generate an analysis.</p>
            <Link href={`${base}/videos`} className={`${partnerBtnPrimary} mt-4`}>Go to Research</Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default function ChannelComparePage() {
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading analysis…" />}>
        <AnalysisWorkspace />
      </Suspense>
    </ProjectRequired>
  );
}
