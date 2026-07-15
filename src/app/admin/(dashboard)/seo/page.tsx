'use client';

import { useEffect, useState } from 'react';
import type { SiteSeo } from '@/lib/cms/types';
import { defaultSeo } from '@/lib/cms/default-content';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import MediaUploadField from '@/components/admin/MediaUploadField';

export default function SeoAdminPage() {
  const [form, setForm] = useState<SiteSeo>(defaultSeo);
  const [keywordsText, setKeywordsText] = useState(defaultSeo.keywords.join(', '));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/seo')
      .then((r) => r.json())
      .then((data) => {
        setForm({ ...defaultSeo, ...data });
        setKeywordsText((data.keywords || defaultSeo.keywords).join(', '));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        keywords: keywordsText
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      };
      const res = await fetch('/api/admin/seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setForm(data);
      setMessage('SEO settings saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading SEO settings…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <AdminPageHeader
        title="SEO"
        description="Global search settings, social sharing defaults, and site-wide tracking scripts."
      />

      <AdminSection title="Search visibility" description="Site-wide indexing defaults. Override per page in Page Indexing.">
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.index_site !== false}
              onChange={(e) => setForm({ ...form, index_site: e.target.checked })}
            />
            Allow search engine indexing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.follow_site !== false}
              onChange={(e) => setForm({ ...form, follow_site: e.target.checked })}
            />
            Allow link following
          </label>
        </div>
      </AdminSection>

      <AdminSection title="Default metadata" description="Used when a page has no custom title or description.">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Site title</label>
            <input
              value={form.site_title}
              onChange={(e) => setForm({ ...form, site_title: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title template</label>
            <input
              value={form.title_template}
              onChange={(e) => setForm({ ...form, title_template: e.target.value })}
              placeholder="%s | TechAntum"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meta description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
            <textarea
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Social sharing" description="Open Graph and Twitter card defaults.">
        <MediaUploadField
          label="Default OG image"
          value={form.og_image_url}
          onChange={(url) => setForm({ ...form, og_image_url: url })}
          mediaType="image"
          hint="1200×630 recommended. Used when a page has no custom OG image."
        />
        <div>
          <label className="block text-sm font-medium mb-1">Twitter handle</label>
          <input
            value={form.twitter_handle}
            onChange={(e) => setForm({ ...form, twitter_handle: e.target.value })}
            placeholder="@techantum"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
      </AdminSection>

      <AdminSection title="Technical" description="Canonical URL, hostname preference, and Google Search Console.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Site URL</label>
            <input
              value={form.site_url}
              onChange={(e) => setForm({ ...form, site_url: e.target.value })}
              placeholder="https://techantum.com"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Preferred hostname</label>
            <select
              value={form.canonical_host || 'non-www'}
              onChange={(e) => setForm({ ...form, canonical_host: e.target.value as 'www' | 'non-www' })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="non-www">techantum.com (non-www)</option>
              <option value="www">www.techantum.com</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Google Search Console verification</label>
            <input
              value={form.google_verification}
              onChange={(e) => setForm({ ...form, google_verification: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Global scripts" description="GTM, Google Analytics, or other tags injected on every page.">
        <div>
          <label className="block text-sm font-medium mb-1">Header scripts</label>
          <textarea
            value={form.header_scripts || ''}
            onChange={(e) => setForm({ ...form, header_scripts: e.target.value })}
            rows={4}
            placeholder="<script>...</script> or GTM snippet"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Footer scripts</label>
          <textarea
            value={form.footer_scripts || ''}
            onChange={(e) => setForm({ ...form, footer_scripts: e.target.value })}
            rows={4}
            placeholder="Analytics, chat widgets, etc."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
          />
        </div>
      </AdminSection>

      {message && (
        <p className={`text-sm ${message.includes('failed') ? 'text-red-600' : 'text-green-700'}`}>{message}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save SEO'}
      </button>
    </form>
  );
}
