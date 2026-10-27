'use client';

import { useEffect, useState } from 'react';
import type { SiteSeo } from '@/lib/cms/types';
import { defaultSeo } from '@/lib/cms/default-content';
import { sanitizeTagId } from '@/lib/seo/marketing-tags';
import AdminButton from '@/components/admin/AdminButton';
import MediaUploadField from '@/components/admin/MediaUploadField';
import Icon from '@/components/ui/AppIcon';

type SeoForm = SiteSeo & { updated_at?: string };

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100';
const areaClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-100';

function splitSiteUrl(url: string) {
  const protocol = url.startsWith('http://') ? 'http://' : 'https://';
  const host = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return { protocol, host };
}

function formatUpdated(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

function Pill({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
      {ok ? on : off}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-sky-500' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function BrandMark({ children, className }: { children: string; className: string }) {
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white ${className}`}>
      {children}
    </span>
  );
}

export default function SeoAdminPage() {
  const [form, setForm] = useState<SeoForm>(defaultSeo);
  const [saved, setSaved] = useState<SeoForm>(defaultSeo);
  const [keywordsText, setKeywordsText] = useState(defaultSeo.keywords.join(', '));
  const [savedKeywords, setSavedKeywords] = useState(defaultSeo.keywords.join(', '));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);

  const applyLoaded = (data: SeoForm) => {
    const next = { ...defaultSeo, ...data };
    setForm(next);
    setSaved(next);
    const words = (data.keywords || defaultSeo.keywords).join(', ');
    setKeywordsText(words);
    setSavedKeywords(words);
  };

  useEffect(() => {
    fetch('/api/admin/seo')
      .then((r) => r.json())
      .then((data) => applyLoaded(data))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        keywords: keywordsText.split(',').map((k) => k.trim()).filter(Boolean),
      };
      const res = await fetch('/api/admin/seo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      applyLoaded(data);
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

  const setCanonical = (protocol: string, host: string) => {
    const clean = host.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    setForm((prev) => ({
      ...prev,
      site_url: `${protocol}${clean}`,
      canonical_host: clean.toLowerCase().startsWith('www.') ? 'www' : 'non-www',
    }));
  };

  if (loading) return <p className="text-sm text-slate-500">Loading SEO settings…</p>;

  const indexing = form.index_site !== false;
  const following = form.follow_site !== false;
  const sitemapOn = form.sitemap_enabled !== false;
  const metadataComplete = Boolean(form.site_title?.trim() && form.description?.trim());
  const gscOn = Boolean(form.google_verification?.trim());
  const ga4On = Boolean(sanitizeTagId(form.ga4_id));
  const gtmOn = Boolean(sanitizeTagId(form.gtm_id));
  const metaOn = Boolean(sanitizeTagId(form.facebook_pixel_id));
  const linkedinOn = Boolean(sanitizeTagId(form.linkedin_partner_id));
  const connected = [gscOn, ga4On, gtmOn, metaOn, linkedinOn].filter(Boolean).length;
  const { protocol, host } = splitSiteUrl(form.site_url || '');
  const previewHost = host || 'www.techantum.com';
  const titleCount = form.site_title?.length || 0;
  const descriptionCount = form.description?.length || 0;
  const updatedLabel = formatUpdated(form.updated_at);
  const gtmInvalid = Boolean(form.gtm_id?.trim()) && !gtmOn;
  const ga4Invalid = Boolean(form.ga4_id?.trim()) && !ga4On;

  return (
    <form onSubmit={handleSave} className="w-full space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-slate-400">
            Workspace <span className="mx-1">›</span> <span className="text-slate-500">SEO & Marketing</span>
          </p>
          <h1 className="mt-1 font-bricolage text-3xl font-bold text-slate-900">SEO & Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">
            Google SEO tags, Search Console, tracking pixels, and social media marketing profiles.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setGuideOpen((open) => !open)}
          className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <Icon name="QuestionMarkCircleIcon" size={16} />
          Help & guide
        </button>
      </div>

      {guideOpen && (
        <div className="rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">How this page is used</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Search visibility controls indexing, link following, and whether sitemap.xml is published.</li>
            <li>Default metadata is used when a page has no custom title or description. Per-page overrides live in Page Indexing.</li>
            <li>Search Console, Analytics, Tag Manager, pixels, and profile URLs are saved here and applied site-wide.</li>
            <li>Robots.txt custom rules accept lines such as <span className="font-mono">Disallow: /private/</span>.</li>
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          icon="MagnifyingGlassIcon"
          iconClass="bg-emerald-50 text-emerald-600"
          title="Search visibility"
          hint="Your site is set to be indexed and can appear in search results."
          pill={<Pill ok={indexing} on="Enabled" off="Disabled" />}
        />
        <StatCard
          icon="DocumentTextIcon"
          iconClass="bg-sky-50 text-sky-600"
          title="Metadata completion"
          hint="Site title and meta description are set."
          pill={<Pill ok={metadataComplete} on="Complete" off="Incomplete" />}
        />
        <StatCard
          icon="LinkIcon"
          iconClass="bg-violet-50 text-violet-600"
          title="Connected channels"
          hint={`${connected} of 5 marketing tools connected.`}
          pill={<span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-600">{connected} connected</span>}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="mb-2 flex items-center gap-2">
            <Icon name="GlobeAltIcon" size={18} className="text-orange-500" />
            <h2 className="font-bricolage text-base font-semibold text-slate-900">Search visibility</h2>
          </div>
          <p className="mb-2 text-xs text-slate-500">Control how search engines crawl and index your site.</p>
          <Toggle
            checked={indexing}
            onChange={(value) => setField('index_site', value)}
            label="Allow search engine indexing"
            hint="Let search engines like Google index your site and show it in search results."
          />
          <Toggle
            checked={following}
            onChange={(value) => setField('follow_site', value)}
            label="Allow link following"
            hint="Allow search engines to follow links on your site to discover more pages."
          />
          <Toggle
            checked={sitemapOn}
            onChange={(value) => setField('sitemap_enabled', value)}
            label="Generate XML sitemap automatically"
            hint="Automatically create and keep an up-to-date sitemap for search engines."
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-5">
          <div className="mb-1 flex items-center gap-2">
            <Icon name="DocumentTextIcon" size={18} className="text-orange-500" />
            <h2 className="font-bricolage text-base font-semibold text-slate-900">Default metadata</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">Used when a page has no custom title or description.</p>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
                Site title
                <span className={titleCount > 60 ? 'text-xs text-amber-600' : 'text-xs font-normal text-slate-400'}>{titleCount}/60</span>
              </span>
              <input value={form.site_title} onChange={(e) => setField('site_title', e.target.value)} className={inputClass} />
              <span className="mt-1 block text-xs text-slate-400">This will appear in browser tabs and search results.</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Title template</span>
              <input value={form.title_template} onChange={(e) => setField('title_template', e.target.value)} className={inputClass} />
              <span className="mt-1 block text-xs text-slate-400">Use %s to represent the page title.</span>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-sm font-medium text-slate-700">
                Meta description
                <span className={descriptionCount > 160 ? 'text-xs text-amber-600' : 'text-xs font-normal text-slate-400'}>{descriptionCount}/160</span>
              </span>
              <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} rows={3} className={areaClass} />
              <span className="mt-1 block text-xs text-slate-400">A short summary of your site that appears in search results.</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Keywords (comma-separated)</span>
              <textarea value={keywordsText} onChange={(e) => setKeywordsText(e.target.value)} rows={2} className={areaClass} />
              <span className="mt-1 block text-xs text-slate-400">Add relevant keywords to help search engines understand your site.</span>
            </label>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Canonical domain</span>
              <div className="flex gap-2">
                <select value={protocol} onChange={(e) => setCanonical(e.target.value, host)} className={`${inputClass} w-28`}>
                  <option value="https://">https://</option>
                  <option value="http://">http://</option>
                </select>
                <input value={host} onChange={(e) => setCanonical(protocol, e.target.value)} className={inputClass} placeholder="Enter domain" />
              </div>
              <span className="mt-1 block text-xs text-slate-400">The preferred domain for your site (e.g. www.example.com).</span>
            </div>
            <MediaUploadField
              label="Default OG image"
              value={form.og_image_url}
              onChange={(url) => setField('og_image_url', url)}
              mediaType="image"
              hint="1200×630 recommended. Used when a page has no custom share image."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
          <div className="mb-1 flex items-center gap-2">
            <Icon name="MagnifyingGlassIcon" size={18} className="text-sky-500" />
            <h2 className="font-bricolage text-base font-semibold text-slate-900">Google search preview</h2>
          </div>
          <p className="mb-4 text-xs text-slate-500">This is how your site may appear in search results.</p>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-bold text-sky-600 shadow-sm">T</span>
              {protocol}{previewHost}
            </div>
            <p className="mt-1 text-base font-medium text-blue-700">{form.site_title || 'Site title'}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{form.description || 'Meta description'}</p>
          </div>
          <div className="mt-4 flex gap-2 rounded-2xl bg-sky-50 px-3 py-3 text-xs leading-5 text-slate-600">
            <Icon name="InformationCircleIcon" size={16} className="mt-0.5 shrink-0 text-sky-500" />
            <p>
              <span className="font-semibold text-slate-700">Tip. </span>
              This is a preview of how your homepage may appear. Actual appearance can vary based on the search query and Google&apos;s formatting.
            </p>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bricolage text-base font-semibold text-slate-900">Google SEO & Search Console</h2>
          <p className="mt-1 text-xs text-slate-500">Verification tags and tracking IDs used site-wide for search and analytics.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TagField
              mark={<BrandMark className="bg-white text-slate-800 ring-1 ring-slate-200">G</BrandMark>}
              label="Google Search Console verification"
              status={<Pill ok={gscOn} on="Connected" off="Not connected" />}
              value={form.google_verification || ''}
              onChange={(value) => setField('google_verification', value)}
              placeholder="Meta content value from Search Console"
              hint="Paste the content value from Google Search Console → HTML tag verification."
              area
            />
            <TagField
              mark={<BrandMark className="bg-amber-500">G</BrandMark>}
              label="Google Analytics 4 measurement ID"
              status={<Pill ok={ga4On} on="Connected" off="Not connected" />}
              value={form.ga4_id || ''}
              onChange={(value) => setField('ga4_id', value)}
              placeholder="G-XXXXXXXXXX"
              hint={ga4Invalid ? 'Enter only the measurement ID (e.g. G-XXXXXXXXXX).' : 'Your GA4 measurement ID (e.g. G-XXXXXXXXXX).'}
              mono
            />
            <TagField
              mark={<BrandMark className="bg-sky-500">G</BrandMark>}
              label="Google Tag Manager container ID"
              status={<Pill ok={gtmOn} on="Connected" off="Not connected" />}
              value={form.gtm_id || ''}
              onChange={(value) => setField('gtm_id', value)}
              placeholder="GTM-XXXXXXX"
              hint={gtmInvalid ? 'Enter only the container ID (e.g. GTM-ABC123).' : 'Your Google Tag Manager container ID (e.g. GTM-XXXXXXX).'}
              mono
            />
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Icon name="DocumentTextIcon" size={16} className="text-slate-400" />
                Robots.txt custom rules
              </span>
              <textarea
                value={form.robots_extra || ''}
                onChange={(e) => setField('robots_extra', e.target.value)}
                rows={5}
                placeholder={'# Add custom robots.txt rules here\n# Example:\n# Disallow: /admin/'}
                className={`${areaClass} font-mono text-xs`}
              />
              <span className="mt-1 block text-xs text-slate-400">These rules will be added to your site&apos;s robots.txt file.</span>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Bing Webmaster verification</span>
              <input
                value={form.bing_verification || ''}
                onChange={(e) => setField('bing_verification', e.target.value)}
                placeholder="Bing msvalidate.01 content value"
                className={`${inputClass} font-mono`}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bricolage text-base font-semibold text-slate-900">Tracking pixels & analytics</h2>
          <p className="mt-1 text-xs text-slate-500">Add tracking pixels and scripts to measure performance and run marketing campaigns.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TagField
              mark={<BrandMark className="bg-blue-600">f</BrandMark>}
              label="Meta Pixel ID"
              value={form.facebook_pixel_id || ''}
              onChange={(value) => setField('facebook_pixel_id', value)}
              placeholder="e.g. 123456789012345"
              hint="Your Facebook Pixel ID."
              mono
            />
            <TagField
              mark={<BrandMark className="bg-sky-700">in</BrandMark>}
              label="LinkedIn Insight Tag"
              value={form.linkedin_partner_id || ''}
              onChange={(value) => setField('linkedin_partner_id', value)}
              placeholder="e.g. 1234567"
              hint="Your LinkedIn Insight Tag ID."
              mono
            />
            <TagField
              mark={<BrandMark className="bg-emerald-600">Ad</BrandMark>}
              label="Google Ads Conversion ID"
              value={form.google_ads_id || ''}
              onChange={(value) => setField('google_ads_id', value)}
              placeholder="e.g. AW-123456789"
              hint={gtmOn ? 'Saved here. Tag Manager is active, so load this conversion inside the container.' : 'Your Google Ads Conversion ID. Loaded when Tag Manager is empty.'}
              mono
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Facebook App ID</span>
              <input
                value={form.facebook_app_id || ''}
                onChange={(e) => setField('facebook_app_id', e.target.value)}
                placeholder="Optional Open Graph app ID"
                className={`${inputClass} font-mono`}
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Icon name="CodeBracketIcon" size={16} className="text-orange-500" />
                Custom header script
              </span>
              <textarea
                value={form.header_scripts || ''}
                onChange={(e) => setField('header_scripts', e.target.value)}
                rows={4}
                placeholder="<!-- Add custom code for head section -->"
                className={`${areaClass} font-mono text-xs`}
              />
              <span className="mt-1 block text-xs text-slate-400">This code will be added to the &lt;head&gt; section of your site.</span>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <Icon name="CodeBracketIcon" size={16} className="text-orange-500" />
                Custom footer script
              </span>
              <textarea
                value={form.footer_scripts || ''}
                onChange={(e) => setField('footer_scripts', e.target.value)}
                rows={4}
                placeholder="<!-- Add custom code before closing </body> -->"
                className={`${areaClass} font-mono text-xs`}
              />
              <span className="mt-1 block text-xs text-slate-400">This code will be added before the closing &lt;/body&gt; tag.</span>
            </label>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bricolage text-base font-semibold text-slate-900">Social media profiles</h2>
        <p className="mt-1 text-xs text-slate-500">Add your social media profiles to help people find and connect with you.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SocialField icon="f" iconClass="bg-blue-600" label="Facebook" value={form.facebook_url || ''} onChange={(value) => setField('facebook_url', value)} placeholder="Enter Facebook URL" />
          <SocialField icon="ig" iconClass="bg-pink-500" label="Instagram" value={form.instagram_url || ''} onChange={(value) => setField('instagram_url', value)} placeholder="Enter Instagram URL" />
          <SocialField icon="in" iconClass="bg-sky-700" label="LinkedIn" value={form.linkedin_url || ''} onChange={(value) => setField('linkedin_url', value)} placeholder="Enter LinkedIn URL" />
          <SocialField icon="X" iconClass="bg-slate-900" label="X / Twitter" value={form.twitter_url || ''} onChange={(value) => setField('twitter_url', value)} placeholder="Enter X URL" />
          <SocialField icon="▶" iconClass="bg-red-600" label="YouTube" value={form.youtube_url || ''} onChange={(value) => setField('youtube_url', value)} placeholder="Enter YouTube URL" />
        </div>
        <label className="mt-4 block max-w-sm">
          <span className="mb-1 block text-sm font-medium text-slate-700">X / Twitter handle</span>
          <input value={form.twitter_handle} onChange={(e) => setField('twitter_handle', e.target.value)} placeholder="Enter X handle" className={inputClass} />
        </label>
      </section>

      {message && (
        <p className={`text-sm ${message.toLowerCase().includes('fail') || message.toLowerCase().includes('error') ? 'text-rose-600' : 'text-emerald-700'}`}>
          {message}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs text-slate-400">
          <Icon name="ClockIcon" size={14} />
          {updatedLabel ? `Last updated on ${updatedLabel}` : 'Not saved yet'}
        </p>
        <div className="flex items-center gap-2">
          <AdminButton
            type="button"
            onClick={() => {
              setForm(saved);
              setKeywordsText(savedKeywords);
              setMessage('');
            }}
          >
            Cancel
          </AdminButton>
          <AdminButton variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </AdminButton>
        </div>
      </div>
    </form>
  );
}

function StatCard({
  icon,
  iconClass,
  title,
  hint,
  pill,
}: {
  icon: string;
  iconClass: string;
  title: string;
  hint: string;
  pill: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon name={icon} size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">{hint}</p>
        </div>
      </div>
      {pill}
    </div>
  );
}

function TagField({
  mark,
  label,
  status,
  value,
  onChange,
  placeholder,
  hint,
  mono,
  area,
}: {
  mark: React.ReactNode;
  label: string;
  status?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint: string;
  mono?: boolean;
  area?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between gap-2 text-sm font-medium text-slate-700">
        <span className="inline-flex items-center gap-2">{mark}{label}</span>
        {status}
      </span>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder} className={`${areaClass} ${mono ? 'font-mono text-xs' : ''}`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputClass} ${mono ? 'font-mono' : ''}`} />
      )}
      <span className="mt-1 block text-xs text-slate-400">{hint}</span>
    </label>
  );
}

function SocialField({
  icon,
  iconClass,
  label,
  value,
  onChange,
  placeholder,
}: {
  icon: string;
  iconClass: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <BrandMark className={iconClass}>{icon}</BrandMark>
        {label}
      </span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}
