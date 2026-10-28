import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import TrialGuard from '@/components/TrialGuard';
import { FEATURE_YOUTUBE, listFeatures, navigationFor, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';
import { getRevealeoSite } from '@/lib/cms/site';
import { isSuperAdmin } from '@/lib/admin/roles';
import { canUseHookooh } from '@/lib/hookooh/access';
import { displayCompanyName } from '@/lib/brand';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const [access, catalog, site] = await Promise.all([
    resolveAccess(actor.account, actor.role),
    listFeatures(false).catch(() => []),
    getRevealeoSite(),
  ]);
  const { branding } = site;
  const pending = Boolean(actor.account && actor.account.status === 'pending_autopay' && !isSuperAdmin(actor.role));
  return (
    <>
    <TrialGuard pending={pending} packageId={actor.account?.pending_package_id} />
    <Shell
      name={actor.name}
      email={actor.email}
      plan={access.package?.name || (access.active ? 'Platform' : 'Inactive')}
      role={actor.role}
      avatarUrl={actor.avatarUrl}
      logoUrl={branding.logo_url}
      companyName={displayCompanyName(branding.company_name)}
      nav={navigationFor(actor.role, access, catalog)}
      hookooh={canUseHookooh(actor.role) && (isSuperAdmin(actor.role) || access.has(FEATURE_YOUTUBE))}
    >
      {children}
    </Shell>
    </>
  );
}
