import type { Metadata } from 'next';
import SiteFooter from '@/components/common/SiteFooter';
import SiteHeader from '@/components/common/SiteHeader';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: 'Client Onboarding',
};

export default function RequirementsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="page-main bg-background">{children}</main>
      <SiteFooter />
    </>
  );
}
