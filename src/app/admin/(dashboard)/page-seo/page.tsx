'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllStaticPublicRoutes } from '@/lib/seo/public-routes';
import { getDivision, getPlan } from '@/lib/service-packages-data';
import AdminButton from '@/components/admin/AdminButton';
import MediaUploadField from '@/components/admin/MediaUploadField';
import Icon from '@/components/ui/AppIcon';

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

const PAGE_COPY: Record<string, { label: string; icon: string }> = {
  '/': { label: 'Home page', icon: 'HomeIcon' },
  '/about': { label: 'About us', icon: 'InformationCircleIcon' },
  '/blog': { label: 'Blog', icon: 'DocumentTextIcon' },
  '/contact': { label: 'Contact', icon: 'EnvelopeIcon' },
  '/login': { label: 'Sign in', icon: 'ArrowRightOnRectangleIcon' },
  '/signup': { label: 'Create account', icon: 'UserPlusIcon' },
  '/portfolio': { label: 'Portfolio', icon: 'Squares2X2Icon' },
  '/privacy-policy': { label: 'Privacy Policy', icon: 'ShieldCheckIcon' },
  '/services': { label: 'Services', icon: 'WrenchScrewdriverIcon' },
  '/testimonials': { label: 'Testimonials', icon: 'ChatBubbleLeftRightIcon' },
  '/terms-of-service': { label: 'Terms of Service', icon: 'ScaleIcon' },
  '/thank-you': { label: 'Thank you', icon: 'CheckCircleIcon' },
};

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100';
const areaClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100';

