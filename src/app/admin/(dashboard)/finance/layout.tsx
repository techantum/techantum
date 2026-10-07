import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
