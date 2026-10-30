'use client';

import dynamic from 'next/dynamic';

const AuditHistoryScreen = dynamic(() => import('@/components/admin/website-audit/AuditHistoryScreen'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />,
});

export default function WebsiteAuditHistoryPage() {
  return <AuditHistoryScreen />;
}
