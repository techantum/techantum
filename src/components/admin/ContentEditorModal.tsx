'use client';

import { useEffect, useState } from 'react';
import ContentFormEditor from '@/components/admin/ContentFormEditor';
import { getContentSchema } from '@/lib/cms/content-schemas';
import { mergeCmsContent } from '@/lib/cms/default-content';
import { getDefaultEntryMeta } from '@/lib/cms/merge-entries';

interface ContentEditorModalProps {
  entryKey: string;
  label: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ContentEditorModal({
  entryKey,
  label,
  open,
  onClose,
  onSaved,
}: ContentEditorModalProps) {
  const schema = getContentSchema(entryKey);
  const useJsonEditor = !schema || schema.useJsonEditor;

  const [content, setContent] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !entryKey) return;

    setLoading(true);
    setMessage('');
    fetch(`/api/admin/content/${encodeURIComponent(entryKey)}`)
      .then((r) => r.json())
      .then((data) => {
        const loaded = mergeCmsContent(entryKey, data.content);
        setContent(loaded);
        setJsonText(JSON.stringify(loaded, null, 2));
      })
      .finally(() => setLoading(false));
  }, [open, entryKey]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      let payload = content;
      if (useJsonEditor) {
        payload = JSON.parse(jsonText);
      }
      const defaults = getDefaultEntryMeta(entryKey);
      const res = await fetch(`/api/admin/content/${encodeURIComponent(entryKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_group: defaults?.entry_group || entryKey.split('.')[0],
          label: defaults?.label || label,
          content: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setContent(payload);
      setJsonText(JSON.stringify(payload, null, 2));
      setMessage('Saved successfully.');
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div
        className="bg-white w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-xl border border-border shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="content-editor-title"
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h2 id="content-editor-title" className="font-semibold text-lg text-foreground truncate">
              {label}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{entryKey}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-8 w-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Close editor"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading section…</p>
            ) : useJsonEditor ? (
              <div>
                <label className="block text-sm font-medium mb-1">Content (JSON)</label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={20}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono"
                />
              </div>
            ) : (
              <ContentFormEditor entryKey={entryKey} content={content} onChange={setContent} />
            )}
          </div>

          <div className="px-5 py-4 border-t border-border flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 bg-muted/10">
            {message && (
              <p
                className={`text-sm flex-1 ${message.includes('success') ? 'text-green-700' : 'text-muted-foreground'}`}
              >
                {message}
              </p>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save section'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
