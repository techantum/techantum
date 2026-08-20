'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminButton from '@/components/admin/AdminButton';
import AdminAlert from '@/components/admin/AdminAlert';
import AdminField, { adminInputClass, adminSelectClass, adminTextareaClass } from '@/components/admin/AdminField';
import AdminBadge from '@/components/admin/AdminBadge';
import { OpsPageShell, OpsTd, OpsTh } from '@/components/admin/ops/OpsUi';

type Category = { id: string; name: string; slug: string };
type Entry = {
  id: string;
  category_id: string;
  title: string;
  content: string;
  keywords: string | null;
  status: string;
  allow_ai: boolean;
  source_type?: string;
  source_url?: string | null;
  source_file_url?: string | null;
  ai_knowledge_categories?: { name: string };
};

const emptyForm = {
  category_id: '',
  title: '',
  content: '',
  keywords: '',
  allow_ai: true,
  status: 'DRAFT',
};

const emptyTrain = {
  category_id: '',
  title: '',
  urls: '',
  keywords: '',
  allow_ai: true,
  status: 'PUBLISHED',
};

function sourceLabel(entry: Entry) {
  if (entry.source_type === 'URL') return 'Website';
  if (entry.source_type === 'PDF') return 'PDF';
  return 'Manual';
}

export default function WhatsAppKnowledgePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [train, setTrain] = useState(emptyTrain);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [training, setTraining] = useState(false);

  const load = () => {
    fetch('/api/admin/ai/knowledge')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setCategories(body.categories || []);
        setEntries(body.entries || []);
        const firstCategory = body.categories?.[0]?.id || '';
        if (firstCategory) {
          setForm((prev) => (prev.category_id ? prev : { ...prev, category_id: firstCategory }));
          setTrain((prev) => (prev.category_id ? prev : { ...prev, category_id: firstCategory }));
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = entries.filter((e) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return [e.title, e.content, e.keywords, e.source_url, e.ai_knowledge_categories?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(editingId ? `/api/admin/ai/knowledge/${editingId}` : '/api/admin/ai/knowledge', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setMessage(editingId ? 'Entry updated.' : 'Entry created.');
      setForm({ ...emptyForm, category_id: categories[0]?.id || '' });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const trainFromSources = async () => {
    setTraining(true);
    setError('');
    setMessage('');
    try {
      const data = new FormData();
      data.append('category_id', train.category_id);
      data.append('title', train.title);
      data.append('urls', train.urls);
      data.append('keywords', train.keywords);
      data.append('allow_ai', train.allow_ai ? 'true' : 'false');
      data.append('status', train.status);
      if (pdfFile) data.append('file', pdfFile);
      const res = await fetch('/api/admin/ai/knowledge/ingest', { method: 'POST', body: data });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Import failed');
      const extra = Array.isArray(body.errors) && body.errors.length
        ? ` ${body.errors.length} source${body.errors.length === 1 ? '' : 's'} could not be imported.`
        : '';
      setMessage((body.message || `Imported ${body.count || 0} entries.`) + extra);
      if (body.errors?.length) {
        setError(body.errors.map((item: { source: string; error: string }) => `${item.source}: ${item.error}`).join(' '));
      }
      setTrain({ ...emptyTrain, category_id: categories[0]?.id || train.category_id });
      setPdfFile(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setTraining(false);
    }
  };

  const publish = async (id: string) => {
    const res = await fetch(`/api/admin/ai/knowledge/${id}/publish`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Publish failed');
      return;
    }
    setMessage('Published.');
    load();
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remove this knowledge entry? The assistant will stop using it.')) return;
    const res = await fetch(`/api/admin/ai/knowledge/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json();
      setError(body.error || 'Delete failed');
      return;
    }
    setMessage('Entry removed.');
    if (editingId === id) {
      setEditingId(null);
      setForm({ ...emptyForm, category_id: categories[0]?.id || '' });
    }
    load();
  };

  const edit = (entry: Entry) => {
    setEditingId(entry.id);
    setForm({
      category_id: entry.category_id,
      title: entry.title,
      content: entry.content,
      keywords: entry.keywords || '',
      allow_ai: entry.allow_ai,
      status: entry.status,
    });
  };

  return (
    <OpsPageShell>
      <AdminPageHeader
        title="AI Knowledge Base"
        description="Approved Techantum information the WhatsApp assistant may use. Add pages and PDFs to train it."
      />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

      <AdminSection
        title="Train from website or PDF"
        description="Paste page URLs or upload a text PDF. Extracted content is saved as knowledge the assistant can use."
        accent="emerald"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AdminField label="Category">
            <select className={adminSelectClass} value={train.category_id} onChange={(e) => setTrain({ ...train, category_id: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Title (optional)" hint="Defaults to the page or PDF title">
            <input className={adminInputClass} value={train.title} onChange={(e) => setTrain({ ...train, title: e.target.value })} placeholder="Website services" />
          </AdminField>
          <AdminField label="Website URLs" span={2} hint="One URL per line. HTML pages and PDF links are supported.">
            <textarea
              className={`${adminTextareaClass} min-h-[88px]`}
              value={train.urls}
              onChange={(e) => setTrain({ ...train, urls: e.target.value })}
              placeholder="https://techantum.com&#10;https://techantum.com/services"
            />
          </AdminField>
          <AdminField label="PDF file" hint="Text PDFs up to 15 MB. Scanned image PDFs are not supported.">
            <input
              className={adminInputClass}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
            />
          </AdminField>
          <AdminField label="Keywords" hint="Optional extra search hints">
            <input className={adminInputClass} value={train.keywords} onChange={(e) => setTrain({ ...train, keywords: e.target.value })} />
          </AdminField>
          <AdminField label="After import">
            <select className={adminSelectClass} value={train.status} onChange={(e) => setTrain({ ...train, status: e.target.value })}>
              <option value="PUBLISHED">Publish for AI immediately</option>
              <option value="DRAFT">Save as draft</option>
            </select>
          </AdminField>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={train.allow_ai} onChange={(e) => setTrain({ ...train, allow_ai: e.target.checked })} />
            Allow AI to use imported content
          </label>
        </div>
        <div className="flex gap-2 mt-1">
          <AdminButton variant="primary" disabled={training || (!train.urls.trim() && !pdfFile)} onClick={trainFromSources}>
            {training ? 'Importing…' : 'Train assistant'}
          </AdminButton>
        </div>
      </AdminSection>

      <AdminSection title={editingId ? 'Edit entry' : 'Add knowledge'}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AdminField label="Category">
            <select className={adminSelectClass} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Title">
            <input className={adminInputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </AdminField>
          <AdminField label="Keywords" hint="Comma-separated search hints">
            <input className={adminInputClass} value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
          </AdminField>
          <AdminField label="Status">
            <select className={adminSelectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </AdminField>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.allow_ai} onChange={(e) => setForm({ ...form, allow_ai: e.target.checked })} />
            Allow AI to use this entry
          </label>
          <AdminField label="Content" span={2}>
            <textarea className={`${adminTextareaClass} min-h-[160px]`} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </AdminField>
        </div>
        <div className="flex gap-2 mt-3">
          <AdminButton variant="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : editingId ? 'Update' : 'Create'}</AdminButton>
          {editingId && <AdminButton onClick={() => { setEditingId(null); setForm({ ...emptyForm, category_id: categories[0]?.id || '' }); }}>Cancel</AdminButton>}
        </div>
      </AdminSection>

      <AdminSection title={`${filtered.length} entries`}>
        <input className={`${adminInputClass} max-w-sm mb-3`} placeholder="Search knowledge…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <OpsTh>Title</OpsTh>
                <OpsTh>Source</OpsTh>
                <OpsTh>Category</OpsTh>
                <OpsTh>Status</OpsTh>
                <OpsTh>AI</OpsTh>
                <OpsTh>Actions</OpsTh>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/20 align-top">
                  <OpsTd className="font-medium">
                    <div>{entry.title}</div>
                    {entry.source_url && (
                      <a className="text-xs text-indigo-600 break-all" href={entry.source_url} target="_blank" rel="noreferrer">
                        {entry.source_url}
                      </a>
                    )}
                  </OpsTd>
                  <OpsTd><AdminBadge>{sourceLabel(entry)}</AdminBadge></OpsTd>
                  <OpsTd>{entry.ai_knowledge_categories?.name}</OpsTd>
                  <OpsTd><AdminBadge>{entry.status}</AdminBadge></OpsTd>
                  <OpsTd>{entry.allow_ai ? 'Yes' : 'No'}</OpsTd>
                  <OpsTd>
                    <div className="flex flex-wrap gap-1">
                      <AdminButton size="sm" onClick={() => edit(entry)}>Edit</AdminButton>
                      {entry.status !== 'PUBLISHED' && <AdminButton size="sm" onClick={() => publish(entry.id)}>Publish</AdminButton>}
                      <AdminButton size="sm" variant="danger" onClick={() => remove(entry.id)}>Delete</AdminButton>
                    </div>
                  </OpsTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>
    </OpsPageShell>
  );
}
