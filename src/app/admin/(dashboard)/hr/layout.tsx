import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
