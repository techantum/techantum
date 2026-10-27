'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import AdminButton from '@/components/admin/AdminButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import ContentFormEditor from '@/components/admin/ContentFormEditor';
import MediaUploadField from '@/components/admin/MediaUploadField';
import RichTextEditor from '@/components/admin/RichTextEditor';
import SectionLivePreview from '@/components/admin/cms/SectionLivePreview';
import ServicesPageEditor from '@/components/admin/cms/ServicesPageEditor';
import { getContentSchema } from '@/lib/cms/content-schemas';
import { mergeCmsContent } from '@/lib/cms/default-content';
import { getDefaultEntryMeta } from '@/lib/cms/merge-entries';
import { findAdminSection } from '@/lib/cms/site-pages';

export default function ContentEditPage() {
  const params = useParams();
  const router = useRouter();
  const key = decodeURIComponent((params?.key as string) || '');
  const found = findAdminSection(key);
  const meta = getDefaultEntryMeta(key);
  const schema = getContentSchema(key);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [brandName, setBrandName] = useState('Techantum');

  useEffect(() => {
    if (!key) {
      router.replace('/admin/content');
      return;
    }
    Promise.all([
      fetch(`/api/admin/content/${encodeURIComponent(key)}`).then((r) => r.json()),
      fetch('/api/admin/branding').then((r) => r.json()).catch(() => ({})),
    ]).then(([data, branding]) => {
      setContent(mergeCmsContent(key, data.content));
      setEnabled(data.is_enabled !== false);
      if (branding?.company_name) setBrandName(branding.company_name);
    }).finally(() => setLoading(false));
  }, [key, router]);

  const title = String(content.titleLine1 || content.title || found?.section.label || meta?.label || 'Section');
  const description = String(content.description || '');
  const image = String(content.heroPosterUrl || content.image || '');

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/content/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_group: meta?.entry_group || found?.page.id || key.split('.')[0],
          label: found?.section.label || meta?.label || key,
          content,
          is_enabled: enabled,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setMessage('Changes saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const heroLike = useMemo(
    () =>
      Boolean(schema?.fields?.some((field) => field.key === 'titleLine1' || field.key === 'primaryCta')) ||
      /^(homepage|custom)\..*\.hero$/i.test(key) ||
      key === 'homepage.hero',
    [key, schema]
  );

  const isServicePage = key.startsWith('service.') || key.startsWith('services.');

  if (!key) return null;
  if (key === 'services.page' || key === 'services.hero') return <ServicesPageEditor />;
  if (loading) return <p className="text-slate-500">Loading section…</p>;

  return (
    <div className="w-full space-y-5">
      <p className="text-xs text-slate-400">
        Content & Brand <span className="px-1">›</span> Website Content <span className="px-1">›</span> {found?.page.label || 'Page'} <span className="px-1">›</span> {found?.section.label || meta?.label}
      </p>
      <AdminPageHeader
        kicker=""
        title={`Edit ${found?.section.label || meta?.label || 'Section'}`}
        description="Update the content, media and settings for this section."
        action={
          <div className="flex gap-2">
            <AdminButton onClick={() => router.push('/admin/content')}>Back</AdminButton>
            <AdminButton variant="primary" loading={saving} onClick={save}>Save Changes</AdminButton>
          </div>
        }
      />
      {message ? <p className={`text-sm ${message.includes('fail') ? 'text-rose-600' : 'text-emerald-700'}`}>{message}</p> : null}

      <div className={`grid items-start gap-5 ${isServicePage ? '' : 'xl:grid-cols-[minmax(0,1fr)_26rem]'}`}>
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Section Content</h2>
            {heroLike ? (
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium">Section Title
                  <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={String(content.titleLine1 || content.title || '')} onChange={(event) => setContent({ ...content, titleLine1: event.target.value, title: event.target.value })} />
                </label>
                <div>
                  <p className="mb-1 text-sm font-medium">Description</p>
                  <RichTextEditor value={description} onChange={(html) => setContent({ ...content, description: html })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">Primary Button Text
                    <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={String(content.primaryCta || '')} onChange={(event) => setContent({ ...content, primaryCta: event.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Primary Button URL
                    <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={String(content.primaryCtaHref || '')} onChange={(event) => setContent({ ...content, primaryCtaHref: event.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Secondary Button Text (Optional)
                    <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={String(content.secondaryCta || '')} onChange={(event) => setContent({ ...content, secondaryCta: event.target.value })} />
                  </label>
                  <label className="text-sm font-medium">Secondary Button URL
                    <input className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" value={String(content.secondaryCtaHref || '')} onChange={(event) => setContent({ ...content, secondaryCtaHref: event.target.value })} />
                  </label>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <ContentFormEditor entryKey={key} content={content} onChange={setContent} />
              </div>
            )}
          </section>

          {heroLike ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Hero Image / Banner</h2>
              <MediaUploadField label="" value={image} onChange={(url) => setContent({ ...content, heroPosterUrl: url })} mediaType="image" hint="JPG, PNG, WebP (Max 5 MB). Recommended: 1920 × 800" />
            </section>
          ) : null}

          {heroLike && schema ? (
            <details className="rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold">More fields</summary>
              <div className="mt-4">
                <ContentFormEditor entryKey={key} content={content} onChange={setContent} />
              </div>
            </details>
          ) : null}

          <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5">
            <div>
              <p className="text-sm font-semibold text-slate-900">Section Settings</p>
              <p className="text-xs text-slate-500">Enable or disable this section on your website.</p>
            </div>
            <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)} className={`relative h-6 w-11 rounded-full ${enabled ? 'bg-secondary' : 'bg-slate-200'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </section>
        </div>

        {isServicePage ? null : (
          <SectionLivePreview
            companyName={brandName}
            title={title}
            description={description}
            primaryCta={String(content.primaryCta || '')}
            primaryHref={String(content.primaryCtaHref || '')}
            secondaryCta={String(content.secondaryCta || '')}
            secondaryHref={String(content.secondaryCtaHref || '')}
            image={image}
          />
        )}
      </div>
      <p className="text-xs text-slate-400">
        <Link href="/admin/content" className="font-semibold text-secondary">Back to Website Content</Link>
      </p>
    </div>
  );
}
