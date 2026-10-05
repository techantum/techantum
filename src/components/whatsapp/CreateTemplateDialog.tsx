'use client';

import { useMemo, useState } from 'react';
import { extractTemplateVariables } from '@/lib/whatsapp-provider/template-validation';
import { PortalModal } from './portal-ui';

export default function CreateTemplateDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('UTILITY');
  const [language, setLanguage] = useState('en');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [examples, setExamples] = useState<Record<string, string>>({});
  const [submitToMeta, setSubmitToMeta] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const variables = useMemo(() => extractTemplateVariables(body), [body]);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/portal/wa/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: submitToMeta ? 'create_submit' : 'create',
          name,
          category,
          language,
          body,
          footer,
          examples,
          submitToMeta,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Could not save the template.');
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the template.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <PortalModal title="Create Template" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">
        Create a WhatsApp message template and request Meta approval. Names must be lowercase letters, numbers, and underscores.
      </p>
      {error ? <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      <div className="space-y-3">
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="welcome_message" />
        <div className="grid grid-cols-2 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="UTILITY">Utility</option>
            <option value="MARKETING">Marketing</option>
            <option value="AUTHENTICATION">Authentication</option>
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <option value="en">English (en)</option>
            <option value="en_US">English (en_US)</option>
            <option value="hi">Hindi (hi)</option>
            <option value="te">Telugu (te)</option>
          </select>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Hello {{1}}, your order {{2}} is confirmed." />
        <input value={footer} onChange={(e) => setFooter(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Footer (optional)" />
        {variables.map((variable) => (
          <input
            key={variable}
            value={examples[variable] || ''}
            onChange={(e) => setExamples((current) => ({ ...current, [variable]: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            placeholder={`Sample for {{${variable}}}`}
          />
        ))}
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={submitToMeta} onChange={(e) => setSubmitToMeta(e.target.checked)} />
          Request Meta approval now
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium">
            Cancel
          </button>
          <button type="button" disabled={busy} onClick={save} className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Saving…' : submitToMeta ? 'Create & request approval' : 'Save draft'}
          </button>
        </div>
      </div>
    </PortalModal>
  );
}
