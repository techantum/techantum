'use client';

import dynamic from 'next/dynamic';

const AuditReportsScreen = dynamic(() => import('@/components/admin/website-audit/AuditReportsScreen'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />,
});

export default function WebsiteAuditReportsPage() {
  return <AuditReportsScreen />;
}
