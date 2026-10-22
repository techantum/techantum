'use client';

import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminButton from '@/components/admin/AdminButton';
import AdminSection from '@/components/admin/AdminSection';
import { PlacementBadge } from '@/components/admin/youtube/research-ui';
import { metric, ProjectRequired, useProjectId, yt } from '@/components/admin/youtube/YoutubeFrame';
import Icon from '@/components/ui/AppIcon';

const LENSES = [
  { id: 'views', label: 'Highest views', icon: 'EyeIcon' },
  { id: 'likes', label: 'Highest liked videos', icon: 'HandThumbUpIcon' },
  { id: 'engagement', label: 'Highest engagement', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'quiet', label: 'No / low engagement', icon: 'FaceFrownIcon' },
  { id: 'why', label: 'Why more engagement', icon: 'SparklesIcon' },
];

function VideoTable({ rows, empty }: { rows: Record<string, any>[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400">
            {['Video', 'Channel', 'Type', 'Views', 'Likes', 'Comments', 'Likes + comments', 'Per 1k views'].map((heading) => (
              <th key={heading} className="px-2 py-2">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((video) => (
            <tr key={video.id} className="border-t border-slate-100">
              <td className="px-2 py-2">
                <span className="flex items-center gap-2">
                  {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-9 w-14 rounded object-cover" /> : <span className="h-9 w-14 rounded bg-slate-100" />}
                  <span className="min-w-0">
                    <a className="block max-w-[240px] truncate font-medium text-slate-900 hover:text-secondary" href={video.watch_url || '#'} target="_blank" rel="noreferrer">
                      {video.title || video.youtube_video_id}
                    </a>
                    <span className="mt-1 flex flex-wrap items-center gap-1">
                      <PlacementBadge value={video.placement_label} />
                      {video.published_at ? <span className="text-[11px] text-slate-400">{video.published_at}</span> : null}
                    </span>
                  </span>
                </span>
              </td>
              <td className="px-2 py-2">
                <AdminBadge variant={video.relationship === 'own' ? 'indigo' : 'default'}>{video.relationship === 'own' ? 'Own' : 'Competitor'}</AdminBadge>
                <span className="ml-2 text-slate-600">{video.channel_name || '—'}</span>
              </td>
              <td className="px-2 py-2 text-slate-600">{video.content_label || '—'}</td>
              <td className="px-2 py-2">{metric(video.view_count)}</td>
              <td className="px-2 py-2">{metric(video.like_count)}</td>
              <td className="px-2 py-2">{metric(video.comment_count)}</td>
              <td className="px-2 py-2 font-medium">{metric(video.engagement_actions)}</td>
              <td className="px-2 py-2">{video.actions_per_1k_views == null ? '—' : video.actions_per_1k_views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Analysis() {
  const projectId = useProjectId();
  const [lens, setLens] = useState('views');
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async (next = lens) => {
    setError('');
    const body = await yt(`projects/${projectId}/analysis?lens=${next}`);
    setData(body);
    if (next !== 'why') setSummary(null);
  };

  useEffect(() => {
    if (!projectId) return;
    load('views').catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const choose = (next: string) => {
    setLens(next);
    load(next).catch((err) => setError(err.message));
  };

  const summarize = async () => {
    try {
      setBusy(true);
      setError('');
      const body = await yt(`projects/${projectId}/analysis/summarize`, { method: 'POST' });
      setData(body);
      setSummary(body.summary || null);
      setLens('why');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not summarise with AI');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <p className="text-sm text-slate-500">{data?.notice || 'Use public view, like, and comment counts to see what is getting attention and what is not.'}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {LENSES.map((item) => {
          const active = lens === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => choose(item.id)}
              className={`rounded-2xl border p-4 text-left transition ${active ? 'border-secondary bg-orange-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <span className={`inline-flex items-center gap-2 text-sm font-semibold ${active ? 'text-secondary' : 'text-slate-800'}`}>
                <Icon name={item.icon} size={18} />
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      {lens === 'why' ? (
        <>
          <AdminSection
            title="AI summary"
            icon="SparklesIcon"
            description="Compares high-interaction videos with videos that have views but little likes or comments."
            action={<AdminButton variant="primary" disabled={busy} onClick={summarize}>{busy ? 'Summarising…' : 'Summarise with AI'}</AdminButton>}
          >
            {summary ? (
              <div className="space-y-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{summary.headline}</p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Why more engagement</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">{(summary.why_high || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Why little engagement</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">{(summary.why_low || []).map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
                {(summary.patterns || []).length ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patterns</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">{summary.patterns.map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                {(summary.suggestions || []).length ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">What to test</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">{summary.suggestions.map((item: string) => <li key={item}>{item}</li>)}</ul>
                  </div>
                ) : null}
                {summary.model ? <p className="text-xs text-slate-400">Generated with {summary.provider} · {summary.model}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Library observations are listed below. Use Summarise with AI for a written explanation of why some videos get more likes and comments.</p>
            )}
          </AdminSection>
          {(data?.observations || []).length ? (
            <AdminSection title="Library observations" icon="LightBulbIcon">
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {data.observations.map((item: string) => <li key={item}>{item}</li>)}
              </ul>
            </AdminSection>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <AdminSection title="Highest engagement" icon="ChatBubbleLeftRightIcon">
              <VideoTable rows={data?.high || []} empty="Refresh imported videos to rank likes and comments." />
            </AdminSection>
            <AdminSection title="No / low engagement" icon="FaceFrownIcon">
              <VideoTable rows={data?.low || []} empty="No videos with views and little interaction yet." />
            </AdminSection>
          </div>
        </>
      ) : (
        <AdminSection title={LENSES.find((item) => item.id === lens)?.label || 'Analysis'} icon="ChartBarIcon">
          <VideoTable
            rows={data?.rows || []}
            empty="Import and refresh videos in this project to rank views, likes, and comments."
          />
        </AdminSection>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ProjectRequired>
      <Analysis />
    </ProjectRequired>
  );
}
