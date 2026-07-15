'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';

interface Redirect {
  id: string;
  source_path: string;
  destination_path: string;
  is_permanent: boolean;
  enabled: boolean;
  note: string | null;
}

export default function RedirectsAdminPage() {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    source_path: '',
    destination_path: '',
    is_permanent: true,
    note: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/redirects')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRedirects(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addRedirect = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch('/api/admin/redirects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add redirect');
      setForm({ source_path: '', destination_path: '', is_permanent: true, note: '' });
      setMessage('Redirect added.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add redirect');
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    const res = await fetch(`/api/admin/redirects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (res.ok) load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this redirect?')) return;
    const res = await fetch(`/api/admin/redirects/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const activeCount = redirects.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <AdminPageHeader
        title="Redirects"
        description={`Manage URL redirects for moved or broken pages. ${activeCount} active.`}
      />

      <AdminSection title="Add redirect" description="Source path must start with /. Destination can be a path or full URL.">
        <form onSubmit={addRedirect} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <input
                placeholder="/old-page"
                value={form.source_path}
                onChange={(e) => setForm({ ...form, source_path: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <input
                placeholder="/new-page or https://..."
                value={form.destination_path}
                onChange={(e) => setForm({ ...form, destination_path: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note (optional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_permanent}
              onChange={(e) => setForm({ ...form, is_permanent: e.target.checked })}
            />
            Permanent redirect (301)
          </label>
          <button type="submit" className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium">
            Add redirect
          </button>
        </form>
        {message && (
          <p className={`text-sm mt-2 ${message.includes('Failed') ? 'text-red-600' : 'text-green-700'}`}>{message}</p>
        )}
      </AdminSection>

      <AdminSection title="Active redirects" description={`${redirects.length} total rules`}>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : redirects.length === 0 ? (
          <p className="text-muted-foreground text-sm">No redirects configured.</p>
        ) : (
          <div className="space-y-2">
            {redirects.map((r) => (
              <div
                key={r.id}
                className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg ${
                  r.enabled ? 'border-border bg-muted/20' : 'border-dashed border-border opacity-60'
                }`}
              >
                <div className="flex-1 text-sm min-w-0">
                  <div className="flex flex-wrap items-center gap-1 font-mono text-xs sm:text-sm">
                    <span>{r.source_path}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="truncate">{r.destination_path}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({r.is_permanent ? '301' : '302'})
                    </span>
                  </div>
                  {r.note && <p className="text-xs text-muted-foreground mt-1">{r.note}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleEnabled(r.id, !r.enabled)}
                    className="text-xs px-2.5 py-1 rounded border border-border hover:bg-muted"
                  >
                    {r.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="text-xs px-2.5 py-1 rounded text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
