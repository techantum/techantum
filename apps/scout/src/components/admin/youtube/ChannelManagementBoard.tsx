'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import ChannelDraftForm from '@/components/admin/youtube/ChannelDraftForm';
import FetchVideosOverlay from '@/components/admin/youtube/FetchVideosOverlay';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { handleLabel } from '@/components/admin/youtube/research-ui';
import { allow, metric, useProjectId, useYoutubeAccess, useYoutubePageBase, useYoutubeRailActions, yt } from '@/components/admin/youtube/YoutubeFrame';
import { partnerBtnPrimary, partnerBtnSecondary, partnerInput } from '@/components/partner/PartnerUi';
import Icon from '@/components/ui/AppIcon';
import NavIcon from '@/components/ui/NavIcon';
import SafeImage from '@/components/ui/SafeImage';
import { formatAgo, projectInitials } from '@/lib/youtube/home-display';
import { MAX_PROJECT_COMPETITORS } from '@/lib/youtube/workspace-nav';

function compactMetric(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  if (Math.abs(number) >= 1_000_000) return `${(number / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(number) >= 1000) return `${(number / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return number.toLocaleString('en-IN');
}

export default function ChannelManagementBoard({ backHref, initialAdding = '' }: { backHref: string; initialAdding?: 'own' | 'competitor' | '' }) {
  const projectId = useProjectId();
  const base = useYoutubePageBase();
  const access = useYoutubeAccess();
  const manage = allow(access, 'youtube_research.channels.manage');
  const canImport = allow(access, 'youtube_research.videos.import');
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, any>[]>([]);
  const [filter, setFilter] = useState<'all' | 'own' | 'competitor'>('all');
  const [adding, setAdding] = useState<'own' | 'competitor' | ''>(initialAdding);
  const [addInput, setAddInput] = useState('');
  const [menu, setMenu] = useState('');
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState('');
  const promptedOwn = useRef(initialAdding === 'own' || initialAdding === 'competitor');

  const load = async () => {
    const [channelRows, listed] = await Promise.all([
      yt(`projects/${projectId}/channels`),
      yt(`projects/${projectId}/ai-analyses`).catch(() => ({ rows: [] })),
    ]);
    setChannels(channelRows);
    setAnalyses(listed.rows || listed || []);
    return channelRows as Record<string, any>[];
  };

  useEffect(() => {
    if (!projectId) return;
    load().catch((err) => setError(err.message)).finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const backLabel = backHref.includes('channel-compare') ? 'Done — back to analysis' : 'Done — back to research';
  const headerActions = useMemo(() => (
    <Link className={partnerBtnPrimary} href={backHref}>
      Done
    </Link>
  ), [backHref]);
  useYoutubeRailActions(headerActions);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu('');
    };
    const onScroll = () => setMenu('');
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, []);

  const own = channels.find((channel) => channel.relationship === 'own');
  useEffect(() => {
    if (!ready || !manage) return;
    if (!own && !promptedOwn.current) {
      promptedOwn.current = true;
      setAdding('own');
    }
    if (initialAdding === 'competitor') {
      window.setTimeout(() => document.getElementById('add-competitor')?.focus(), 0);
    }
  }, [ready, manage, own, initialAdding]);

  const competitors = channels.filter((channel) => channel.relationship === 'competitor');
  const imported = channels.reduce((sum, channel) => sum + Number(channel.videos_imported || 0), 0);
  const lastSync = channels.map((channel) => channel.last_refreshed_at).filter(Boolean).sort().at(-1);
  const ranked = [...channels].filter((channel) => channel.subscriber_count != null).sort((a, b) => Number(b.subscriber_count || 0) - Number(a.subscriber_count || 0));
  const topSubs = Number(ranked[0]?.subscriber_count || 0);
  const ownSubs = own?.subscriber_count == null ? null : Number(own.subscriber_count);
  const topCompetitorSubs = competitors.map((channel) => Number(channel.subscriber_count)).filter((value) => Number.isFinite(value)).sort((a, b) => b - a)[0];
  const subscriberGap = ownSubs != null && topCompetitorSubs != null ? ownSubs - topCompetitorSubs : null;
  const visible = channels.filter((channel) => filter === 'all' || channel.relationship === filter);
  const setup = [
    { key: 'own', label: 'Own channel', detail: own ? 'Connected' : 'Not connected', done: Boolean(own) },
    { key: 'competitors', label: 'Competitors', detail: `${competitors.length} of ${MAX_PROJECT_COMPETITORS}`, done: competitors.length > 0 },
    { key: 'import', label: 'Import videos', detail: imported ? `${imported} imported` : 'None imported', done: imported > 0 },
    { key: 'analysis', label: 'Run AI analysis', detail: analyses.length ? `${analyses.length} saved` : 'Not started', done: analyses.length > 0 },
  ];

  const importChannels = async (ids: string[]) => {
    if (!canImport || !ids.length) return;
    await yt(`projects/${projectId}/import`, { method: 'POST', body: JSON.stringify({ mode: 'available', channel_ids: ids }) }).catch(() => undefined);
  };

  const addCompetitor = async () => {
    if (!addInput.trim()) return;
    setBusy('add');
    setError('');
    try {
      const saved = await yt(`projects/${projectId}/channels`, { method: 'POST', body: JSON.stringify({ input: addInput.trim(), relationship: 'competitor' }) });
      setAddInput('');
      setMessage('YouTube competitor added to this project.');
      const next = await load();
      await importChannels([saved.channel_id].filter(Boolean).length ? [saved.channel_id] : next.filter((channel) => channel.relationship === 'competitor').map((channel) => channel.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the channel');
    } finally {
      setBusy('');
    }
  };

  const refreshAll = async () => {
    setBusy('refresh');
    setError('');
    try {
      await Promise.all(channels.map((channel) => yt(`channels/${channel.id}/refresh`, { method: 'POST', body: '{}' })));
      await load();
      setMessage('Public YouTube channel counts were refreshed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh channels');
    } finally {
      setBusy('');
    }
  };

  const removeChannel = async (row: Record<string, any>) => {
    if (!window.confirm(`Remove ${row.channel_name || row.youtube_channel_id} from this project?`)) return;
    setBusy(`remove:${row.id}`);
    try {
      await yt(`projects/${projectId}/channels/${row.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the channel');
    } finally {
      setBusy('');
      setMenu('');
    }
  };

  const reach = (channel: Record<string, any>) => {
    if (channel.subscriber_count == null || !topSubs) return { label: '—', width: 0, top: false };
    const pct = Math.round((Number(channel.subscriber_count) / topSubs) * 1000) / 10;
    return { label: pct >= 100 ? 'Top channel' : `${pct}% of top channel`, width: Math.max(4, Math.min(100, pct)), top: pct >= 100 };
  };

  const renderRow = (channel: Record<string, any>, kind: 'own' | 'competitor') => {
    const bar = reach(channel);
    return (
      <tr key={channel.id} className="border-t border-slate-50">
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <SafeImage src={channel.thumbnail_url} alt="" className="h-10 w-10 rounded-full object-cover" fallback={<span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{projectInitials(channel.channel_name || 'CH')}</span>} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                {channel.channel_name || channel.youtube_channel_id}
                {kind === 'own' ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-secondary">Primary</span> : null}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">YouTube</span>
              </p>
              <p className="text-xs text-slate-400">{handleLabel(channel.channel_handle) || channel.youtube_channel_id}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-4">
          <p className="mb-1 text-xs text-slate-500">{bar.label}</p>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-1.5 rounded-full ${bar.top ? 'bg-slate-400' : 'bg-secondary'}`} style={{ width: `${bar.width}%` }} />
          </div>
        </td>
        <td className="px-4 py-4 font-medium text-slate-800">{compactMetric(channel.subscriber_count)}</td>
        <td className="px-4 py-4 text-sm text-slate-600">{metric(channel.videos_imported)} {channel.video_count != null ? <span className="text-slate-400">of {metric(channel.video_count)} total</span> : null}</td>
        <td className="px-4 py-4">
          <div className="flex items-center justify-end gap-2">
            <Link href={`${base}/videos?channel=${channel.id}`} className={`${partnerBtnSecondary} !px-3 !py-1.5 text-xs`}>{kind === 'own' ? 'View' : 'Research'}</Link>
            {kind === 'competitor' ? <Link href={`${base}/channel-compare`} className={`${partnerBtnSecondary} !px-3 !py-1.5 text-xs`}>Compare</Link> : null}
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Channel actions"
              onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                setMenu(menu === channel.id ? '' : channel.id);
              }}
            >
              <Icon name="EllipsisHorizontalIcon" size={18} />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (!ready && !error) return <PageLoader label="Loading channels…" />;

  return (
    <div className="space-y-4">
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      {busy === 'refresh' ? <FetchVideosOverlay /> : null}

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Research setup · {setup.filter((item) => item.done).length} of {setup.length}</p>
            <p className="text-xs text-slate-500">YouTube only. Add your channel and competitors, then return to Research.</p>
          </div>
          {manage && !own ? <button type="button" className={partnerBtnSecondary} onClick={() => setAdding('own')}>Add own channel</button> : null}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {setup.map((step) => (
            <div key={step.key}>
              <div className={`h-1 rounded-full ${step.done ? 'bg-secondary' : 'bg-slate-200'}`} />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{step.label}</p>
              <p className="text-sm text-slate-700">
              {step.key === 'import' ? <Link href={`${base}/videos`} className="font-semibold text-secondary">{step.detail} →</Link> : step.detail}
            </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Channels tracked</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">{channels.length}</p>
          <p className="text-xs text-slate-400">{own ? '1 own' : 'No own'} · {competitors.length} competitor{competitors.length === 1 ? '' : 's'}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Imported videos</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">{imported.toLocaleString('en-IN')}</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Subscriber gap</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">
            {subscriberGap == null ? '—' : `${subscriberGap > 0 ? '+' : ''}${compactMetric(subscriberGap)}`}
          </p>
          <p className="text-xs text-slate-400">vs. top competitor · public Data API</p>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs text-slate-500">Last synced</p>
          <p className="mt-1 font-bricolage text-3xl font-bold text-slate-900">{lastSync ? formatAgo(lastSync) : '—'}</p>
        </article>
      </div>

      {manage && adding === 'own' ? (
        <ChannelDraftForm
          relationship="own"
          projectId={projectId}
          hasOwn={Boolean(own)}
          onSaved={async (saved) => {
            setAdding('');
            setMessage(own ? 'Own YouTube channel replaced.' : 'Own YouTube channel connected.');
            await load();
            if (saved?.channel_id) await importChannels([saved.channel_id]);
          }}
          onCancel={() => setAdding('')}
        />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bricolage text-base font-semibold text-slate-900">YouTube channels</h2>
            {(['all', 'own', 'competitor'] as const).map((id) => (
              <button key={id} type="button" className={`rounded-full px-3 py-1 text-sm font-medium ${filter === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`} onClick={() => setFilter(id)}>
                {id === 'all' ? 'All' : id === 'own' ? 'Own' : 'Competitors'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {manage ? <button type="button" className={partnerBtnSecondary} disabled={busy === 'refresh' || !channels.length} onClick={refreshAll}><Icon name="ArrowPathIcon" size={16} /> Refresh all</button> : null}
            {manage && !own ? <button type="button" className={partnerBtnSecondary} onClick={() => setAdding('own')}>Add own channel</button> : null}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Relative reach</th>
                <th className="px-4 py-3">Subscribers</th>
                <th className="px-4 py-3">Imported videos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filter !== 'competitor' && own ? (
                <>
                  <tr><td colSpan={5} className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your channel</td></tr>
                  {renderRow(own, 'own')}
                </>
              ) : null}
              {filter !== 'own' && competitors.length ? (
                <>
                  <tr><td colSpan={5} className="px-4 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Competitors · {competitors.length}</td></tr>
                  {competitors.filter((channel) => visible.includes(channel)).map((channel) => renderRow(channel, 'competitor'))}
                </>
              ) : null}
            </tbody>
          </table>
        </div>
        {!visible.length ? <p className="px-4 py-10 text-center text-sm text-slate-500">No YouTube channels in this view yet.</p> : null}
        {manage ? (
          <div className="space-y-3 border-t border-dashed border-slate-200 px-4 py-3">
            {!own ? (
              <p className="text-sm text-slate-600">Connect your own YouTube channel first, then add up to {MAX_PROJECT_COMPETITORS} competitors.</p>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400">+</span>
              <input id="add-competitor" className={`${partnerInput} sm:max-w-md`} placeholder="Enter competitor channel URL or @handle" value={addInput} onChange={(event) => setAddInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCompetitor(); } }} />
              <AdminButton variant="primary" loading={busy === 'add'} disabled={competitors.length >= MAX_PROJECT_COMPETITORS} onClick={addCompetitor}>Add competitor</AdminButton>
              <p className="sm:ml-auto text-xs text-slate-400">YouTube · up to {MAX_PROJECT_COMPETITORS} competitors</p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm">
        <p className="text-slate-500">{own ? 'Own channel connected' : 'Connect your YouTube channel'} · {competitors.length}/{MAX_PROJECT_COMPETITORS} competitors</p>
        <Link className={partnerBtnPrimary} href={backHref}>{backLabel}</Link>
      </div>

      {menu && typeof document !== 'undefined'
        ? createPortal(
          <div ref={menuRef} className="fixed z-[80] w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg" style={{ top: menuPos.top, right: menuPos.right }}>
            <Link className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50" href={`${base}/videos?channel=${menu}`} onClick={() => setMenu('')}>
              <NavIcon name="PlayCircleIcon" itemKey="videos" className="h-7 w-7 rounded-lg" size={14} /> Videos
            </Link>
            {manage && channels.find((channel) => channel.id === menu)?.relationship === 'own' ? (
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50" onClick={() => { setAdding('own'); setMenu(''); }}>
                <NavIcon name="ArrowPathIcon" itemKey="restore" delay={80} className="h-7 w-7 rounded-lg" size={14} /> Replace own
              </button>
            ) : null}
            {manage ? (
              <button type="button" className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50" onClick={() => { const row = channels.find((channel) => channel.id === menu); if (row) removeChannel(row); }}>
                <NavIcon name="TrashIcon" itemKey="archive" delay={160} className="h-7 w-7 rounded-lg" size={14} /> Remove
              </button>
            ) : null}
          </div>,
          document.body,
        )
        : null}
    </div>
  );
}
