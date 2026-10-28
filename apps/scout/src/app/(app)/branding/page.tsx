'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_BRANDING, type RevealeoBranding } from '@/lib/cms/defaults';
import { EmailField, NameField, PhoneField, TextAreaField, TextField } from '@/components/ui/FormFields';
import { useProcess } from '@/components/ui/ProcessOverlay';
import SafeImage from '@/components/ui/SafeImage';
import { emailError, nameError, urlError } from '@/lib/forms/rules';
import { phoneError, parsePhone } from '@/lib/forms/phone-countries';

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
  const [uploading, setUploading] = useState<string>('');
  const [message, setMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const overlay = useProcess();

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
      await overlay.run('Uploading image…', async () => {
        const body = new FormData();
        body.append('file', file);
        body.append('folder', 'branding');
        body.append('field', key);
        const res = await fetch('/api/cms/upload', { method: 'POST', body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        update(key, data.url);
        setMessage('Image saved.');
      });
    } catch (err) {
      setPreviews((prev) => ({ ...prev, [key]: undefined }));
      throw err;
    } finally {
      setUploading('');
      URL.revokeObjectURL(local);
    }
  };

  const save = async () => {
    setShowError(true);
    const parsed = parsePhone(form.phone);
    const issue = nameError(form.company_name, 'company name') || (form.email ? emailError(form.email) : '') || phoneError(parsed.iso, parsed.national) || urlError(form.facebook_url) || urlError(form.instagram_url) || urlError(form.linkedin_url) || urlError(form.youtube_url) || urlError(form.twitter_url);
    if (issue) {
      setMessage(issue);
      return;
    }
    setMessage('');
    await overlay.run('Saving branding…', async () => {
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
      }
    });
  };

  if (loading) return <p className="text-slate-500">Loading branding…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 font-bricolage text-3xl font-bold text-slate-900">Branding</h1>
        <button type="button" onClick={() => void save()} className="btn-primary">
          Save branding
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
          <NameField label="Company name" value={form.company_name} onValue={(value) => update('company_name', value)} showError={showError} />
          <TextField label="Tagline" value={form.tagline} onChange={(event) => update('tagline', event.target.value)} />
          <EmailField value={form.email} onValue={(value) => update('email', value)} required={false} showError={showError} />
          <PhoneField value={form.phone} onValue={(value) => update('phone', value)} onHref={(value) => update('phone_href', value)} showError={showError} />
          <TextAreaField label="Address" className="sm:col-span-2" value={form.address} onChange={(event) => update('address', event.target.value)} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Social media</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextField label="Facebook URL" hint="Use a full URL starting with https://." error={showError ? urlError(form.facebook_url) : ''} value={form.facebook_url} onChange={(event) => update('facebook_url', event.target.value)} />
          <TextField label="Instagram URL" hint="Use a full URL starting with https://." error={showError ? urlError(form.instagram_url) : ''} value={form.instagram_url} onChange={(event) => update('instagram_url', event.target.value)} />
          <TextField label="LinkedIn URL" hint="Use a full URL starting with https://." error={showError ? urlError(form.linkedin_url) : ''} value={form.linkedin_url} onChange={(event) => update('linkedin_url', event.target.value)} />
          <TextField label="YouTube URL" hint="Use a full URL starting with https://." error={showError ? urlError(form.youtube_url) : ''} value={form.youtube_url} onChange={(event) => update('youtube_url', event.target.value)} />
          <TextField label="X / Twitter URL" className="sm:col-span-2" hint="Use a full URL starting with https://." error={showError ? urlError(form.twitter_url) : ''} value={form.twitter_url} onChange={(event) => update('twitter_url', event.target.value)} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Footer</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <TextAreaField label="Footer description" value={form.footer_description} onChange={(event) => update('footer_description', event.target.value)} />
          <TextField label="Copyright text" value={form.copyright_text} onChange={(event) => update('copyright_text', event.target.value)} />
        </div>
      </section>
    </div>
  );
}
