import { redirect } from 'next/navigation';
import { requirePartner } from '@/lib/partner/auth';
import { firstAllowedPartnerHref } from '@/lib/partner/nav';

export default async function PartnerIndexPage() {
  const auth = await requirePartner();
  if ('error' in auth) redirect('/partner/login');
  redirect(firstAllowedPartnerHref(auth.partnerUser, auth.partner));
}
