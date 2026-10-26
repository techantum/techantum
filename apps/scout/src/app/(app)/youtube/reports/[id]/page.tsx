'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { downloadResearchReport } from '@/components/admin/youtube/research-ui';
import { ProjectRequired, useProjectId, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import { COMPARISON_UNAVAILABLE, comparisonTable, type GapVideo } from '@/lib/youtube/gap-cards';

function ReportView() {
  const params = useParams<{ id: string }>();
  const reportId = params?.id || '';
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const router = useRouter();
  const [name, setName] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');
  const [videos, setVideos] = useState<GapVideo[]>([]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!projectId || !reportId) return;
    let cancelled = false;
    (async () => {
      try {
        const report = await yt(`projects/${projectId}/research-reports/${reportId}`);
        let rows = (report.payload?.evidence?.videos || []) as GapVideo[];
        if (!rows.length && report.analysis_id) {
          const analysis = await yt(`projects/${projectId}/ai-analyses/${report.analysis_id}`);
          rows = (analysis.evidence?.videos || []) as GapVideo[];
        }
        if (cancelled) return;
        setName(report.name || 'Video comparison');
        setGeneratedAt(String(report.generated_at || '').slice(0, 16).replace('T', ' '));
        setVideos(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not open this report');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, reportId]);

  const remove = async () => {
    if (!window.confirm(`Delete “${name || 'this report'}”?`)) return;
    setDeleting(true);
    setError('');
    try {
      await yt(`projects/${projectId}/research-reports/${reportId}`, { method: 'DELETE' });
      router.push(`${base}/reports`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete report');
      setDeleting(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      await downloadResearchReport(projectId, reportId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the report');
    } finally {
      setDownloading(false);
    }
  };

  if (!ready && !error) return <PageLoader label="Loading report…" />;

  const table = comparisonTable(videos);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={`${base}/reports`} className="text-sm font-semibold text-slate-600 hover:text-secondary">← Reports</Link>
          <h2 className="mt-2 font-bricolage text-xl font-bold text-slate-900">{name}</h2>
          <p className="mt-1 text-sm text-slate-500">{generatedAt ? `Generated ${generatedAt}` : 'Video comparison'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminButton variant="outline-danger" loading={deleting} onClick={remove}>Delete</AdminButton>
          <AdminButton variant="primary" loading={downloading} onClick={download}>Download</AdminButton>
        </div>
      </div>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <p className="text-xs text-slate-500">Length is the video duration. Thumbnail words are read from the image. YouTube does not publish watch hours, geography, ages watched, or genders watched for these videos, so those rows stay {COMPARISON_UNAVAILABLE.toLowerCase()}.</p>
      {table.videos.length ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Detail</th>
                  {table.videos.map((video) => (
                    <th key={video.id} className="min-w-[220px] px-4 py-3 font-semibold normal-case tracking-normal">
                      <span className="flex items-center gap-2">
                        {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-10 w-16 rounded-lg object-cover" /> : <span className="h-10 w-16 rounded-lg bg-slate-100" />}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">{video.title}</span>
                          <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-400">{video.role}</span>
                          {video.watchUrl ? <a className="text-[11px] font-semibold normal-case tracking-normal text-secondary" href={video.watchUrl} target="_blank" rel="noreferrer">Open on YouTube</a> : null}
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100 align-top">
                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{row.label}</th>
                    {row.values.map((value, index) => {
                      const video = table.videos[index];
                      return (
                        <td key={`${row.label}-${video?.id || index}`} className={`px-4 py-3 text-slate-700 ${value === COMPARISON_UNAVAILABLE ? 'text-slate-400' : ''}`}>
                          {row.label === 'Thumbnail' && video?.thumbnailUrl ? (
                            <img src={video.thumbnailUrl} alt="" loading="lazy" className="h-24 w-40 rounded-lg object-cover" />
                          ) : value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">This report has no saved videos to compare. Generate a new report from the Videos page.</p>
      )}
    </div>
  );
}

export default function ReportViewPage() {
  return (
    <ProjectRequired>
      <ReportView />
    </ProjectRequired>
  );
}
