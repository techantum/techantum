'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAllStaticPublicRoutes } from '@/lib/seo/public-routes';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import MediaUploadField from '@/components/admin/MediaUploadField';

interface PageSeoRow {
  path: string;
  index_enabled: boolean;
  follow_enabled: boolean;
  title: string | null;
  description: string | null;
  og_image_url: string | null;
  header_scripts: string;
  footer_scripts: string;
}

const DEFAULT_PATHS = getAllStaticPublicRoutes();

export default function PageSeoAdminPage() {
  const [rows, setRows] = useState<PageSeoRow[]>([]);
  const [selectedPath, setSelectedPath] = useState('/');
  const [form, setForm] = useState<Partial<PageSeoRow>>({
    path: '/',
    index_enabled: true,
    follow_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/page-seo')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRows(data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const existing = rows.find((r) => r.path === selectedPath);
    setForm(
      existing ?? {
        path: selectedPath,
        index_enabled: true,
        follow_enabled: true,
        title: '',
        description: '',
        og_image_url: '',
        header_scripts: '',
        footer_scripts: '',
      }
    );
    setMessage('');
  }, [selectedPath, rows]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/page-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage('Page SEO saved.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const allPaths = [...new Set([...DEFAULT_PATHS, ...rows.map((r) => r.path)])].sort();

  return (
    <div className="space-y-6 max-w-5xl">
      <AdminPageHeader
        title="Page Indexing"
        description="Control search indexing, custom meta, OG images, and page-specific scripts per URL."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminSection title="Pages" description={`${allPaths.length} public routes`}>
          <div className="max-h-[420px] overflow-y-auto -mx-1 px-1 space-y-0.5">
            {allPaths.map((path) => {
              const override = rows.find((r) => r.path === path);
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => setSelectedPath(path)}
                  className={`block w-full text-left text-sm px-3 py-2 rounded-lg ${
                    selectedPath === path ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'
                  }`}
                >
                  <span className="font-mono text-xs">{path}</span>
                  {override && override.index_enabled === false && (
                    <span className="ml-2 text-xs text-amber-700">noindex</span>
                  )}
                </button>
              );
            })}
          </div>
        </AdminSection>

        <form onSubmit={save} className="lg:col-span-2 space-y-4">
          <AdminSection title={selectedPath} description="Overrides apply on top of global SEO settings.">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.index_enabled !== false}
                  onChange={(e) => setForm({ ...form, index_enabled: e.target.checked })}
                />
                Allow indexing
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.follow_enabled !== false}
                  onChange={(e) => setForm({ ...form, follow_enabled: e.target.checked })}
                />
                Allow follow
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom title</label>
              <input
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Leave empty to use page default"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Custom description</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <MediaUploadField
              label="OG image"
              value={form.og_image_url ?? ''}
              onChange={(url) => setForm({ ...form, og_image_url: url })}
              mediaType="image"
              hint="Optional. Overrides global OG image for this page."
            />
            <div>
              <label className="block text-sm font-medium mb-1">Header scripts (this page only)</label>
              <textarea
                value={form.header_scripts ?? ''}
                onChange={(e) => setForm({ ...form, header_scripts: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Footer scripts (this page only)</label>
              <textarea
                value={form.footer_scripts ?? ''}
                onChange={(e) => setForm({ ...form, footer_scripts: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
              />
            </div>
          </AdminSection>

          {message && (
            <p className={`text-sm ${message.includes('failed') ? 'text-red-600' : 'text-green-700'}`}>{message}</p>
          )}

          <button
            type="submit"
            disabled={saving || loading}
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save page settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
