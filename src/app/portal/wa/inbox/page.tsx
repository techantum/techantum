'use client';

import { useEffect, useState } from 'react';

export default function PortalInboxPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/portal/wa/inbox').then((r) => r.json()).then((b) => setRows(b.conversations || []));
  }, []);
  return (
    <div>
      <h1 className="font-bricolage text-2xl font-bold mb-4">Inbox</h1>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border bg-white p-3">
            <p className="font-medium">{row.wa_contacts?.name || row.wa_contacts?.phone}</p>
            <p className="text-sm text-slate-500">{row.last_message_preview}</p>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-slate-500">No conversations yet.</p>}
      </div>
    </div>
  );
}
