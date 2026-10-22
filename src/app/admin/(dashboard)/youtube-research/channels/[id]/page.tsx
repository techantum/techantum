'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { allow, metric, useYoutubeAccess, yt } from '@/components/admin/youtube/YoutubeFrame';

export default function ChannelDetailPage() {
  const params = useParams<{ id: string }>();
  const channelId = params?.id || '';
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [notes, setNotes] = useState('');
  const [classification, setClassification] = useState('other');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => yt(`channels/${channelId}`).then((body) => {
    setData(body);
    setNotes(body.channel.research_notes || '');
    setClassification(body.channel.classification || 'other');
  });

  useEffect(() => {
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const channel = data?.channel;

  const save = async () => {
    setError('');
    try {
      await yt(`channels/${channelId}`, { method: 'PATCH', body: JSON.stringify({ classification, research_notes: notes }) });
      setMessage('Research details saved.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader kicker="YouTube Research" title={channel?.channel_name || channel?.youtube_channel_id || 'Channel'} description={channel?.stale ? 'YouTube details are older than 30 days. Refresh the channel to show them again.' : 'Channel profile, imported videos, and recent imports.'} />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {channel ? (
        <>
          <div className="flex flex-wrap gap-2">
            {manage ? <AdminButton variant="primary" onClick={() => yt(`channels/${channel.id}/refresh`, { method: 'POST', body: '{}' }).then(() => load()).catch((err) => setError(err.message))}>Refresh Channel</AdminButton> : null}
            <Link className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold" href={`/admin/youtube-research/import?channel=${channel.id}`}>Import Videos</Link>
            <Link className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold" href={`/admin/youtube-research/videos?channel=${channel.id}`}>View Videos</Link>
            <Link className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold" href={`/admin/youtube-research/compare?channels=${channel.id}`}>Compare Channel</Link>
          </div>
          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
            <div className="text-sm text-slate-600">
              {channel.thumbnail_url ? <img src={channel.thumbnail_url} alt="" className="mb-3 h-16 w-16 rounded-xl object-cover" /> : null}
              <p>Handle: {channel.channel_handle ? `@${channel.channel_handle}` : '—'}</p>
              <p>Channel ID: {channel.youtube_channel_id}</p>
              <p>Subscribers {metric(channel.subscriber_count)} · Videos {metric(channel.video_count)} · Views {metric(channel.view_count)}</p>
              <p className="mt-2">{channel.description || 'No public description is available.'}</p>
              {channel.public_url ? <a className="mt-2 inline-block text-sky-700" href={channel.public_url} target="_blank" rel="noreferrer">Open on YouTube</a> : null}
            </div>
            {manage ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium">Classification
                  <select className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={classification} onChange={(event) => setClassification(event.target.value)}>
                    <option value="own">Own</option>
                    <option value="competitor">Competitor</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="block text-sm font-medium">Research notes
                  <textarea className="mt-1 h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={notes} onChange={(event) => setNotes(event.target.value)} />
                </label>
                <AdminButton variant="primary" onClick={save}>Save research details</AdminButton>
              </div>
            ) : null}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Imported videos</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {data.videos?.length ? data.videos.map((video: Record<string, any>) => (
                <li key={video.id} className="flex justify-between gap-3"><span className="truncate">{video.title || video.youtube_video_id}{video.stale ? ' · Refresh required' : ''}</span><span>{metric(video.view_count)}</span></li>
              )) : <li className="text-slate-500">No videos imported yet.</li>}
            </ul>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Recent imports</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {data.imports?.length ? data.imports.map((job: Record<string, string>) => <li key={job.id}>{job.status} · {job.inserted_count} new · {job.updated_count} updated · {String(job.created_at).slice(0, 16).replace('T', ' ')}</li>) : <li>No imports yet.</li>}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
