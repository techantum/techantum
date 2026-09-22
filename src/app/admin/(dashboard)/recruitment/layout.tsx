import SuperAdminGate from '@/components/admin/SuperAdminGate';

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  return <SuperAdminGate>{children}</SuperAdminGate>;
}
