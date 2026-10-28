'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PageLoader from '@/components/admin/youtube/PageLoader';
import { allow, useYoutubeAccess, useYoutubePageBase, yt } from '@/components/admin/youtube/YoutubeFrame';
import { YOUTUBE_PERMISSIONS } from '@/lib/youtube/permissions';

const control = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm';
const CONNECTION_LABEL: Record<string, string> = {
  connected: 'Connected',
  invalid_credentials: 'Invalid API key',
  ip_restricted: 'Server IP not allowed',
  referrer_restricted: 'Referrer restriction',
  app_restricted: 'App restriction',
  quota_exhausted: 'Quota exhausted',
  api_disabled: 'YouTube Data API disabled',
  network_error: 'Network error',
  request_failed: 'Request failed',
};
const LABELS: Record<string, string> = {
  'youtube_research.view': 'View research',
  'youtube_research.channels.manage': 'Manage channels',
  'youtube_research.videos.import': 'Import videos',
  'youtube_research.videos.refresh': 'Refresh videos',
  'youtube_research.research.edit': 'Edit research',
  'youtube_research.analytics.view': 'View performance',
  'youtube_research.competitors.view': 'Compare channels',
  'youtube_research.reports.export': 'Export reports',
  'youtube_research.settings.manage': 'Manage settings',
};

export default function YoutubeSettingsPage() {
  const access = useYoutubeAccess();
  const base = useYoutubePageBase();
  const manage = allow(access, 'youtube_research.settings.manage');
  const [settings, setSettings] = useState<Record<string, any> | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [people, setPeople] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState('');

  const load = async () => {
    const body = await yt('settings');
    setSettings(body);
    if (manage) setPeople(await yt('access'));
  };

  useEffect(() => {
    load().catch((err) => setError(err.message)).finally(() => setReady(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manage]);

  const save = async (extra: Record<string, unknown> = {}, action = 'save') => {
    setError('');
    setMessage('');
    setPending(action);
    try {
      const saved = await yt('settings', {
        method: 'PATCH',
        body: JSON.stringify({
          default_import_limit: Number(settings?.defaultImportLimit),
          max_import_limit: Number(settings?.maxImportLimit),
          default_sort: settings?.defaultSort,
          api_key: apiKey,
          ...extra,
        }),
      });
      setSettings(saved);
      setApiKey('');
      setMessage('Settings saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings');
    } finally {
      setPending('');
    }
  };

  const test = async () => {
    setError('');
    setMessage('');
    setPending('test');
    try {
      const body = await yt('settings/test-connection', { method: 'POST', body: '{}' });
      setMessage(body.message);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
      await load().catch(() => undefined);
    } finally {
      setPending('');
    }
  };

  const toggle = async (person: Record<string, any>, key: string) => {
    const next = person.permissions.includes(key) ? person.permissions.filter((item: string) => item !== key) : [...person.permissions, key];
    try {
      await yt('access', { method: 'PATCH', body: JSON.stringify({ user_id: person.user_id, permissions: next }) });
      setPeople(await yt('access'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update access');
    }
  };

  if (!ready && !error) return <PageLoader label="Loading settings…" />;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Settings" backHref="/youtube" backLabel="Back" />
      {error ? <AdminAlert variant="error">{error}</AdminAlert> : null}
      {message ? <AdminAlert>{message}</AdminAlert> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">Hookooh</h2>
            <p className="mt-1 text-sm text-slate-500">Upload playbook documents or notes. Key Insights and Hookooh AI Agent use them as coaching rules.</p>
          </div>
          <Link href={`${base}/ai-training`} className="btn-secondary">Open training</Link>
        </div>
      </section>
      {settings ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">Connection: <span className="font-semibold">{settings.keyConfigured ? (CONNECTION_LABEL[settings.lastTestStatus] || settings.lastTestStatus || 'Saved, not tested') : 'Configuration missing'}</span></p>
          <p className="text-xs text-slate-500">Source: {settings.keySource === 'environment' ? 'Server environment variable' : settings.keySource === 'saved' ? 'Saved on the server' : 'Not configured'}{settings.keyHint ? ` · ${settings.keyHint}` : ''}</p>
          {settings.lastTestMessage ? <p className="mt-1 text-xs text-slate-500">{settings.lastTestMessage}</p> : null}
          {manage ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm font-medium xl:col-span-2">YouTube Data API key
                <input type="password" autoComplete="off" className={`${control} mt-1`} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.keyConfigured ? 'Enter new API key or leave blank' : 'Enter YouTube Data API key'} />
              </label>
              <label className="text-sm font-medium">Default import limit
                <input className={`${control} mt-1`} value={settings.defaultImportLimit} onChange={(event) => setSettings({ ...settings, defaultImportLimit: event.target.value })} />
              </label>
              <label className="text-sm font-medium">Maximum import results
                <input className={`${control} mt-1`} value={settings.maxImportLimit} onChange={(event) => setSettings({ ...settings, maxImportLimit: event.target.value })} />
              </label>
              <label className="text-sm font-medium">Default sort
                <select className={`${control} mt-1`} value={settings.defaultSort} onChange={(event) => setSettings({ ...settings, defaultSort: event.target.value })}>
                  <option value="published_at">Publish date</option>
                  <option value="view_count">View count</option>
                  <option value="like_count">Like count</option>
                  <option value="comment_count">Comment count</option>
                  <option value="title">Title</option>
                </select>
              </label>
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">You can view the connection status. Changing the key requires settings access.</p>}
          {manage ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton variant="primary" loading={pending === 'save'} process="Saving settings…" onClick={() => save()}>Save configuration</AdminButton>
              <AdminButton loading={pending === 'test'} process="Testing YouTube connection…" onClick={test}>Test connection</AdminButton>
              <AdminButton loading={pending === 'clear'} process="Removing API key…" onClick={() => save({ clear_key: true, api_key: '' }, 'clear')}>Remove saved key</AdminButton>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-slate-500">{settings.notice} Remaining YouTube quota is not shown because the API does not provide it.</p>
        </section>
      ) : null}
      {manage ? (
        <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Admin access</h2>
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-400">
                <th className="px-3 py-3">Admin</th>
                {YOUTUBE_PERMISSIONS.map((key) => <th key={key} className="px-2 py-3">{LABELS[key]}</th>)}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.user_id} className="border-t border-slate-100">
                  <td className="px-3 py-3">{person.email}<span className="block text-xs text-slate-400">{person.role}</span></td>
                  {YOUTUBE_PERMISSIONS.map((key) => (
                    <td key={key} className="px-2 py-3 text-center">
                      <input type="checkbox" checked={person.permissions.includes(key)} disabled={person.locked} onChange={() => toggle(person, key)} aria-label={`${LABELS[key]} for ${person.email}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
