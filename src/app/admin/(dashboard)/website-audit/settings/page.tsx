'use client';

import dynamic from 'next/dynamic';

const AuditSettingsScreen = dynamic(() => import('@/components/admin/website-audit/AuditSettingsScreen'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />,
});

export default function WebsiteAuditSettingsPage() {
  return <AuditSettingsScreen />;
}
