import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import YoutubeFrame from '@/components/admin/youtube/YoutubeFrame';
import { firstAllowedPartnerHref, partnerHasNavAccess } from '@/lib/partner/nav';
import { permissionsForRole } from '@/lib/youtube/permissions';
import type { Partner, PartnerUser } from '@/lib/partner/types';

export default async function PartnerYoutubeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/partner/login');

  const admin = createAdminClient();
  const { data: partnerUser } = await admin.from('partner_users').select('*').eq('user_id', user.id).maybeSingle();
  if (!partnerUser || partnerUser.status !== 'active') redirect('/partner/login');

  const { data: partner } = await admin.from('partners').select('*').eq('id', partnerUser.partner_id).maybeSingle();
  if (!partner || partner.status !== 'active') redirect('/partner/login');

  if (!partnerHasNavAccess(partnerUser as PartnerUser, 'youtube-research', partner as Partner)) {
    redirect(firstAllowedPartnerHref(partnerUser as PartnerUser, partner as Partner));
  }

  return <YoutubeFrame initialAccess={permissionsForRole(partnerUser.role, [])}>{children}</YoutubeFrame>;
}
