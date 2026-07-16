import { NextResponse } from 'next/server';
import { requirePartner, logPartnerActivity } from '@/lib/partner/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PartnerDashboardStats } from '@/lib/partner/types';

export async function GET() {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const supabase = createAdminClient();
  const partnerId = auth.partner.id;

  const { data: requirements } = await supabase
    .from('partner_requirements')
    .select('status')
    .eq('partner_id', partnerId);

  const rows = requirements ?? [];
  const stats: PartnerDashboardStats = {
    total: rows.length,
    draft: rows.filter((r) => r.status === 'draft').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    under_review: rows.filter((r) => r.status === 'under_review').length,
    approved: rows.filter((r) => r.status === 'approved' || r.status === 'won').length,
    converted: rows.filter((r) => r.status === 'won').length,
  };

  const { data: recentRequirements } = await supabase
    .from('partner_requirements')
    .select('id, reference_id, project_name, status, budget_range, timeline, updated_at, partner_packages(name)')
    .eq('partner_id', partnerId)
    .order('updated_at', { ascending: false })
    .limit(10);

  const { data: activities } = await supabase
    .from('partner_activity_logs')
    .select('id, action, metadata, created_at')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(8);

  await logPartnerActivity(partnerId, 'dashboard_viewed', {
    partnerUserId: auth.partnerUser.id,
  });

  return NextResponse.json({
    partner: auth.partner,
    partnerUser: auth.partnerUser,
    stats,
    recentRequirements: recentRequirements ?? [],
    activities: activities ?? [],
  });
}
