'use client';

import { useState } from 'react';
import AdminButton from '@/components/admin/AdminButton';
import Icon from '@/components/ui/AppIcon';

export default function DeleteInvoiceButton({
  id,
  invoiceNumber,
  onDeleted,
  label = 'Delete',
}: {
  id: string;
  invoiceNumber?: string | null;
  onDeleted: () => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const expected = String(invoiceNumber || 'DELETE');
  const matched = typed.trim() === expected;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
    setError('');
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/finance/invoices/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: typed.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" aria-label={label || 'Delete invoice'} onClick={() => setOpen(true)}>
        <Icon name="TrashIcon" size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="delete-invoice-title">
            <h2 id="delete-invoice-title" className="text-base font-semibold text-slate-900">
              Delete this invoice?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This permanently removes the invoice
              {invoiceNumber ? ` ${invoiceNumber}` : ''} and any payments recorded against it. This cannot be undone.
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Type {expected} to confirm
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium normal-case tracking-normal text-slate-900"
                value={typed}
                autoFocus
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && matched) remove();
                }}
              />
            </label>
            {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <AdminButton onClick={close} disabled={busy}>
                Cancel
              </AdminButton>
              <AdminButton variant="danger" disabled={!matched || busy} onClick={remove}>
                {busy ? 'Deleting…' : 'Delete invoice'}
              </AdminButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
