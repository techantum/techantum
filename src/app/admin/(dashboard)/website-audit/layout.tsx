import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function WebsiteAuditLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminGate>
      <div className="relative min-h-[calc(100dvh-5.5rem)]">{children}</div>
    </SuperAdminGate>
  );
}
