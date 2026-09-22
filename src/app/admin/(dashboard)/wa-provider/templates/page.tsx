'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import AdminTabs from '@/components/admin/AdminTabs';
import AdminButton from '@/components/admin/AdminButton';
import AdminField, { adminInputClass } from '@/components/admin/AdminField';
import { ProviderLink, ProviderShell, ProviderTable, StatusPill, Td, when } from '@/components/admin/wa-provider/ProviderUi';

const TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'INTERNAL_REVIEW', label: 'Internal Review' },
  { id: 'READY', label: 'Ready for Meta' },
  { id: 'PENDING', label: 'Pending Meta' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'FLAGGED', label: 'Flagged' },
  { id: 'DISABLED', label: 'Disabled' },
];

export default function TemplatesPage() {
  const [tab, setTab] = useState('ALL');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  const load = () => {
    fetch(`/api/admin/wa-provider/templates?tab=${tab}&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((body) => setRows(body.rows || []));
  };
  useEffect(load, [tab, q]);

  const review = async (id: string, decision: string) => {
    await fetch(`/api/admin/wa-provider/templates/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, comments: 'Internal Tech Provider review' }),
    });
    load();
  };
  const submit = async (id: string) => {
    await fetch(`/api/admin/wa-provider/templates/${id}/submit`, { method: 'POST' });
    load();
  };

  return (
    <ProviderShell>
      <AdminPageHeader
        title="Templates"
        description="Internal approval is Tech Provider approval only. Meta approval is a separate status."
        action={
          <div className="flex gap-2">
            <Link href="/admin/wa-provider/templates/library">
              <AdminButton>Library</AdminButton>
            </Link>
            <Link href="/admin/wa-provider/templates/new">
              <AdminButton variant="primary">Create template</AdminButton>
            </Link>
          </div>
        }
      />
      <AdminTabs tabs={TABS} active={tab} onChange={setTab} />
      <AdminSection title="Message templates">
        <AdminField label="Search">
          <input className={adminInputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Template name or body" />
        </AdminField>
        <ProviderTable
          columns={['Name', 'Client', 'Category', 'Language', 'Internal', 'Meta', 'Updated', 'Actions']}
          rows={rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <Td>
                <ProviderLink href={`/admin/wa-provider/templates/${row.id}`}>{row.name}</ProviderLink>
              </Td>
              <Td>{row.wa_clients?.name || '—'}</Td>
              <Td>{row.category}</Td>
              <Td>{row.language}</Td>
              <Td>
                <StatusPill value={row.internal_status} />
              </Td>
              <Td>
                <StatusPill value={row.meta_status} />
              </Td>
              <Td>{when(row.updated_at)}</Td>
              <Td>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button type="button" className="text-indigo-700 hover:underline" onClick={() => review(row.id, 'INTERNAL_REVIEW')}>
                    Internal review
                  </button>
                  <button type="button" className="text-indigo-700 hover:underline" onClick={() => review(row.id, 'INTERNAL_APPROVED')}>
                    Approve internally
                  </button>
                  <button type="button" className="text-indigo-700 hover:underline" onClick={() => submit(row.id)}>
                    Submit to Meta
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        />
      </AdminSection>
    </ProviderShell>
  );
}
