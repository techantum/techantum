'use client';

import { useState } from 'react';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import AdminButton from '@/components/admin/AdminButton';

export function ScopeFields({
  documentUrl,
  url,
  onDocumentUrl,
  onUrl,
}: {
  documentUrl: string;
  url: string;
  onDocumentUrl: (value: string) => void;
  onUrl: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/ops/upload', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onDocumentUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AdminField label="Scope PDF" hint="PDF only, max 15 MB. Optional if a URL is provided.">
        <input
          type="file"
          accept="application/pdf,.pdf"
          className={adminInputClass}
          disabled={uploading}
          onChange={(e) => upload(e.target.files?.[0])}
        />
        {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
        {error && <p className="text-xs text-rose-700 mt-1">{error}</p>}
        {documentUrl && (
          <p className="text-xs mt-1">
            <a href={documentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
              View uploaded PDF
            </a>
            <button type="button" className="ml-2 text-rose-600" onClick={() => onDocumentUrl('')}>
              Remove
            </button>
          </p>
        )}
      </AdminField>
      <AdminField label="Scope document URL" hint="Use a URL instead of uploading a PDF.">
        <input className={adminInputClass} value={url} onChange={(e) => onUrl(e.target.value)} placeholder="https://…" />
      </AdminField>
    </div>
  );
}

export function ScheduleSummary({
  hours,
  developers,
  startDate,
  endDate,
}: {
  hours: number;
  developers: number;
  startDate: string;
  endDate: string;
}) {
  const capacity = developers * 8;
  const days = hours > 0 && developers >= 1 ? Math.ceil(hours / capacity) : 0;
  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm space-y-1">
      <p>Estimated effort: <strong>{hours || 0} hours</strong></p>
      <p>Team capacity: <strong>{capacity} hours/day</strong></p>
      <p>Estimated working days: <strong>{days} days</strong> (Mon–Fri, start date is day 1)</p>
      <p>Estimated delivery: <strong>{endDate || '—'}</strong>{startDate ? ` (from ${startDate})` : ''}</p>
    </div>
  );
}

export function WhatsAppModal({
  open,
  title,
  clientName,
  whatsapp,
  message,
  onMessage,
  onClose,
  onSend,
  sending,
  error,
  warning,
}: {
  open: boolean;
  title: string;
  clientName: string;
  whatsapp: string | null;
  message: string;
  onMessage: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  sending: boolean;
  error?: string;
  warning?: string | null;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4">
        <h3 className="font-bricolage text-lg font-semibold">{title}</h3>
        <p className="text-sm"><span className="text-muted-foreground">Client:</span> {clientName}</p>
        <p className="text-sm"><span className="text-muted-foreground">WhatsApp:</span> {whatsapp || 'Not set'}</p>
        <label className="block text-sm font-medium">
          Message preview
          <textarea className={`${adminInputClass} mt-1 min-h-[220px]`} value={message} onChange={(e) => onMessage(e.target.value)} />
        </label>
        {warning && <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">{warning}</p>}
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <AdminButton onClick={onClose}>Cancel</AdminButton>
          <AdminButton variant="primary" disabled={sending || !whatsapp || !message.trim()} onClick={onSend}>
            {sending ? 'Sending…' : 'Send WhatsApp'}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
