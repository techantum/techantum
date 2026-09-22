'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminSection from '@/components/admin/AdminSection';
import { ProviderShell, StatusPill } from '@/components/admin/wa-provider/ProviderUi';

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const [row, setRow] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/admin/wa-provider/templates?q=${params.id}`)
      .then((r) => r.json())
      .then((body) => setRow((body.rows || []).find((item: any) => item.id === params.id) || (body.rows || [])[0]));
  }, [params.id]);
  if (!row) return <ProviderShell><AdminPageHeader title="Template" /></ProviderShell>;
  return (
    <ProviderShell>
      <AdminPageHeader title={row.name} description="Internal status is Tech Provider review. Meta status comes only from Meta." />
      <AdminSection title="Statuses">
        <div className="flex gap-3">
          <StatusPill value={row.internal_status} />
          <StatusPill value={row.meta_status} />
        </div>
        <p className="text-sm text-slate-600 mt-3">{row.body}</p>
        {row.rejection_reason && <p className="text-sm text-rose-700 mt-2">{row.rejection_reason}</p>}
        <Link href="/admin/wa-provider/templates" className="text-indigo-700 text-sm hover:underline">Back to templates</Link>
      </AdminSection>
    </ProviderShell>
  );
}
