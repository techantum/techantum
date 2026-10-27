import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import { SHELL } from './layout';
import { getRevealeoSite } from '@/lib/cms/site';

export default async function AuthShell({ children }: { children: React.ReactNode }) {
  const { branding } = await getRevealeoSite();
  return (
    <div className="relative min-h-screen bg-white">
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-[28rem] rounded-full bg-[#E9D5FF]/70 blur-3xl" />
      <SiteHeader solid branding={branding} />
      <div className={`relative ${SHELL} flex justify-center py-16`}>{children}</div>
      <SiteFooter branding={branding} />
    </div>
  );
}
