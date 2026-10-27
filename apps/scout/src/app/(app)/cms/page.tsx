'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import SafeImage from '@/components/ui/SafeImage';
import { CMS_SECTIONS, DEFAULT_CONTENT, type CmsField } from '@/lib/cms/defaults';

const input = 'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400';
const area = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-violet-400';

type FaqItem = { q: string; a: string };

const PRIMARY = new Set(['title', 'highlight', 'description', 'image', 'ctaLink', 'cta']);

export default function CmsPage() {
  const [content, setContent] = useState<Record<string, Record<string, unknown>>>(DEFAULT_CONTENT);
  const [open, setOpen] = useState('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [advanced, setAdvanced] = useState(false);

  useEffect(() => {
    fetch('/api/cms/content')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load CMS');
        if (data.content) setContent(data.content);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Could not load CMS'))
      .finally(() => setLoading(false));
  }, []);

  const section = CMS_SECTIONS.find((item) => item.key === open) || CMS_SECTIONS[0];
  const values = content[section.key] || {};
  const primaryFields = section.fields.filter((field) => PRIMARY.has(field.key));
  const extraFields = section.fields.filter((field) => !PRIMARY.has(field.key));

  const patch = (key: string, field: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const upload = async (key: string, field: string, file: File) => {
    const local = URL.createObjectURL(file);
    patch(key, field, local);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('folder', 'cms');
      body.append('section', key);
      body.append('field', field);
      const res = await fetch('/api/cms/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      patch(key, field, data.url);
      setMessage('Image saved.');
    } finally {
      URL.revokeObjectURL(local);
    }
  };

  const save = async (key?: string) => {
    setSaving(key || 'all');
    setMessage('');
    try {
      const res = await fetch('/api/cms/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(key ? { key, content: content[key] } : { all: true, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      if (key) setContent((prev) => ({ ...prev, [key]: data }));
      setMessage(key ? `${section.label} saved.` : 'All sections saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving('');
    }
  };

  const reset = () => {
    setContent((prev) => ({ ...prev, [section.key]: { ...DEFAULT_CONTENT[section.key] } }));
  };

  if (loading) return <p className="text-slate-500">Loading CMS…</p>;

  const editorFields = primaryFields.length ? (advanced ? section.fields : primaryFields) : section.fields;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bricolage text-3xl font-bold text-slate-900">Website CMS</h1>
          <p className="mt-1 text-sm text-slate-500">Manage and edit all sections of your website. Update content, images and settings easily.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
            <Icon name="ArrowTopRightOnSquareIcon" size={16} /> View Site
          </Link>
          <button type="button" disabled={Boolean(saving)} onClick={() => void save()} className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving === 'all' ? 'Saving…' : 'Save All Changes'}
          </button>
        </div>
      </div>
      {message ? <p className={`text-sm ${message.toLowerCase().includes('fail') ? 'text-rose-600' : 'text-emerald-700'}`}>{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="font-semibold text-slate-900">Website Sections</p>
          <p className="text-xs text-slate-400">Edit each section of your website.</p>
          <div className="mt-3 space-y-1.5">
            {CMS_SECTIONS.map((item, index) => {
              const active = item.key === section.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => { setOpen(item.key); setAdvanced(false); }}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left ${active ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-white text-violet-700 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-semibold ${active ? 'text-violet-800' : 'text-slate-800'}`}>{item.label}</span>
                    <span className="block truncate text-xs text-slate-400">{item.description}</span>
                  </span>
                  <Icon name="ChevronRightIcon" size={16} className={active ? 'text-violet-400' : 'text-slate-300'} />
                </button>
              );
            })}
          </div>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bricolage text-xl font-bold text-slate-900">{section.label} Section</h2>
              <p className="text-sm text-slate-400">{section.description}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Published
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {editorFields.map((field) => (
                <div key={field.key} className={field.key === 'ctaLink' || field.key === 'cta' ? '' : 'sm:col-span-2'}>
                  <FieldEditor
                    field={field}
                    value={values[field.key]}
                    onChange={(value) => patch(section.key, field.key, value)}
                    onUpload={async (file) => {
                      try {
                        await upload(section.key, field.key, file);
                      } catch (err) {
                        setMessage(err instanceof Error ? err.message : 'Upload failed');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            {extraFields.length > 0 && primaryFields.length > 0 ? (
              <button type="button" className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-600" onClick={() => setAdvanced((value) => !value)}>
                Advanced
                <Icon name={advanced ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={16} />
              </button>
            ) : null}
            {advanced && extraFields.map((field) => (
              <FieldEditor
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(value) => patch(section.key, field.key, value)}
                onUpload={async (file) => {
                  try {
                    await upload(section.key, field.key, file);
                  } catch (err) {
                    setMessage(err instanceof Error ? err.message : 'Upload failed');
                  }
                }}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600">
              <Icon name="TrashIcon" size={16} /> Reset to Default
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => setContent((prev) => prev)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button>
              <button type="button" disabled={saving === section.key} onClick={() => void save(section.key)} className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving === section.key ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  onUpload,
}: {
  field: CmsField;
  value: unknown;
  onChange: (value: unknown) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  if (field.type === 'image') {
    return (
      <div>
        <p className="text-sm font-medium text-slate-700">{field.label}</p>
        <label className="mt-2 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-4 py-6 text-center">
          {value ? (
            <SafeImage src={String(value)} alt="" className="max-h-40 w-full object-contain" />
          ) : (
            <>
              <Icon name="PhotoIcon" size={28} className="text-violet-400" />
              <p className="mt-2 text-sm font-semibold text-slate-700">Upload or drop an image</p>
              <p className="text-xs text-slate-400">JPG, PNG, WebP (Max 5 MB). Recommended: 1920 × 1080</p>
            </>
          )}
          <span className="mt-3 inline-flex rounded-full bg-[#7C3AED] px-4 py-1.5 text-xs font-semibold text-white">Choose Image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpload(file);
              event.target.value = '';
            }}
          />
        </label>
      </div>
    );
  }
  if (field.type === 'textarea') {
    return (
      <label className="block text-sm font-medium text-slate-700">
        {field.label}
        <textarea className={area} rows={3} value={String(value || '')} placeholder={`Enter ${field.label.toLowerCase()}`} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }
  if (field.type === 'list') {
    const lines = Array.isArray(value) ? (value as string[]).join('\n') : String(value || '');
    return (
      <label className="block text-sm font-medium text-slate-700">
        {field.label}
        <textarea className={area} rows={5} value={lines} placeholder="Enter one item per line" onChange={(event) => onChange(event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))} />
      </label>
    );
  }
  if (field.type === 'faq') {
    const items = Array.isArray(value) ? (value as FaqItem[]) : [];
    return (
      <div>
        <p className="text-sm font-medium text-slate-700">{field.label}</p>
        <div className="mt-2 space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-2xl border border-slate-100 p-3">
              <input className={input} value={item.q} placeholder="Enter question" onChange={(event) => onChange(items.map((row, i) => (i === index ? { ...row, q: event.target.value } : row)))} />
              <textarea className={`${area} mt-2`} rows={3} value={item.a} placeholder="Enter answer" onChange={(event) => onChange(items.map((row, i) => (i === index ? { ...row, a: event.target.value } : row)))} />
              <button type="button" className="mt-2 text-xs font-semibold text-rose-600" onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove</button>
            </div>
          ))}
          <button type="button" className="text-sm font-semibold text-violet-700" onClick={() => onChange([...items, { q: '', a: '' }])}>+ Add question</button>
        </div>
      </div>
    );
  }
  return (
    <label className="block text-sm font-medium text-slate-700">
      {field.label}
      <input className={input} value={String(value || '')} placeholder={field.key === 'ctaLink' ? 'Enter URL' : `Enter ${field.label.toLowerCase()}`} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