function pageMeta(path: string) {
  if (PAGE_COPY[path]) return PAGE_COPY[path];
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'services' && parts[1] && !parts[2]) {
    const division = getDivision(parts[1]);
    return { label: division?.shortName || division?.name || parts[1], icon: 'WrenchScrewdriverIcon' };
  }
  if (parts[0] === 'services' && parts[1] && parts[2]) {
    const plan = getPlan(parts[1], parts[2]);
    return { label: plan?.name || parts[2], icon: 'DocumentTextIcon' };
  }
  return { label: path.replace(/^\//, '').replace(/-/g, ' ') || 'Page', icon: 'DocumentTextIcon' };
}

function emptyForm(path: string): PageSeoRow {
  return {
    path,
    index_enabled: true,
    follow_enabled: true,
    title: '',
    description: '',
    og_image_url: '',
    header_scripts: '',
    footer_scripts: '',
  };
}

export default function PageSeoAdminPage() {
  const [rows, setRows] = useState<PageSeoRow[]>([]);
  const [extraPaths, setExtraPaths] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState('/');
  const [form, setForm] = useState<PageSeoRow>(emptyForm('/'));
  const [saved, setSaved] = useState<PageSeoRow>(emptyForm('/'));
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newPath, setNewPath] = useState('');
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
    const existing = rows.find((row) => row.path === selectedPath);
    const next = existing
      ? {
          ...emptyForm(selectedPath),
          ...existing,
          title: existing.title || '',
          description: existing.description || '',
          og_image_url: existing.og_image_url || '',
          header_scripts: existing.header_scripts || '',
          footer_scripts: existing.footer_scripts || '',
        }
      : emptyForm(selectedPath);
    setForm(next);
    setSaved(next);
    setMessage('');
  }, [selectedPath, rows]);

  const allPaths = useMemo(
    () => [...new Set([...DEFAULT_PATHS, ...rows.map((row) => row.path), ...extraPaths])].sort((a, b) => a.localeCompare(b)),
    [rows, extraPaths]
  );

  const visiblePaths = allPaths.filter((path) => {
    const meta = pageMeta(path);
    const haystack = `${path} ${meta.label}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
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
      setMessage('Page settings saved.');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addPage = () => {
    const path = newPath.trim().startsWith('/') ? newPath.trim() : `/${newPath.trim()}`;
    if (path === '/') return;
    setExtraPaths((current) => (current.includes(path) ? current : [...current, path]));
    setSelectedPath(path);
    setNewPath('');
    setAdding(false);
  };

  const meta = pageMeta(selectedPath);
  const titleCount = form.title?.length || 0;
  const descriptionCount = form.description?.length || 0;
  const isPublic = form.index_enabled !== false;

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Page Indexing</h1>
          <p className="mt-1 text-sm text-slate-500">Control search indexing, custom meta, OG images, and page-specific scripts per URL.</p>
        </div>
        <a
          href={selectedPath || '/'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Icon name="ArrowTopRightOnSquareIcon" size={16} />
          View website
        </a>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="font-bricolage font-semibold text-slate-900">Pages</h2>
              <p className="text-xs text-slate-400">{allPaths.length} public routes</p>
            </div>
            <AdminButton variant="primary" size="sm" onClick={() => setAdding((open) => !open)}>+ Add page</AdminButton>
          </div>
          <div className="space-y-3 p-3">
            <label className="relative block">
              <Icon name="MagnifyingGlassIcon" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter search" className={`${inputClass} pl-9`} />
            </label>
            {adding && (
              <div className="flex gap-2">
                <input value={newPath} onChange={(event) => setNewPath(event.target.value)} placeholder="Enter page path" className={inputClass} />
                <AdminButton variant="primary" onClick={addPage}>Add</AdminButton>
              </div>
            )}
            <div className="max-h-[640px] space-y-1 overflow-y-auto">
              {visiblePaths.map((path) => {
                const item = pageMeta(path);
                const active = path === selectedPath;
                return (
                  <button
                    key={path}
                    type="button"
                    onClick={() => setSelectedPath(path)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${active ? 'bg-orange-50 text-slate-900' : 'hover:bg-slate-50'}`}
                  >
                    <Icon name={item.icon} size={16} className={active ? 'text-orange-500' : 'text-slate-400'} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs text-slate-800">{path}</span>
                      <span className="block truncate text-xs text-slate-400">{item.label}</span>
                    </span>
                    <Icon name="ChevronRightIcon" size={14} className="text-slate-300" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <Icon name={meta.icon} size={18} />
              </span>
              <div>
                <h2 className="font-bricolage text-lg font-semibold text-slate-900">{meta.label} ({selectedPath})</h2>
                <p className="text-sm text-slate-500">Set SEO meta, OG image and page-specific scripts for this page.</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isPublic ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-700'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isPublic ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {isPublic ? 'Public page' : 'Hidden from search'}
            </span>
          </div>
          <p className="mb-4 text-right text-xs text-slate-400">Overrides apply on top of global SEO settings.</p>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="MagnifyingGlassIcon" size={16} className="text-sky-600" />
                <h3 className="font-semibold text-slate-900">Indexing</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">Control how this page appears in search engines.</p>
              <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-sky-600" checked={form.index_enabled !== false} onChange={(event) => setForm({ ...form, index_enabled: event.target.checked })} />
                Allow search engine indexing
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-sky-600" checked={form.follow_enabled !== false} onChange={(event) => setForm({ ...form, follow_enabled: event.target.checked })} />
                Allow link following
              </label>
              <p className="mt-3 text-xs text-slate-400">Recommended to keep enabled for public pages.</p>
            </section>

            <section className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="DocumentTextIcon" size={16} className="text-orange-500" />
                <h3 className="font-semibold text-slate-900">Meta Information</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">Customize how this page appears in search results.</p>
              <label className="mb-3 block">
                <span className="mb-1 flex justify-between text-sm font-medium text-slate-700">
                  Custom title
                  <span className={titleCount > 60 ? 'text-xs text-amber-600' : 'text-xs font-normal text-slate-400'}>{titleCount}/60</span>
                </span>
                <input value={form.title || ''} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between text-sm font-medium text-slate-700">
                  Custom description
                  <span className={descriptionCount > 160 ? 'text-xs text-amber-600' : 'text-xs font-normal text-slate-400'}>{descriptionCount}/160</span>
                </span>
                <textarea value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} className={areaClass} />
              </label>
            </section>

            <section className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="PhotoIcon" size={16} className="text-emerald-600" />
                <h3 className="font-semibold text-slate-900">Social Media (OG Image)</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">Get a custom image for social media sharing.</p>
              <MediaUploadField
                label="Upload OG image"
                value={form.og_image_url || ''}
                onChange={(url) => setForm({ ...form, og_image_url: url })}
                mediaType="image"
                hint="Recommended size: 1200 × 630 px (JPG, PNG, WebP)"
              />
            </section>

            <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Icon name="CodeBracketIcon" size={16} className="text-violet-600" />
                <h3 className="font-semibold text-slate-900">Page Scripts</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">Add custom scripts only for this page.</p>
              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Header scripts (this page only)</span>
                <textarea value={form.header_scripts || ''} onChange={(event) => setForm({ ...form, header_scripts: event.target.value })} rows={3} placeholder="Paste custom script for the <head> section..." className={`${areaClass} font-mono text-xs`} />
                <span className="mt-1 block text-xs text-slate-400">E.g. Google Analytics, Meta Pixel, custom meta tags etc.</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Footer scripts (this page only)</span>
                <textarea value={form.footer_scripts || ''} onChange={(event) => setForm({ ...form, footer_scripts: event.target.value })} rows={3} placeholder="Paste custom script before the closing </body> tag..." className={`${areaClass} font-mono text-xs`} />
                <span className="mt-1 block text-xs text-slate-400">E.g. chat widgets, tracking scripts etc.</span>
              </label>
            </section>
          </div>

          {message && (
            <p className={`mt-4 text-sm ${message.toLowerCase().includes('fail') ? 'text-rose-600' : 'text-emerald-700'}`}>{message}</p>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button type="button" className="text-sm font-semibold text-slate-500 hover:text-slate-800" onClick={() => { setForm(saved); setMessage(''); }}>
              Cancel
            </button>
            <AdminButton variant="primary" type="submit" disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
}
