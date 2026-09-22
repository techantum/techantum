import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function PartnerRequirementsLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
