import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function WebsiteAuditLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
