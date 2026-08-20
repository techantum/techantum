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

export default function WhatsAppKnowledgePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch('/api/admin/ai/knowledge')
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || 'Failed to load');
        setCategories(body.categories || []);
        setEntries(body.entries || []);
        if (!form.category_id && body.categories?.[0]?.id) {
          setForm((prev) => ({ ...prev, category_id: body.categories[0].id }));
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
    return [e.title, e.content, e.keywords, e.ai_knowledge_categories?.name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
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
      <AdminPageHeader title="AI Knowledge Base" description="Approved Techantum information the WhatsApp assistant may use." />
      {message && <AdminAlert>{message}</AdminAlert>}
      {error && <AdminAlert variant="error">{error}</AdminAlert>}

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
                <OpsTh>Category</OpsTh>
                <OpsTh>Status</OpsTh>
                <OpsTh>AI</OpsTh>
                <OpsTh>Actions</OpsTh>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/20 align-top">
                  <OpsTd className="font-medium">{entry.title}</OpsTd>
                  <OpsTd>{entry.ai_knowledge_categories?.name}</OpsTd>
                  <OpsTd><AdminBadge>{entry.status}</AdminBadge></OpsTd>
                  <OpsTd>{entry.allow_ai ? 'Yes' : 'No'}</OpsTd>
                  <OpsTd>
                    <div className="flex flex-wrap gap-1">
                      <AdminButton size="sm" onClick={() => edit(entry)}>Edit</AdminButton>
                      {entry.status !== 'PUBLISHED' && <AdminButton size="sm" onClick={() => publish(entry.id)}>Publish</AdminButton>}
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
