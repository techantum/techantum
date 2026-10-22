'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import { ProjectRequired, useProjectId, yt } from '@/components/admin/youtube/YoutubeFrame';

function ImportScreen() {
  const projectId = useProjectId();
  const search = useSearchParams();
  const preset = search?.get('channel') || '';
  const [channels, setChannels] = useState<Record<string, any>[]>([]);
  const [selected, setSelected] = useState<string[]>(preset ? [preset] : []);
  const [form, setForm] = useState({ date_from: '', date_to: '', limit: '50', mode: 'available' });
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    yt(`projects/${projectId}/channels`).then((rows) => {
      setChannels(rows);
      if (!preset) setSelected(rows.map((row: { id: string }) => row.id));
    }).catch((err) => setError(err.message));
    yt('settings').then((settings) => setForm((current) => ({ ...current, limit: String(settings.defaultImportLimit || 50) }))).catch(() => undefined);
  }, [projectId, preset]);

  const run = async (ids: string[]) => {
    setBusy(true);
    setError('');
    try {
      setResult(await yt(`projects/${projectId}/import`, { method: 'POST', body: JSON.stringify({ ...form, channel_ids: ids }) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const own = channels.find((channel) => channel.relationship === 'own');

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Imports run when you start them. Each channel uses the maximum you set, up to the limit in Settings.</p>
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
        <p>Own channel: <span className="font-semibold">{own?.channel_name || own?.youtube_channel_id || 'Not added'}</span></p>
        <p className="mt-1">Competitors: {channels.filter((channel) => channel.relationship === 'competitor').length}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {channels.map((channel) => (
            <label key={channel.id} className="flex items-center gap-2">
              <input type="checkbox" checked={selected.includes(channel.id)} onChange={() => setSelected((current) => current.includes(channel.id) ? current.filter((id) => id !== channel.id) : [...current, channel.id])} />
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${channel.relationship === 'own' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{channel.relationship === 'own' ? 'Own' : 'Competitor'}</span>
              {channel.channel_name || channel.youtube_channel_id}
            </label>
          ))}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">
          <input type="date" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={form.date_from} onChange={(event) => setForm({ ...form, date_from: event.target.value })} />
          <input type="date" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={form.date_to} onChange={(event) => setForm({ ...form, date_to: event.target.value })} />
          <input className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={form.limit} onChange={(event) => setForm({ ...form, limit: event.target.value })} />
          <select className="h-11 rounded-xl border border-slate-200 px-3 text-sm" value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })}>
            <option value="new">New videos</option>
            <option value="refresh">Refresh existing</option>
            <option value="available">Import available videos</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <AdminButton variant="primary" disabled={busy} onClick={() => run(selected)}>{busy ? 'Importing...' : 'Import Videos'}</AdminButton>
          <AdminButton disabled={busy} onClick={() => run(channels.map((channel) => channel.id))}>Import All Project Channels</AdminButton>
        </div>
      </section>
      {result ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <h2 className="font-semibold">{result.channels} channels processed</h2>
          <ul className="mt-2 space-y-1">
            {result.results?.map((job: Record<string, string | number | null>) => (
              <li key={String(job.channel_id)}>{job.status}: {job.inserted_count} new, {job.updated_count} updated, {job.skipped_count} skipped{job.error ? ` · ${job.error}` : ''}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function ImportPage() {
  return <ProjectRequired><Suspense fallback={<p className="text-sm text-slate-500">Loading import...</p>}><ImportScreen /></Suspense></ProjectRequired>;
}
