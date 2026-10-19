import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function ProjectManagementLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
