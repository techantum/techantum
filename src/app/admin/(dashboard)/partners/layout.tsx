import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
