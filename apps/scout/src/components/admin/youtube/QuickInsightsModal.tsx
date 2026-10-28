'use client';

import Icon from '@/components/ui/AppIcon';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import { compactCount } from '@/lib/youtube/analysis-display';

function observations(videos: Record<string, any>[]) {
  const ranked = [...videos].sort((a, b) => Number(b.view_count || 0) - Number(a.view_count || 0));
  const top = ranked[0];
  const low = ranked[ranked.length - 1];
  const shorts = videos.filter((video) => String(video.content_label || video.contentLabel || '').toLowerCase().includes('short')).length;
  const lines = [
    top ? `Highest public views: “${top.title}” (${compactCount(top.view_count)}). That is a packaging and topic signal, not a retention score.` : '',
    low && top && low.id !== top.id ? `Lowest public views in this set: “${low.title}”. Compare its title and thumbnail to the leader before changing SEO.` : '',
    shorts ? `${shorts} of ${videos.length} selected videos are Shorts. Treat Shorts and long-form as separate tests.` : 'These look like long-form videos. Open with a stronger hook if retention is the goal.',
    'CTR, impressions, and audience retention are not in public YouTube Data. Connect Analytics or share those metrics for a diagnosis.',
    'Next: rewrite the weaker titles to match the winner’s curiosity gap, then test one thumbnail change at a time.',
  ];
  return lines.filter(Boolean);
}

export default function QuickInsightsModal({
  videos,
  onClose,
  onAnalyze,
}: {
  videos: Record<string, any>[];
  onClose: () => void;
  onAnalyze: () => void;
}) {
  const lines = observations(videos);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">Quick Insights</p>
            <h2 className="font-bricolage text-2xl font-bold text-slate-900">What stands out in this set</h2>
            <p className="mt-1 text-sm text-slate-500">Based on public views, likes, and titles only. This is not a private Analytics report.</p>
          </div>
          <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-slate-50" onClick={onClose} aria-label="Close">
            <Icon name="XMarkIcon" size={18} />
          </button>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {videos.slice(0, 6).map((video) => (
            <li key={video.id} className="overflow-hidden rounded-2xl border border-slate-100">
              <span className="relative block h-24 bg-slate-100">
                <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
              </span>
              <p className="truncate px-2 py-2 text-xs font-semibold text-slate-800">{video.title}</p>
            </li>
          ))}
        </ul>
        <ol className="mt-4 space-y-3">
          {lines.map((line) => (
            <li key={line} className="flex gap-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm leading-6 text-slate-700">
              <Icon name="LightBulbIcon" size={18} className="mt-0.5 shrink-0 text-violet-600" />
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600" onClick={onClose}>Close</button>
          <button type="button" className="rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white" onClick={onAnalyze}>Analyze Selected</button>
        </div>
      </div>
    </div>
  );
}
