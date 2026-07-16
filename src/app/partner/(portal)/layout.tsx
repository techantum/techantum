import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import PartnerShell from '@/components/partner/PartnerShell';
import { isOtpVerificationRequired } from '@/lib/partner/otp';
import type { Partner, PartnerUser } from '@/lib/partner/types';

export default async function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/partner/login');
  }

  const adminSupabase = createAdminClient();
  const { data: partnerUser } = await adminSupabase
    .from('partner_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!partnerUser || partnerUser.status !== 'active') {
    redirect('/partner/login');
  }

  const { data: partner } = await adminSupabase
    .from('partners')
    .select('*')
    .eq('id', partnerUser.partner_id)
    .maybeSingle();

  if (!partner || partner.status !== 'active') {
    redirect('/partner/login');
  }

  if (await isOtpVerificationRequired(partnerUser.id)) {
    redirect('/partner/verify-otp');
  }

  return (
    <PartnerShell partner={partner as Partner} partnerUser={partnerUser as PartnerUser}>
      {children}
    </PartnerShell>
  );
}
