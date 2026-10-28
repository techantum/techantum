import { redirect } from 'next/navigation';
import Shell from '@/components/Shell';
import { FEATURE_YOUTUBE, listFeatures, navigationFor, resolveAccess } from '@/lib/saas/catalog';
import { getPlatformActor } from '@/lib/saas/session';
import { getRevealeoSite } from '@/lib/cms/site';
import { isSuperAdmin } from '@/lib/admin/roles';
import { canUseHookooh } from '@/lib/hookooh/access';
import { displayCompanyName } from '@/lib/brand';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getPlatformActor();
  if (!actor) redirect('/login');
  const access = await resolveAccess(actor.account, actor.role);
  const catalog = await listFeatures(false).catch(() => []);
  const { branding } = await getRevealeoSite();
  return (
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
  );
}
