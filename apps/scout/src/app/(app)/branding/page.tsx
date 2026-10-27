'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_BRANDING, type RevealeoBranding } from '@/lib/cms/defaults';
import SafeImage from '@/components/ui/SafeImage';

const input = 'mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm';
const area = 'mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm';

const ASSETS: { key: keyof RevealeoBranding; label: string; hint: string }[] = [
  { key: 'logo_url', label: 'Logo', hint: 'Header logo' },
  { key: 'footer_logo_url', label: 'Footer logo', hint: 'Optional. Falls back to the header logo.' },
  { key: 'favicon_url', label: 'Favicon', hint: 'Browser tab icon' },
  { key: 'og_image_url', label: 'OG image', hint: 'Social share image, about 1200×630' },
];

export default function BrandingPage() {
  const [form, setForm] = useState<RevealeoBranding>(DEFAULT_BRANDING);
  const [previews, setPreviews] = useState<Partial<Record<keyof RevealeoBranding, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string>('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/cms/branding')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load branding');
        setForm({ ...DEFAULT_BRANDING, ...data });
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Could not load branding'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof RevealeoBranding, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const upload = async (key: keyof RevealeoBranding, file: File) => {
    const local = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [key]: local }));
    setUploading(key);
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'branding');
      body.append('field', key);
      const res = await fetch('/api/cms/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      update(key, data.url);
      setMessage('Image saved.');
    } catch (err) {
      setPreviews((prev) => ({ ...prev, [key]: undefined }));
      throw err;
    } finally {
      setUploading('');
      URL.revokeObjectURL(local);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/cms/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setForm({ ...DEFAULT_BRANDING, ...data });
      setMessage('Branding saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Loading branding…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Branding</h1>
          <p className="mt-1 text-sm text-slate-500">Logos, favicon, Open Graph image, and company details for the Revealeo website.</p>
        </div>
        <button type="button" onClick={save} disabled={saving} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save branding'}
        </button>
      </div>
      {message ? <p className={`text-sm ${message.toLowerCase().includes('fail') ? 'text-rose-600' : 'text-emerald-700'}`}>{message}</p> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Visual identity</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ASSETS.map((asset) => (
            <div key={asset.key} className="rounded-2xl border border-slate-100 p-3">
              <p className="text-sm font-semibold text-slate-800">{asset.label}</p>
              <p className="text-xs text-slate-400">{asset.hint}</p>
              <div className="mt-3 flex h-24 items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                {previews[asset.key] || form[asset.key] ? (
                  <SafeImage src={previews[asset.key] || form[asset.key]} alt="" className="max-h-20 max-w-full object-contain" fallback={<span className="text-xs text-slate-400">No file</span>} />
                ) : (
                  <span className="text-xs text-slate-400">{uploading === asset.key ? 'Uploading…' : 'No file'}</span>
                )}
              </div>
              <label className="mt-3 inline-flex cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold">
                {uploading === asset.key ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={Boolean(uploading)}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void upload(asset.key, file).catch((err) => setMessage(err instanceof Error ? err.message : 'Upload failed'));
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Company information</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Company name<input className={input} value={form.company_name} placeholder="Enter company name" onChange={(event) => update('company_name', event.target.value)} /></label>
          <label className="text-sm font-medium">Tagline<input className={input} value={form.tagline} placeholder="Enter tagline" onChange={(event) => update('tagline', event.target.value)} /></label>
          <label className="text-sm font-medium">Email<input className={input} value={form.email} placeholder="Enter email" onChange={(event) => update('email', event.target.value)} /></label>
          <label className="text-sm font-medium">Phone<input className={input} value={form.phone} placeholder="Enter phone" onChange={(event) => update('phone', event.target.value)} /></label>
          <label className="text-sm font-medium">Phone link<input className={input} value={form.phone_href} placeholder="Enter phone number" onChange={(event) => update('phone_href', event.target.value)} /></label>
          <label className="text-sm font-medium sm:col-span-2">Address<textarea className={area} rows={3} value={form.address} placeholder="Enter address" onChange={(event) => update('address', event.target.value)} /></label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Social media</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Facebook URL<input className={input} value={form.facebook_url} placeholder="Enter Facebook URL" onChange={(event) => update('facebook_url', event.target.value)} /></label>
          <label className="text-sm font-medium">Instagram URL<input className={input} value={form.instagram_url} placeholder="Enter Instagram URL" onChange={(event) => update('instagram_url', event.target.value)} /></label>
          <label className="text-sm font-medium">LinkedIn URL<input className={input} value={form.linkedin_url} placeholder="Enter LinkedIn URL" onChange={(event) => update('linkedin_url', event.target.value)} /></label>
          <label className="text-sm font-medium">YouTube URL<input className={input} value={form.youtube_url} placeholder="Enter YouTube URL" onChange={(event) => update('youtube_url', event.target.value)} /></label>
          <label className="text-sm font-medium sm:col-span-2">X / Twitter URL<input className={input} value={form.twitter_url} placeholder="Enter X URL" onChange={(event) => update('twitter_url', event.target.value)} /></label>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Footer</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Footer description<textarea className={area} rows={3} value={form.footer_description} placeholder="Enter footer description" onChange={(event) => update('footer_description', event.target.value)} /></label>
          <label className="text-sm font-medium">Copyright text<input className={input} value={form.copyright_text} placeholder="Enter copyright text" onChange={(event) => update('copyright_text', event.target.value)} /></label>
        </div>
      </section>
    </div>
  );
}
