'use client';

import { useEffect, useState } from 'react';
import type { SiteBranding } from '@/lib/cms/types';
import { defaultBranding, normalizeSiteBranding } from '@/lib/cms/default-content';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';
import SafeImage from '@/components/ui/SafeImage';

type AssetType = 'logo' | 'footer_logo' | 'favicon';

const assetConfig: { type: AssetType; label: string; field: keyof SiteBranding; hint: string }[] = [
  { type: 'logo', label: 'Navbar Logo', field: 'logo_url', hint: 'Header logo. PNG with transparency. ~48px height.' },
  { type: 'footer_logo', label: 'Footer Logo', field: 'footer_logo_url', hint: 'Footer logo. Falls back to navbar logo if empty.' },
  { type: 'favicon', label: 'Favicon', field: 'favicon_url', hint: 'Browser tab icon. 32×32 or 48×48 PNG/ICO.' },
];

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';
const areaClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20';

export default function BrandingAdminPage() {
  const [form, setForm] = useState<SiteBranding>(defaultBranding);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<AssetType | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/admin/branding')
      .then((r) => r.json())
      .then((data) => {
        setForm(normalizeSiteBranding(data));
        setUpdatedAt(data.updated_at || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof SiteBranding, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
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
      setUpdatedAt(data.updated_at || new Date().toISOString());
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

  if (loading) return <p className="text-slate-500">Loading branding…</p>;

  return (
    <div className="w-full space-y-5">
      <AdminPageHeader
        kicker="Settings"
        title="Branding"
        description="Manage logos, company identity, contact details, WhatsApp settings, and footer copy globally across the site."
        action={
          <p className="text-xs text-emerald-600">
            ● Last updated {updatedAt ? new Date(updatedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'today'}
          </p>
        }
      />
      {message ? <p className={`text-sm ${message.toLowerCase().includes('fail') ? 'text-rose-600' : 'text-emerald-700'}`}>{message}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon name="SwatchIcon" size={16} className="text-secondary" /> Visual Identity
        </h2>
        <p className="mt-1 text-xs text-slate-500">Upload your logos and favicon. These are used across the website. Use high-quality files (PNG, JPG or SVG).</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {assetConfig.map(({ type, label, field, hint }) => (
            <div key={type} className="rounded-2xl border border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <p className="mt-1 text-xs text-slate-500">{hint}</p>
              <div className="mt-3 flex h-24 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
                {form[field] ? (
                  <SafeImage src={String(form[field])} alt="" className="max-h-16 max-w-full object-contain" fallback={<span className="text-xs text-slate-400">No file chosen</span>} />
                ) : (
                  <span className="text-xs text-slate-400">No file chosen</span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-full border border-slate-200 py-2 text-xs font-semibold text-slate-700">
                  <Icon name="ArrowUpTrayIcon" size={14} /> Choose file
                  <input
                    type="file"
                    className="hidden"
                    accept={type === 'favicon' ? 'image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml' : 'image/*'}
                    disabled={uploading === type}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) handleAssetUpload(type, file);
                      event.target.value = '';
                    }}
                  />
                </label>
                <button type="button" className="rounded-full border border-rose-100 px-3 py-2 text-xs font-semibold text-rose-600" onClick={() => update(field, '')}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <label className="mt-4 block max-w-xs text-sm font-medium">Logo letter fallback
          <input className={`${inputClass} mt-1 w-24`} value={form.logo_letter} maxLength={2} placeholder="Enter letter" onChange={(event) => update('logo_letter', event.target.value)} />
        </label>
        <p className="mt-1 text-xs text-slate-500">Single character shown when no logo image is set.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon name="BuildingOffice2Icon" size={16} className="text-secondary" /> Company Information
        </h2>
        <p className="mt-1 text-xs text-slate-500">Name and tagline used in header, footer, and metadata.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Company name
            <input className={`${inputClass} mt-1`} value={form.company_name} placeholder="Enter company name" onChange={(event) => update('company_name', event.target.value)} />
          </label>
          <label className="text-sm font-medium">Tagline
            <input className={`${inputClass} mt-1`} value={form.tagline} placeholder="Enter tagline" onChange={(event) => update('tagline', event.target.value)} />
          </label>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon name="EnvelopeIcon" size={16} className="text-secondary" /> Contact Information
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Email
              <input className={`${inputClass} mt-1`} type="email" value={form.email} placeholder="Enter email" onChange={(event) => update('email', event.target.value)} />
            </label>
            <label className="text-sm font-medium">Phone (display)
              <input className={`${inputClass} mt-1`} value={form.phone} placeholder="Enter phone" onChange={(event) => update('phone', event.target.value)} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">Phone link (digits only)
              <input className={`${inputClass} mt-1`} value={form.phone_href} placeholder="Enter phone number" onChange={(event) => update('phone_href', event.target.value)} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">Address
              <textarea className={`${areaClass} mt-1`} rows={3} value={form.address} placeholder="Enter address" onChange={(event) => update('address', event.target.value)} />
            </label>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon name="ChatBubbleLeftRightIcon" size={16} className="text-secondary" /> WhatsApp Widget
          </h2>
          <p className="mt-1 text-xs text-slate-500">Floating widget, header links, and contact page.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">WhatsApp number (display)
              <input className={`${inputClass} mt-1`} value={form.whatsapp} placeholder="Enter WhatsApp number" onChange={(event) => update('whatsapp', event.target.value)} />
            </label>
            <label className="text-sm font-medium">WhatsApp link (digits only)
              <input className={`${inputClass} mt-1`} value={form.whatsapp_href} placeholder="Enter WhatsApp number" onChange={(event) => update('whatsapp_href', event.target.value)} />
            </label>
            <label className="text-sm font-medium sm:col-span-2">Pre-filled message
              <textarea className={`${areaClass} mt-1`} rows={3} value={form.whatsapp_widget_message ?? ''} placeholder="Enter message" onChange={(event) => update('whatsapp_widget_message', event.target.value)} />
            </label>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Icon name="DocumentTextIcon" size={16} className="text-secondary" /> Footer & Legal
        </h2>
        <p className="mt-1 text-xs text-slate-500">Footer copy and copyright line.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Footer description
            <textarea className={`${areaClass} mt-1`} rows={3} value={form.footer_description} placeholder="Enter footer description" onChange={(event) => update('footer_description', event.target.value)} />
          </label>
          <label className="text-sm font-medium">Copyright text
            <input className={`${inputClass} mt-1`} value={form.copyright_text} placeholder="Enter copyright text" onChange={(event) => update('copyright_text', event.target.value)} />
          </label>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <AdminButton onClick={() => window.location.reload()}>Cancel</AdminButton>
        <AdminButton variant="primary" loading={saving} onClick={handleSave}>Save branding</AdminButton>
      </div>
    </div>
  );
}
