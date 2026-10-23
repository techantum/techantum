import { redirect } from 'next/navigation';
import { getPartnerSession } from '@/lib/partner/auth';
import { firstAllowedPartnerHref, partnerHasNavAccess } from '@/lib/partner/nav';

export default async function PartnerLeadDiscoveryLayout({ children }: { children: React.ReactNode }) {
  const session = await getPartnerSession();
  if (!session) redirect('/partner/login');

  if (!partnerHasNavAccess(session.partnerUser, 'lead-discovery', session.partner)) {
    redirect(firstAllowedPartnerHref(session.partnerUser, session.partner));
  }

  return <>{children}</>;
}
