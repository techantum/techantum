'use client';

import { useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminButton from '@/components/admin/AdminButton';
import { PmShell, Td, Th } from '@/components/admin/pm/ui';

const ENTITIES = ['project', 'asset', 'access', 'server', 'supplier', 'software', 'backup', 'incident', 'vulnerability', 'training', 'joiner_leaver', 'change', 'risk', 'corrective_action', 'control'];

export default function DocumentsPage() {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState('');
  const [entityType, setEntityType] = useState('project');
  const [entityId, setEntityId] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const load = () => fetch('/api/admin/pm/evidence').then((r) => r.json()).then((body) => setRows(body.rows || []));
  useEffect(() => { load(); }, []);

  const upload = async () => {
    if (!file) return;
    const data = new FormData();
    data.set('file', file);
    data.set('entityType', entityType);
    data.set('entityId', entityId);
    data.set('description', description);
    const res = await fetch('/api/admin/pm/evidence', { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) setError(body.error || 'Upload failed');
    else { setError(''); load(); }
  };

  return (
    <PmShell>
      <AdminPageHeader title="Documents / Evidence" description="Files stay in private storage. Downloads go through the application." />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <select className="rounded-xl border border-slate-200 px-3 py-2 text-sm" value={entityType} onChange={(e) => setEntityType(e.target.value)}>{ENTITIES.map((entity) => <option key={entity}>{entity}</option>)}</select>
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Record ID" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
        <input className="rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <AdminButton variant="primary" onClick={upload}>Upload</AdminButton>
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="min-w-full"><thead><tr><Th>Name</Th><Th>Type</Th><Th>Entity</Th><Th>Uploaded</Th><Th></Th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}><Td>{row.document_name}</Td><Td>{row.document_type}</Td><Td>{row.entity_type}</Td><Td>{String(row.uploaded_at).slice(0, 10)}</Td><Td><a className="text-secondary" href={`/api/admin/pm/evidence/file/${row.id}`}>Download</a></Td></tr>)}</tbody>
        </table>
      </div>
    </PmShell>
  );
}
