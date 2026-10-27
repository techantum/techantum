'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';
import SafeImage from '@/components/ui/SafeImage';

type AdminApp = {
  id: string;
  name: string;
  url: string;
  og_image: string | null;
  og_title: string | null;
};

export default function AppsAdminPage() {
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/apps')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setApps(data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeModal = () => {
    if (saving) return;
    setOpen(false);
    setName('');
    setUrl('');
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save the app');
      setApps((prev) => [data, ...prev]);
      setOpen(false);
      setName('');
      setUrl('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the app');
    } finally {
      setSaving(false);
    }
  };

  const refreshOg = async (app: AdminApp) => {
    const res = await fetch(`/api/admin/apps/${app.id}`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) setApps((prev) => prev.map((row) => (row.id === app.id ? data : row)));
  };

  const remove = async (app: AdminApp) => {
    if (!window.confirm(`Remove ${app.name}?`)) return;
    const res = await fetch(`/api/admin/apps/${app.id}`, { method: 'DELETE' });
    if (res.ok) setApps((prev) => prev.filter((row) => row.id !== app.id));
  };

  return (
    <div className="w-full space-y-6">
      <AdminPageHeader
        kicker="Applications"
        title="Apps"
        description="Save product URLs and open them from here. Thumbnails come from each site’s Open Graph image."
        action={<AdminButton variant="primary" onClick={() => setOpen(true)}>+ Add App</AdminButton>}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <Icon name="SquaresPlusIcon" size={28} className="mx-auto text-slate-300" />
          <p className="mt-3 font-bricolage text-lg font-semibold text-slate-900">No apps yet</p>
          <p className="mt-1 text-sm text-slate-500">Add an app name and URL to show it as a card here.</p>
          <AdminButton variant="primary" className="mt-5" onClick={() => setOpen(true)}>
            Add App
          </AdminButton>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {apps.map((app) => (
            <article key={app.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="relative aspect-[1.91/1] bg-slate-100">
                <SafeImage
                  src={app.og_image || ''}
                  alt=""
                  className="h-full w-full object-cover"
                  fallback={
                    <div className="flex h-full items-center justify-center text-slate-300">
                      <Icon name="PhotoIcon" size={36} />
                    </div>
                  }
                />
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h2 className="font-bricolage text-base font-semibold text-slate-900">{app.name}</h2>
                  <p className="truncate text-xs text-slate-400">{app.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ui-btn inline-flex flex-1 items-center justify-center rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-[#d93b1e]"
                  >
                    Visit website
                  </a>
                  <button
                    type="button"
                    onClick={() => refreshOg(app)}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 hover:border-slate-300 hover:text-slate-700"
                    aria-label={`Fetch image for ${app.name}`}
                    title="Fetch Open Graph image"
                  >
                    <Icon name="ArrowPathIcon" size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(app)}
                    className="rounded-full border border-slate-200 p-2 text-slate-400 hover:border-rose-200 hover:text-rose-600"
                    aria-label={`Remove ${app.name}`}
                  >
                    <Icon name="TrashIcon" size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {open ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="add-app-title">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={closeModal} />
          <form onSubmit={save} className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Applications</p>
                <h2 id="add-app-title" className="font-bricolage text-xl font-semibold text-slate-900">Add App</h2>
                <p className="mt-1 text-sm text-slate-500">Enter the app name and website URL. We’ll fetch the Open Graph image for the card.</p>
              </div>
              <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-slate-100" onClick={closeModal} aria-label="Close">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <label className="block text-sm font-medium text-slate-700">
                App Name
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Enter app name"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                URL
                <input
                  required
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Enter website URL"
                />
              </label>
              {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <AdminButton type="button" onClick={closeModal}>Cancel</AdminButton>
              <AdminButton variant="primary" type="submit" loading={saving}>Save</AdminButton>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
