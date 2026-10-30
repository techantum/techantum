import WebsiteAuditModule from '@/components/admin/website-audit/WebsiteAuditModule';

export default async function WebsiteAuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WebsiteAuditModule view="detail" auditId={id} />;
}
