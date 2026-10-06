import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function PartnerLeadDiscoveryLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/partner/login');

  const admin = createAdminClient();
  const { data: partnerUser } = await admin.from('partner_users').select('partner_id').eq('user_id', user.id).maybeSingle();
  if (!partnerUser) redirect('/partner/login');

  const { data: partner } = await admin
    .from('partners')
    .select('lead_discovery_enabled')
    .eq('id', partnerUser.partner_id)
    .maybeSingle();

  if (!partner?.lead_discovery_enabled) redirect('/partner/dashboard');

  return <>{children}</>;
}
