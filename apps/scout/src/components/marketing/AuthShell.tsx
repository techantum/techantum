import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';
import { SHELL } from './layout';
import { getRevealeoSite } from '@/lib/cms/site';
import { websiteSession } from '@/lib/saas/website-session';

export default async function AuthShell({ children }: { children: React.ReactNode }) {
  const [{ branding }, session] = await Promise.all([getRevealeoSite(), websiteSession()]);
  return (
    <div className="relative min-h-screen bg-white">
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-[28rem] rounded-full bg-[#E9D5FF]/70 blur-3xl" />
      <SiteHeader
        solid
        branding={branding}
        signedIn={session.signedIn}
        userName={session.userName}
        userEmail={session.userEmail}
        avatarUrl={session.avatarUrl}
        canOpenWorkspace={session.canOpenWorkspace}
      />
      <div className={`relative ${SHELL} flex justify-center py-16`}>{children}</div>
      <SiteFooter branding={branding} />
    </div>
  );
}
