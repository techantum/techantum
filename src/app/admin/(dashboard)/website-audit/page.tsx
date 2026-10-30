'use client';

import dynamic from 'next/dynamic';

const AuditOverviewDashboard = dynamic(() => import('@/components/admin/website-audit/AuditOverviewDashboard'), {
  ssr: false,
  loading: () => <div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>,
});

export default function WebsiteAuditOverviewPage() {
  return <AuditOverviewDashboard />;
}
