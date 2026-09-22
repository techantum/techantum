import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function MetaAdsLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
