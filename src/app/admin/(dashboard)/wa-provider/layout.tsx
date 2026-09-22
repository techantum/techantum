import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function WaProviderLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
