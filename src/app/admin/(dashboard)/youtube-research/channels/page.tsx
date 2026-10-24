'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { allow, metric, ProjectRequired, useProjectId, useYoutubeAccess, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';

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

function Action({ href, icon, label, tone = 'sky', onClick, loading = false }: { href?: string; icon: string; label: string; tone?: 'sky' | 'accent' | 'rose'; onClick?: () => void; loading?: boolean }) {
  const color = tone === 'accent' ? 'text-secondary' : tone === 'rose' ? 'text-secondary' : 'text-sky-600';
  const className = `inline-flex items-center gap-1.5 text-sm font-medium ${color} hover:opacity-80 disabled:opacity-50`;
  if (href) {
    return <Link href={href} className={className}><Icon name={icon} size={16} />{label}</Link>;
  }
  return <button type="button" className={className} disabled={loading} onClick={onClick}>{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name={icon} size={16} />}{label}</button>;
}

function ChannelCard({ row }: { row: Record<string, any> }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {row.thumbnail_url ? <img src={row.thumbnail_url} alt="" loading="lazy" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">YT</span>}
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

function ChannelDraftForm({
  relationship,
  projectId,
  hasOwn,
  onSaved,
  onCancel,
}: {
  relationship: 'own' | 'competitor';
  projectId: string;
  hasOwn: boolean;
  onSaved: (result?: Record<string, any>) => Promise<void>;
  onCancel?: () => void;
}) {
  const [input, setInput] = useState('');
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'fetch' | 'save' | ''>('');

  const fetchChannel = async () => {
    setError('');
    setPreview(null);
    setPending('fetch');
    try {
      setPreview(await yt('channels/resolve', { method: 'POST', body: JSON.stringify({ input }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not fetch the channel');
    } finally {
      setPending('');
    }
  };

  const save = async () => {
    setError('');
    if (relationship === 'own' && hasOwn && !window.confirm('Replace the current own channel? The previous one stays in the project as a competitor.')) return;
    setPending('save');
    try {
      const saved = await yt(`projects/${projectId}/channels`, { method: 'POST', body: JSON.stringify({ input, relationship }) });
      setPreview(null);
      setInput('');
      await onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the channel');
    } finally {
      setPending('');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-800">{relationship === 'own' ? 'Add own channel' : 'Add competitor'}</p>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input className={control} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Channel URL, @handle, or ID" />
        <AdminButton variant="primary" loading={pending === 'fetch'} onClick={fetchChannel}>Fetch</AdminButton>
        <AdminButton onClick={() => { setInput(''); setPreview(null); setError(''); onCancel?.(); }}>Cancel</AdminButton>
      </div>
      {preview ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          {preview.thumbnailUrl ? <img src={preview.thumbnailUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full object-cover" /> : null}
          <div className="min-w-0">
            <p className="font-semibold">{preview.channelName}</p>
            <p className="text-slate-500">{preview.channelHandle ? `@${preview.channelHandle}` : preview.youtubeChannelId} · {metric(preview.subscriberCount)} subscribers</p>
          </div>
          <AdminButton variant="primary" loading={pending === 'save'} onClick={save}>Save in project</AdminButton>
        </div>
      ) : null}
    </div>
  );
}

function Channels() {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const router = useRouter();
  const search = useSearchParams();
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState('');
  const [competitorOpen, setCompetitorOpen] = useState(search?.get('add') === 'competitor');
  const [replacingOwn, setReplacingOwn] = useState(search?.get('add') === 'own');

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

  const remove = async (row: Record<string, string>) => {
    if (!window.confirm(`Remove ${row.channel_name || row.youtube_channel_id} from this project? Videos and notes stay available to other projects.`)) return;
    setBusy(`remove:${row.id}`);
    await yt(`projects/${projectId}/channels/${row.id}`, { method: 'DELETE' }).then(load).catch((err) => setError(err.message)).finally(() => setBusy(''));
  };

  const refresh = async (row: Record<string, string>) => {
    setBusy(`refresh:${row.id}`);
    try {
      await yt(`channels/${row.id}/refresh`, { method: 'POST', body: '{}' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh the channel');
    } finally {
      setBusy('');
    }
  };

  if (!loaded && !error) return <PageLoader label="Loading channels…" />;

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`${base}/channel-compare`}
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
                <Action href={`${base}/videos?channel=${own.id}`} icon="EyeIcon" label="View" />
                <Action href={`${base}/channel-compare`} icon="ChartBarIcon" label="Compare" />
                <Action href={`${base}/import?channel=${own.id}`} icon="ArrowDownTrayIcon" label="Import" />
                {manage ? <Action icon="ArrowPathIcon" label={busy === `refresh:${own.id}` ? 'Refreshing' : 'Refresh'} tone="accent" loading={busy === `refresh:${own.id}`} onClick={() => refresh(own)} /> : null}
                {manage ? <Action icon="ArrowsRightLeftIcon" label="Replace" tone="accent" onClick={() => setReplacingOwn(true)} /> : null}
              </div>
            </>
          ) : <p className="text-sm text-slate-500">No own channel yet. Add your YouTube channel to begin competitor research.</p>}
          {manage && projectId && (!own || replacingOwn) ? (
            <div className="mt-4">
              <ChannelDraftForm
                relationship="own"
                projectId={projectId}
                hasOwn={Boolean(own)}
                onSaved={async (saved) => {
                  setReplacingOwn(false);
                  setMessage('Own channel saved in this project.');
                  await load();
                  if (search?.get('next') === 'videos') {
                    router.push(`${base}/videos${saved?.channel_id ? `?channel=${saved.channel_id}` : ''}`);
                  }
                }}
                onCancel={own ? () => setReplacingOwn(false) : undefined}
              />
            </div>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400"><Icon name="UserGroupIcon" size={16} /></span>
              <h2 className="text-base font-semibold text-slate-900">Competitor Channels ({competitors.length})</h2>
            </div>
            {manage ? <AdminButton size="sm" variant="primary" onClick={() => setCompetitorOpen(true)}>+ Add competitor</AdminButton> : null}
          </div>
          {competitors.length ? competitors.map((row) => (
            <div key={row.id} className="border-t border-slate-100 py-5 first:border-t-0 first:pt-0">
              <ChannelCard row={row} />
              <div className="mt-5 flex flex-wrap gap-5">
                <Action href={`${base}/videos?channel=${row.id}`} icon="EyeIcon" label="View" />
                <Action href={`${base}/channel-compare`} icon="ChartBarIcon" label="Compare" />
                <Action href={`${base}/import?channel=${row.id}`} icon="ArrowDownTrayIcon" label="Import" />
                {manage ? <Action icon="ArrowPathIcon" label={busy === `refresh:${row.id}` ? 'Refreshing' : 'Refresh'} tone="accent" loading={busy === `refresh:${row.id}`} onClick={() => refresh(row)} /> : null}
                {manage ? <Action icon="TrashIcon" label="Remove" tone="accent" loading={busy === `remove:${row.id}`} onClick={() => remove(row)} /> : null}
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">Add competitor channels to start comparing content.</p>}
          {manage && projectId && competitorOpen ? (
            <div className="mt-4">
              <ChannelDraftForm
                relationship="competitor"
                projectId={projectId}
                hasOwn={Boolean(own)}
                onSaved={async (saved) => {
                  setCompetitorOpen(false);
                  setMessage('Competitor channel saved in this project.');
                  await load();
                  if (search?.get('next') === 'videos') {
                    router.push(`${base}/videos${saved?.channel_id ? `?channel=${saved.channel_id}` : ''}`);
                  }
                }}
                onCancel={() => setCompetitorOpen(false)}
              />
            </div>
          ) : null}
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
                      {row.thumbnail_url ? <img src={row.thumbnail_url} alt="" loading="lazy" className="h-9 w-9 rounded-full object-cover" /> : <span className="h-9 w-9 rounded-full bg-slate-100" />}
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
                      <Action href={`${base}/videos?channel=${row.id}`} icon="EyeIcon" label="View" />
                      <Action href={`${base}/channel-compare`} icon="ChartBarIcon" label="Compare" />
                      <Action href={`${base}/import?channel=${row.id}`} icon="ArrowDownTrayIcon" label="Import" />
                      {manage ? <Action icon="ArrowPathIcon" label={busy === `refresh:${row.id}` ? 'Refreshing' : 'Refresh'} tone="accent" loading={busy === `refresh:${row.id}`} onClick={() => refresh(row)} /> : null}
                      {manage && row.relationship === 'own' ? <Action icon="ArrowsRightLeftIcon" label="Replace" tone="accent" onClick={() => setReplacingOwn(true)} /> : null}
                      {manage && row.relationship !== 'own' ? <Action icon="TrashIcon" label="Remove" tone="accent" loading={busy === `remove:${row.id}`} onClick={() => remove(row)} /> : null}
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
  return (
    <ProjectRequired>
      <Suspense fallback={<PageLoader label="Loading channels…" />}>
        <Channels />
      </Suspense>
    </ProjectRequired>
  );
}
