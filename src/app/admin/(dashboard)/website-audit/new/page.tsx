'use client';

import dynamic from 'next/dynamic';
import { NewAuditSkeleton } from '@/components/admin/website-audit/NewAuditScreen';

const NewAuditScreen = dynamic(
  () => import('@/components/admin/website-audit/NewAuditScreen'),
  { ssr: false, loading: () => <NewAuditSkeleton /> }
);

export default function WebsiteAuditNewPage() {
  return <NewAuditScreen />;
}
