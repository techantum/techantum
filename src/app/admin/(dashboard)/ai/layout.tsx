import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
