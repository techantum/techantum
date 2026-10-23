import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import PartnerShell from '@/components/partner/PartnerShell';
import { isOtpStale } from '@/lib/partner/otp';
import { getPartnerSession } from '@/lib/partner/auth';
import {
  firstAllowedPartnerHref,
  isPartnerPathAlwaysAllowed,
  partnerHasNavAccess,
  partnerNavKeyForPath,
} from '@/lib/partner/nav';
import type { Partner, PartnerUser } from '@/lib/partner/types';

export default async function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPartnerSession();
  if (!session) {
    redirect('/partner/login');
  }

  const { partner, partnerUser } = session;

  if (isOtpStale(partnerUser.last_otp_verified_at)) {
    redirect('/partner/verify-otp');
  }

  const headerStore = await headers();
  const pathname = headerStore.get('x-url-path') || headerStore.get('x-pathname') || '';
  if (pathname && !isPartnerPathAlwaysAllowed(pathname)) {
    const navKey = partnerNavKeyForPath(pathname);
    if (navKey && !partnerHasNavAccess(partnerUser as PartnerUser, navKey, partner as Partner)) {
      redirect(firstAllowedPartnerHref(partnerUser as PartnerUser, partner as Partner));
    }
  }

  return (
    <PartnerShell partner={partner as Partner} partnerUser={partnerUser as PartnerUser}>
      {children}
    </PartnerShell>
  );
}
