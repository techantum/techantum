'use client';

import { useEffect, useState, type ReactNode } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import { ProviderShell, ProviderTable, StatusPill, Td, when } from './ProviderUi';

type Row = Record<string, unknown> & { id: string };

export default function ResourcePage({
  title,
  description,
  endpoint,
  columns,
  render,
  searchHint,
  bare = false,
}: {
  title: string;
  description: string;
  endpoint: string;
  columns: string[];
  render: (row: Row) => ReactNode[];
  searchHint?: string;
  bare?: boolean;
}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`${endpoint}${endpoint.includes('?') ? '&' : '?'}q=${encodeURIComponent(q)}`)
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.error || 'Failed to load');
          setRows(body.rows || body.phones || body.conversations || []);
          setError('');
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [endpoint, q]);

  const body = (
    <div className="space-y-4">
      {bare && (
        <div>
          <h1 className="font-bricolage text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <AdminField label="Search">
          <input className={adminInputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchHint || 'Search'} />
        </AdminField>
        {error && !rows.length ? <p className="text-sm text-rose-700">{error}</p> : null}
        <ProviderTable
          columns={columns}
          loading={loading}
          empty="No records found."
          rows={rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              {render(row).map((cell, i) => (
                <Td key={`${row.id}-${i}`}>{cell}</Td>
              ))}
            </tr>
          ))}
        />
      </div>
    </div>
  );

  if (bare) return body;
  return (
    <ProviderShell>
      <AdminPageHeader title={title} description={description} />
      {body}
    </ProviderShell>
  );
}

export function cellStatus(value: unknown) {
  return <StatusPill value={String(value || '—')} />;
}

export function cellWhen(value: unknown) {
  return when(typeof value === 'string' ? value : null);
}
