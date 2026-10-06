import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { firstAllowedPartnerHref, partnerHasNavAccess } from '@/lib/partner/nav';
import type { Partner, PartnerUser } from '@/lib/partner/types';

export default async function PartnerLeadDiscoveryLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/partner/login');

  const admin = createAdminClient();
  const { data: partnerUser } = await admin.from('partner_users').select('*').eq('user_id', user.id).maybeSingle();
  if (!partnerUser) redirect('/partner/login');

  const { data: partner } = await admin
    .from('partners')
    .select('*')
    .eq('id', partnerUser.partner_id)
    .maybeSingle();

  if (!partnerHasNavAccess(partnerUser as PartnerUser, 'lead-discovery', partner as Partner)) {
    redirect(firstAllowedPartnerHref(partnerUser as PartnerUser, partner as Partner));
  }

  return <>{children}</>;
}
