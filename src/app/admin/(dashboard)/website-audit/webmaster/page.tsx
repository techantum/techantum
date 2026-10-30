'use client';

import dynamic from 'next/dynamic';

const WebMasterAgentScreen = dynamic(() => import('@/components/admin/website-audit/WebMasterAgentScreen'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />,
});

export default function WebMasterAgentPage() {
  return <WebMasterAgentScreen />;
}
