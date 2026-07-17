'use client';

import { useEffect, useState } from 'react';
import type { SiteSeo } from '@/lib/cms/types';
import { defaultSeo } from '@/lib/cms/default-content';
import { sanitizeTagId } from '@/lib/seo/marketing-tags';
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
      setForm({ ...defaultSeo, ...data });
      setMessage('SEO settings saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key: keyof SiteSeo, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <p className="text-muted-foreground">Loading SEO settings…</p>;

  const gtmActive = Boolean(sanitizeTagId(form.gtm_id));
  const ga4Active = Boolean(sanitizeTagId(form.ga4_id));
  const gtmLooksInvalid = Boolean(form.gtm_id?.trim()) && !gtmActive;
  const ga4LooksInvalid = Boolean(form.ga4_id?.trim()) && !ga4Active;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <AdminPageHeader
        title="SEO & Marketing"
        description="Google SEO tags, Search Console, tracking pixels, and social media marketing profiles."
      />

      <AdminSection title="Search visibility" description="Site-wide indexing defaults. Override per page in Page Indexing.">
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.index_site !== false}
              onChange={(e) => setField('index_site', e.target.checked)}
            />
            Allow search engine indexing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.follow_site !== false}
              onChange={(e) => setField('follow_site', e.target.checked)}
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
              onChange={(e) => setField('site_title', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title template</label>
            <input
              value={form.title_template}
              onChange={(e) => setField('title_template', e.target.value)}
              placeholder="%s | TechAntum"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Meta description</label>
            <textarea
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
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

      <AdminSection
        title="Google SEO & Search Console"
        description="Verification tags and Google tracking IDs used site-wide for search and analytics."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Google Search Console verification</label>
            <input
              value={form.google_verification || ''}
              onChange={(e) => setField('google_verification', e.target.value)}
              placeholder="Meta content value from Search Console"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste the content value from Google Search Console → HTML tag verification.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Google Tag Manager ID</label>
              <input
                value={form.gtm_id || ''}
                onChange={(e) => setField('gtm_id', e.target.value)}
                placeholder="GTM-XXXXXXX"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
              />
              {gtmLooksInvalid ? (
                <p className="text-xs text-red-600 mt-1">
                  Enter only the container ID (e.g. GTM-ABC123), not the full embed code.
                </p>
              ) : gtmActive ? (
                <p className="text-xs text-green-700 mt-1">GTM will load on all pages.</p>
              ) : null}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Google Analytics 4 ID</label>
              <input
                value={form.ga4_id || ''}
                onChange={(e) => setField('ga4_id', e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used when GTM is empty. Prefer GTM if you manage tags there.
              </p>
              {ga4LooksInvalid ? (
                <p className="text-xs text-red-600 mt-1">
                  Enter only the measurement ID (e.g. G-XXXXXXXXXX), not the full embed code.
                </p>
              ) : ga4Active && !gtmActive ? (
                <p className="text-xs text-green-700 mt-1">GA4 will load on all pages.</p>
              ) : ga4Active && gtmActive ? (
                <p className="text-xs text-amber-700 mt-1">
                  GA4 ID is saved but GTM takes priority — configure GA4 inside your GTM container.
                </p>
              ) : null}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bing Webmaster verification</label>
            <input
              value={form.bing_verification || ''}
              onChange={(e) => setField('bing_verification', e.target.value)}
              placeholder="Bing msvalidate.01 content value"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </AdminSection>

      <AdminSection
        title="Social media marketing"
        description="Ad pixels and public profile URLs for tracking and Organization schema (sameAs)."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Meta (Facebook) Pixel ID</label>
            <input
              value={form.facebook_pixel_id || ''}
              onChange={(e) => setField('facebook_pixel_id', e.target.value)}
              placeholder="1234567890"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">LinkedIn Insight Partner ID</label>
            <input
              value={form.linkedin_partner_id || ''}
              onChange={(e) => setField('linkedin_partner_id', e.target.value)}
              placeholder="123456"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Facebook App ID (Open Graph)</label>
            <input
              value={form.facebook_app_id || ''}
              onChange={(e) => setField('facebook_app_id', e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Twitter / X handle</label>
            <input
              value={form.twitter_handle}
              onChange={(e) => setField('twitter_handle', e.target.value)}
              placeholder="@techantum"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium mb-1">Facebook page URL</label>
            <input
              value={form.facebook_url || ''}
              onChange={(e) => setField('facebook_url', e.target.value)}
              placeholder="https://facebook.com/…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Instagram URL</label>
            <input
              value={form.instagram_url || ''}
              onChange={(e) => setField('instagram_url', e.target.value)}
              placeholder="https://instagram.com/…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">LinkedIn company URL</label>
            <input
              value={form.linkedin_url || ''}
              onChange={(e) => setField('linkedin_url', e.target.value)}
              placeholder="https://linkedin.com/company/…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">YouTube channel URL</label>
            <input
              value={form.youtube_url || ''}
              onChange={(e) => setField('youtube_url', e.target.value)}
              placeholder="https://youtube.com/…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Twitter / X profile URL</label>
            <input
              value={form.twitter_url || ''}
              onChange={(e) => setField('twitter_url', e.target.value)}
              placeholder="https://x.com/…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Social sharing defaults" description="Open Graph image used when a page has no custom OG image.">
        <MediaUploadField
          label="Default OG image"
          value={form.og_image_url}
          onChange={(url) => setField('og_image_url', url)}
          mediaType="image"
          hint="1200×630 recommended."
        />
      </AdminSection>

      <AdminSection title="Technical" description="Canonical URL and hostname preference.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Site URL</label>
            <input
              value={form.site_url}
              onChange={(e) => setField('site_url', e.target.value)}
              placeholder="https://techantum.com"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Preferred hostname</label>
            <select
              value={form.canonical_host || 'non-www'}
              onChange={(e) => setField('canonical_host', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            >
              <option value="non-www">techantum.com (non-www)</option>
              <option value="www">www.techantum.com</option>
            </select>
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Custom scripts" description="Extra snippets (chat widgets, etc.) beyond the structured tags above.">
        <div>
          <label className="block text-sm font-medium mb-1">Header scripts</label>
          <textarea
            value={form.header_scripts || ''}
            onChange={(e) => setField('header_scripts', e.target.value)}
            rows={4}
            placeholder="<script>...</script>"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Footer scripts</label>
          <textarea
            value={form.footer_scripts || ''}
            onChange={(e) => setField('footer_scripts', e.target.value)}
            rows={4}
            placeholder="Analytics, chat widgets, etc."
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
          />
        </div>
      </AdminSection>

      {message && (
        <p className={`text-sm ${message.toLowerCase().includes('fail') ? 'text-red-600' : 'text-green-700'}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save SEO & Marketing'}
      </button>
    </form>
  );
}
