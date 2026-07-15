'use client';

import { useEffect, useState } from 'react';
import type { SiteBranding } from '@/lib/cms/types';
import { defaultBranding, normalizeSiteBranding } from '@/lib/cms/default-content';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import MediaUploadField from '@/components/admin/MediaUploadField';

type AssetType = 'logo' | 'footer_logo' | 'favicon';

const assetConfig: { type: AssetType; label: string; field: keyof SiteBranding; hint: string }[] = [
  {
    type: 'logo',
    label: 'Navbar logo',
    field: 'logo_url',
    hint: 'Header logo. PNG with transparency, ~48px height.',
  },
  {
    type: 'footer_logo',
    label: 'Footer logo',
    field: 'footer_logo_url',
    hint: 'Footer logo. Falls back to navbar logo if empty.',
  },
  {
    type: 'favicon',
    label: 'Favicon',
    field: 'favicon_url',
    hint: 'Browser tab icon. 32×32 or 48×48 PNG/ICO.',
  },
];

export default function BrandingAdminPage() {
  const [form, setForm] = useState<SiteBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<AssetType | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/branding')
      .then((r) => r.json())
      .then((data) => setForm(normalizeSiteBranding(data)))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof SiteBranding, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setForm(normalizeSiteBranding(data));
      setMessage('Branding saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (type: AssetType, file: File) => {
    setUploading(type);
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('type', type);
      const res = await fetch('/api/admin/upload/logo', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const columnMap: Record<AssetType, keyof SiteBranding> = {
        logo: 'logo_url',
        footer_logo: 'footer_logo_url',
        favicon: 'favicon_url',
      };
      setForm((prev) => ({ ...prev, [columnMap[type]]: data.url }));
      setMessage(`${type.replace('_', ' ')} uploaded. Save to apply site-wide.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading branding…</p>;

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
      <AdminPageHeader
        title="Branding"
        description="Logo, favicon, company identity, contact details, and WhatsApp widget."
      />

      <AdminSection title="Visual identity" description="Logos and favicon shown across the site.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assetConfig.map(({ type, label, field, hint }) => (
            <div key={type} className="space-y-2">
              <MediaUploadField
                label={label}
                value={form[field] as string}
                onChange={(url) => update(field, url)}
                mediaType="image"
                hint={hint}
              />
              <label className="block">
                <span className="sr-only">Upload {label}</span>
                <input
                  type="file"
                  accept={
                    type === 'favicon'
                      ? 'image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml'
                      : 'image/*'
                  }
                  disabled={uploading === type}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAssetUpload(type, file);
                    e.target.value = '';
                  }}
                  className="text-xs w-full"
                />
              </label>
            </div>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Logo letter fallback</label>
          <input
            value={form.logo_letter}
            onChange={(e) => update('logo_letter', e.target.value)}
            maxLength={2}
            className="w-24 rounded-lg border border-border px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">Shown when no logo image is set.</p>
        </div>
      </AdminSection>

      <AdminSection title="Company" description="Name and tagline used in header, footer, and metadata.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Company name</label>
            <input
              value={form.company_name}
              onChange={(e) => update('company_name', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tagline</label>
            <input
              value={form.tagline}
              onChange={(e) => update('tagline', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </AdminSection>

      <AdminSection title="Contact" description="Email, phone, and address shown on contact page and footer.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              type="email"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone (display)</label>
            <input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone link (digits only)</label>
            <input
              value={form.phone_href}
              onChange={(e) => update('phone_href', e.target.value)}
              placeholder="914040268570"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Address</label>
          <textarea
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
      </AdminSection>

      <AdminSection title="WhatsApp" description="Floating widget, header links, and contact page.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp number (display)</label>
            <input
              value={form.whatsapp}
              onChange={(e) => update('whatsapp', e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp link (digits only)</label>
            <input
              value={form.whatsapp_href}
              onChange={(e) => update('whatsapp_href', e.target.value)}
              placeholder="917032923474"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Pre-filled message</label>
          <textarea
            value={form.whatsapp_widget_message ?? ''}
            onChange={(e) => update('whatsapp_widget_message', e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
      </AdminSection>

      <AdminSection title="Footer" description="Footer copy and copyright line.">
        <div>
          <label className="block text-sm font-medium mb-1">Footer description</label>
          <textarea
            value={form.footer_description}
            onChange={(e) => update('footer_description', e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Copyright text</label>
          <input
            value={form.copyright_text}
            onChange={(e) => update('copyright_text', e.target.value)}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
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
        {saving ? 'Saving…' : 'Save branding'}
      </button>
    </form>
  );
}
