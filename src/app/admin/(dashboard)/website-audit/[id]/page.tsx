'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const AuditDetailScreen = dynamic(() => import('@/components/admin/website-audit/AuditDetailScreen'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />,
});

export default function WebsiteAuditDetailPage() {
  const params = useParams<{ id: string }>();
  return <AuditDetailScreen auditId={String(params.id || '')} />;
}
