import { NextResponse } from 'next/server';
import { requirePartnerNav, logPartnerActivity } from '@/lib/partner/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PartnerDashboardStats } from '@/lib/partner/types';

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function inThisMonth(value: string | null | undefined, now: Date) {
  if (!value) return false;
  const created = new Date(value);
  return created >= startOfMonth(now);
}

export async function GET() {
  const auth = await requirePartnerNav('dashboard');
  if ('error' in auth) return auth.error;

  const supabase = createAdminClient();
  const partnerId = auth.partner.id;
  const now = new Date();

  const [statusResult, recentResult, activityResult] = await Promise.all([
    supabase.from('partner_requirements').select('status, created_at').eq('partner_id', partnerId),
    supabase
      .from('partner_requirements')
      .select('id, reference_id, project_name, status, updated_at, partner_packages(name)')
      .eq('partner_id', partnerId)
      .order('updated_at', { ascending: false })
      .limit(8),
    supabase
      .from('partner_activity_logs')
      .select('id, action, metadata, created_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const rows = statusResult.data ?? [];
  const thisMonthRows = rows.filter((row) => inThisMonth(row.created_at, now));
  const stats: PartnerDashboardStats = {
    total: rows.length,
    draft: rows.filter((r) => r.status === 'draft').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    under_review: rows.filter((r) => r.status === 'under_review').length,
    approved: rows.filter((r) => r.status === 'approved' || r.status === 'won').length,
    converted: rows.filter((r) => r.status === 'won').length,
    thisMonth: {
      total: thisMonthRows.length,
      draft: thisMonthRows.filter((r) => r.status === 'draft').length,
      submitted: thisMonthRows.filter((r) => r.status === 'submitted').length,
      under_review: thisMonthRows.filter((r) => r.status === 'under_review').length,
      approved: thisMonthRows.filter((r) => r.status === 'approved' || r.status === 'won').length,
      converted: thisMonthRows.filter((r) => r.status === 'won').length,
    },
  };

  logPartnerActivity(partnerId, 'dashboard_viewed', {
    partnerUserId: auth.partnerUser.id,
  });

  return NextResponse.json({
    partner: auth.partner,
    partnerUser: auth.partnerUser,
    stats,
    recentRequirements: recentResult.data ?? [],
    activities: activityResult.data ?? [],
  });
}
