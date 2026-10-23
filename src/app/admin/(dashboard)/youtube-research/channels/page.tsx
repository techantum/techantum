'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';
import { allow, metric, ProjectRequired, useProjectId, useYoutubeAccess, yt } from '@/components/admin/youtube/YoutubeFrame';

const control = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm';

function formatWhen(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function handleOf(row: Record<string, any>) {
  if (row.channel_handle) return `@${String(row.channel_handle).replace(/^@/, '')}`;
  return row.youtube_channel_id || '—';
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Icon name={icon} size={22} />
      </span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-bricolage text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Action({ href, icon, label, tone = 'sky', onClick }: { href?: string; icon: string; label: string; tone?: 'sky' | 'accent' | 'rose'; onClick?: () => void }) {
  const color = tone === 'accent' ? 'text-secondary' : tone === 'rose' ? 'text-secondary' : 'text-sky-600';
  const className = `inline-flex items-center gap-1.5 text-sm font-medium ${color} hover:opacity-80`;
  if (href) {
    return <Link href={href} className={className}><Icon name={icon} size={16} />{label}</Link>;
  }
  return <button type="button" className={className} onClick={onClick}><Icon name={icon} size={16} />{label}</button>;
}

function ChannelCard({ row }: { row: Record<string, any> }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {row.thumbnail_url ? <img src={row.thumbnail_url} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">YT</span>}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{row.channel_name || row.youtube_channel_id}</p>
          <p className="truncate text-sm text-slate-400">{handleOf(row)}</p>
        </div>
      </div>
      <div className="flex gap-8 sm:pr-4">
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-xs text-slate-400"><Icon name="UserIcon" size={14} /> Public Subscribers</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{metric(row.subscriber_count)}</p>
        </div>
        <div className="text-center">
          <p className="flex items-center justify-center gap-1 text-xs text-slate-400"><Icon name="FilmIcon" size={14} /> Imported Videos</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{metric(row.videos_imported)}</p>
        </div>
      </div>
    </div>
  );
}

function Channels() {
  const projectId = useProjectId();
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [draft, setDraft] = useState({ input: '', relationship: 'own' });
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');

  const load = () => yt(`projects/${projectId}/channels`).then((next) => {
    setRows(next);
    setLoaded(true);
  });
  useEffect(() => {
    if (projectId) load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const own = rows.find((row) => row.relationship === 'own');
  const competitors = rows.filter((row) => row.relationship === 'competitor');
  const imported = rows.reduce((sum, row) => sum + Number(row.videos_imported || 0), 0);

  const startAdd = (relationship: string) => {
    setDraft({ input: '', relationship });
    setPreview(null);
    setAdding(true);
    setError('');
  };

  const fetchChannel = async () => {
    setError('');
    setPreview(null);
    try {
      setPreview(await yt('channels/resolve', { method: 'POST', body: JSON.stringify({ input: draft.input }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch the channel');
    }
  };

  const save = async () => {
    setError('');
    try {
      if (draft.relationship === 'own' && own && !window.confirm('Replace the current own channel? The previous one stays in the project as a competitor.')) return;
      await yt(`projects/${projectId}/channels`, { method: 'POST', body: JSON.stringify(draft) });
      setPreview(null);
      setDraft({ input: '', relationship: own ? 'competitor' : 'own' });
      setAdding(false);
      setMessage('Channel saved in this project.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the channel');
    }
  };

  const remove = async (row: Record<string, string>) => {
    if (!window.confirm(`Remove ${row.channel_name || row.youtube_channel_id} from this project? Videos and notes stay available to other projects.`)) return;
    await yt(`projects/${projectId}/channels/${row.id}`, { method: 'DELETE' }).then(load).catch((err) => setError(err.message));
  };

  const refresh = async (row: Record<string, string>) => {
    setBusy(row.id);
    try {
      await yt(`channels/${row.id}/refresh`, { method: 'POST', body: '{}' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh the channel');
    } finally {
      setBusy('');
    }
  };

  const addForm = (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">{draft.relationship === 'own' ? 'Add own channel' : 'Add competitor'}</p>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input className={control} value={draft.input} onChange={(event) => setDraft({ ...draft, input: event.target.value })} placeholder="Channel URL, @handle, or ID" />
        <AdminButton variant="primary" onClick={fetchChannel}>Fetch</AdminButton>
        <AdminButton onClick={() => { setAdding(false); setPreview(null); }}>Cancel</AdminButton>
      </div>
      {preview ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {preview.thumbnailUrl ? <img src={preview.thumbnailUrl} alt="" className="h-10 w-10 rounded-full object-cover" /> : null}
          <div className="min-w-0">
            <p className="font-semibold">{preview.channelName}</p>
            <p className="text-slate-500">{preview.channelHandle ? `@${preview.channelHandle}` : preview.youtubeChannelId} · {metric(preview.subscriberCount)} subscribers</p>
          </div>
          <AdminButton variant="primary" onClick={save}>Save in project</AdminButton>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href="/admin/youtube-research/channel-compare"
          className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white"
        >
          <Icon name="ChartBarIcon" size={16} />
          Channel Comparison
        </Link>
      </div>
      {loaded ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Stat icon="PlayCircleIcon" label="Own Channel" value={own ? 1 : 0} />
          <Stat icon="UserGroupIcon" label="Competitors" value={competitors.length} />
          <Stat icon="FilmIcon" label="Imported Videos" value={metric(imported)} />
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Icon name="PlayCircleIcon" size={16} /></span>
            <h2 className="text-base font-semibold text-slate-900">Own Channel</h2>
          </div>
          {own ? (
            <>
              <ChannelCard row={own} />
              <div className="mt-5 flex flex-wrap gap-5">
                <Action href={`/admin/youtube-research/videos?channel=${own.id}`} icon="EyeIcon" label="View" />
                <Action href="/admin/youtube-research/channel-compare" icon="ChartBarIcon" label="Compare" />
                <Action href={`/admin/youtube-research/import?channel=${own.id}`} icon="ArrowDownTrayIcon" label="Import" />
                {manage ? <Action icon="ArrowPathIcon" label={busy === own.id ? 'Refreshing' : 'Refresh'} tone="accent" onClick={() => refresh(own)} /> : null}
                {manage ? <Action icon="ArrowsRightLeftIcon" label="Replace" tone="accent" onClick={() => startAdd('own')} /> : null}
              </div>
            </>
          ) : <p className="text-sm text-slate-500">No own channel yet. Add your YouTube channel to begin competitor research.</p>}
          {manage && ((adding && draft.relationship === 'own') || !own) ? <div className="mt-4">{addForm}</div> : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Icon name="UserGroupIcon" size={16} /></span>
              <h2 className="text-base font-semibold text-slate-900">Competitor Channels ({competitors.length})</h2>
            </div>
            {manage ? <AdminButton size="sm" variant="primary" onClick={() => startAdd('competitor')}>+ Add competitor</AdminButton> : null}
          </div>
          {competitors.length ? competitors.map((row) => (
            <div key={row.id} className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
              <ChannelCard row={row} />
              <div className="mt-5 flex flex-wrap gap-5">
                <Action href={`/admin/youtube-research/videos?channel=${row.id}`} icon="EyeIcon" label="View" />
                <Action href="/admin/youtube-research/channel-compare" icon="ChartBarIcon" label="Compare" />
                <Action href={`/admin/youtube-research/import?channel=${row.id}`} icon="ArrowDownTrayIcon" label="Import" />
                {manage ? <Action icon="ArrowPathIcon" label={busy === row.id ? 'Refreshing' : 'Refresh'} tone="accent" onClick={() => refresh(row)} /> : null}
                {manage ? <Action icon="TrashIcon" label="Remove" tone="accent" onClick={() => remove(row)} /> : null}
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">Add competitor channels to start comparing content.</p>}
          {manage && adding && draft.relationship === 'competitor' ? <div className="mt-4">{addForm}</div> : null}
        </section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-1 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Icon name="QueueListIcon" size={16} /></span>
          <h2 className="text-base font-semibold text-slate-900">All linked channels</h2>
        </div>
        <p className="mb-4 text-sm text-slate-400">Own channel is a research label and does not verify YouTube ownership.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {['Channel', 'Role', 'Imported Videos', 'Last Updated', 'Actions'].map((heading) => <th key={heading} className="px-2 py-3">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-2 py-3">
                    <span className="flex items-center gap-3">
                      {row.thumbnail_url ? <img src={row.thumbnail_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-slate-100" />}
                      <span>
                        <span className="block font-semibold text-slate-900">{row.channel_name || row.youtube_channel_id}</span>
                        <span className="block text-xs text-slate-400">{handleOf(row)}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-3 text-slate-600">{row.relationship === 'own' ? 'Own channel' : 'Competitor'}</td>
                  <td className="px-2 py-3">{metric(row.videos_imported)}</td>
                  <td className="px-2 py-3 text-slate-500">{formatWhen(row.last_refreshed_at)}</td>
                  <td className="px-2 py-3">
                    <span className="flex flex-wrap gap-3">
                      <Action href={`/admin/youtube-research/videos?channel=${row.id}`} icon="EyeIcon" label="View" />
                      <Action href="/admin/youtube-research/channel-compare" icon="ChartBarIcon" label="Compare" />
                      <Action href={`/admin/youtube-research/import?channel=${row.id}`} icon="ArrowDownTrayIcon" label="Import" />
                      {manage ? <Action icon="ArrowPathIcon" label="Refresh" tone="accent" onClick={() => refresh(row)} /> : null}
                      {manage && row.relationship === 'own' ? <Action icon="ArrowsRightLeftIcon" label="Replace" tone="accent" onClick={() => startAdd('own')} /> : null}
                      {manage && row.relationship !== 'own' ? <Action icon="TrashIcon" label="Remove" tone="accent" onClick={() => remove(row)} /> : null}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length ? <tr><td colSpan={5} className="px-2 py-8 text-center text-slate-500">No channels in this project yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function ChannelsPage() {
  return <ProjectRequired><Channels /></ProjectRequired>;
}
