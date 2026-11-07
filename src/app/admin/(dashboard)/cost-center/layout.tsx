import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function CostCenterLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
