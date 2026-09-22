import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function PartnerCatalogLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
