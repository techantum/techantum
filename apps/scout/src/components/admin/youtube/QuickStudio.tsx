'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AnalyseModal, { type AnalyseConfig } from '@/components/admin/youtube/AnalyseModal';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import { rememberProject, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import VideoThumb from '@/components/admin/youtube/VideoThumb';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import SafeImage from '@/components/ui/SafeImage';
import { compactCount } from '@/lib/youtube/analysis-display';

type ChannelCard = {
  id?: string;
  youtube_channel_id?: string;
  youtubeChannelId?: string;
  channel_name?: string;
  channelName?: string;
  channel_handle?: string;
  channelHandle?: string;
  thumbnail_url?: string;
  thumbnailUrl?: string;
  subscriber_count?: number;
  subscriberCount?: number;
  video_count?: number;
  videoCount?: number;
  view_count?: number;
  viewCount?: number;
};

function nameOf(channel: ChannelCard) {
  return channel.channel_name || channel.channelName || 'Channel';
}

function idOf(channel: ChannelCard) {
  return channel.youtube_channel_id || channel.youtubeChannelId || channel.id || '';
}

export default function QuickStudio({ intent, embedded = false }: { intent: 'analysis' | 'report'; embedded?: boolean }) {
  const router = useRouter();
  const base = useYoutubePageBase();
  const [input, setInput] = useState('');
  const [channels, setChannels] = useState<ChannelCard[]>([]);
  const [videos, setVideos] = useState<Record<string, any>[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [projectId, setProjectId] = useState('');
  const projectRef = useRef('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [analyseOpen, setAnalyseOpen] = useState(false);

  const ensureProject = async () => {
    if (projectRef.current) return projectRef.current;
    const saved = await yt('projects', {
      method: 'POST',
      body: JSON.stringify({
        name: intent === 'report' ? `Quick Report · ${new Date().toISOString().slice(0, 10)}` : `Quick Analysis · ${new Date().toISOString().slice(0, 10)}`,
        objective: intent === 'report' ? 'Ad-hoc comparison report' : 'Ad-hoc channel analysis',
        status: 'todo',
      }),
    });
    rememberProject(saved.id);
    projectRef.current = saved.id;
    setProjectId(saved.id);
    return saved.id as string;
  };

  const addChannel = async () => {
    const value = input.trim();
    if (!value) {
      setError('Paste a YouTube channel URL, @handle, or channel ID.');
      return;
    }
    setBusy('fetch');
    setError('');
    try {
      const preview = await yt('channels/resolve', { method: 'POST', body: JSON.stringify({ input: value }) });
      const key = String(preview.youtubeChannelId || preview.youtube_channel_id || '');
      if (channels.some((channel) => idOf(channel) === key)) {
        setError('That channel is already in this list.');
        return;
      }
      const id = await ensureProject();
      const linked = await yt(`projects/${id}/channels`, {
        method: 'POST',
        body: JSON.stringify({ input: value, relationship: channels.length ? 'competitor' : 'own' }),
      });
      setChannels((current) => [...current, {
        ...preview,
        id: linked.channel_id,
        youtube_channel_id: preview.youtubeChannelId || preview.youtube_channel_id,
        channel_name: preview.channelName || preview.channel_name,
        thumbnail_url: preview.thumbnailUrl || preview.thumbnail_url,
        subscriber_count: preview.subscriberCount ?? preview.subscriber_count,
        video_count: preview.videoCount ?? preview.video_count,
        view_count: preview.viewCount ?? preview.view_count,
      }]);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that channel');
    } finally {
      setBusy('');
    }
  };

  const fetchVideos = async () => {
    if (channels.length < 2) {
      setError('Add at least two channels.');
      return;
    }
    const id = await ensureProject();
    setBusy('import');
    setError('');
    try {
      await yt(`projects/${id}/import`, {
        method: 'POST',
        body: JSON.stringify({ mode: 'available', limit: 12, channel_ids: channels.map((channel) => channel.id).filter(Boolean) }),
      });
      const body = await yt(`projects/${id}/videos?page=1&pageSize=40&sort=view_count`);
      setVideos(body.rows || []);
      setSelected([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch videos');
    } finally {
      setBusy('');
    }
  };

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const runAnalysis = async (config: AnalyseConfig) => {
    setBusy('summary');
    setError('');
    try {
      const analysis = await yt(`projects/${projectRef.current || projectId}/ai-analyses`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'Quick analysis',
          mode: 'compare',
          goals: config.goals,
          primaryGoal: config.primaryGoal,
          source: 'selected',
          videoIds: selected,
          contentFocus: ['titles', 'thumbnails', 'competitor_insights'],
          targetAges: config.targetAges,
          targetGenders: config.targetGenders,
          geographies: config.geographies,
          languages: config.languages,
          interests: config.interests,
          devices: config.devices,
          audienceNotes: config.audienceNotes,
          outputs: ['improve_existing', 'gap_report'],
        }),
      });
      setAnalyseOpen(false);
      router.push(`${base}/channel-compare?id=${analysis.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the analysis');
    } finally {
      setBusy('');
    }
  };

  const runReport = async () => {
    if (selected.length < 2) {
      setError('Select at least two videos.');
      return;
    }
    setBusy('report');
    setError('');
    try {
      const report = await yt(`projects/${projectRef.current || projectId}/research-reports`, {
        method: 'POST',
        body: JSON.stringify({
          name: `Quick report · ${selected.length} videos`,
          report_type: 'competitor',
          videoIds: selected,
        }),
      });
      router.push(`${base}/reports/${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate the report');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-5">
      {embedded ? null : (
        <AdminPageHeader
          title={intent === 'report' ? 'Quick Report' : 'Quick Analysis'}
          backHref={base}
          backLabel="Back"
        />
      )}
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">Add public YouTube channels. A scratch project is created in To Do so you can analyse without the full workspace wizard.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            className={partnerInput}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Channel URL, @handle, or UC…"
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addChannel(); } }}
          />
          <button type="button" className={partnerBtnPrimary} disabled={!!busy} onClick={() => void addChannel()}>
            {busy === 'fetch' ? 'Fetching…' : 'Add channel'}
          </button>
        </div>
        {channels.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {channels.map((channel) => (
              <li key={idOf(channel)} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                {channel.thumbnail_url || channel.thumbnailUrl ? (
                  <SafeImage src={channel.thumbnail_url || channel.thumbnailUrl || ''} alt="" className="h-12 w-12 rounded-full object-cover" fallback={<span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{nameOf(channel).slice(0, 1)}</span>} />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{nameOf(channel).slice(0, 1)}</span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-900">{nameOf(channel)}</span>
                  <span className="block text-xs text-slate-500">
                    {compactCount(channel.subscriber_count ?? channel.subscriberCount)} subscribers · {compactCount(channel.video_count ?? channel.videoCount)} videos
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4">
          <button type="button" className={partnerBtnSecondary} disabled={channels.length < 2 || !!busy} onClick={() => void fetchVideos()}>
            {busy === 'import' ? 'Fetching videos…' : 'Fetch recent videos'}
          </button>
        </div>
      </section>

      {videos.length ? (
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bricolage text-lg font-semibold text-slate-900">Select videos</h2>
            {intent === 'report' ? (
              <button type="button" className={partnerBtnPrimary} disabled={selected.length < 2 || !!busy} onClick={() => void runReport()}>
                {busy === 'report' ? 'Generating…' : 'Generate report'}
              </button>
            ) : (
              <button
                type="button"
                className={partnerBtnPrimary}
                disabled={selected.length < 2 || !!busy}
                onClick={() => { if (selected.length >= 2) setAnalyseOpen(true); }}
              >
                <Icon name="ChartBarIcon" size={16} /> Analyse selected
              </button>
            )}
          </div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {videos.map((video) => {
              const id = String(video.id);
              const on = selected.includes(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${on ? 'border-violet-300 bg-violet-50' : 'border-slate-100'}`}
                  >
                    <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <VideoThumb youtubeId={video.youtube_video_id} src={video.thumbnail_url} className="h-full w-full object-cover" alt="" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{video.title}</span>
                      <span className="block text-xs text-slate-500">{video.channel_name} · {compactCount(video.view_count)} views</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {busy === 'fetch' || busy === 'import' ? <FetchVideosOverlay /> : null}
      {busy === 'report' ? <FetchVideosOverlay mode="report" /> : null}
      {analyseOpen ? (
        <AnalyseModal
          variant="direct"
          videos={videos.filter((video) => selected.includes(String(video.id)))}
          busy={busy === 'summary'}
          error={error}
          onClose={() => { if (busy !== 'summary') setAnalyseOpen(false); }}
          onGenerate={runAnalysis}
        />
      ) : null}
    </div>
  );
}
