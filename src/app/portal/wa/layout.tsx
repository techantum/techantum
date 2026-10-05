import SiteHeader from '@/components/common/SiteHeader';
import SiteFooter from '@/components/common/SiteFooter';
import PortalWorkspace from '@/components/whatsapp/PortalWorkspace';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 pt-16">
        <PortalWorkspace>{children}</PortalWorkspace>
      </main>
      <SiteFooter />
    </>
  );
}
