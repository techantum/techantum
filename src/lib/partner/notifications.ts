import { createAdminClient } from '@/lib/supabase/admin';

export type NotificationType =
  | 'status_change'
  | 'clarification'
  | 'proposal'
  | 'requirement_submitted'
  | 'general';

export interface PartnerNotification {
  id: string;
  partner_id: string;
  partner_user_id: string | null;
  requirement_id: string | null;
  notification_type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export async function createPartnerNotification(input: {
  partnerId: string;
  partnerUserId?: string | null;
  requirementId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from('partner_notifications').insert({
    partner_id: input.partnerId,
    partner_user_id: input.partnerUserId ?? null,
    requirement_id: input.requirementId ?? null,
    notification_type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
  });
}

export async function listPartnerNotifications(partnerId: string, partnerUserId: string, limit = 20) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('partner_notifications')
    .select('*')
    .eq('partner_id', partnerId)
    .or(`partner_user_id.is.null,partner_user_id.eq.${partnerUserId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as PartnerNotification[];
}

export async function countUnreadNotifications(partnerId: string, partnerUserId: string) {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from('partner_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', partnerId)
    .or(`partner_user_id.is.null,partner_user_id.eq.${partnerUserId}`)
    .is('read_at', null);

  return count ?? 0;
}

export async function markNotificationRead(id: string, partnerId: string) {
  const supabase = createAdminClient();
  await supabase
    .from('partner_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('partner_id', partnerId);
}

export async function markAllNotificationsRead(partnerId: string, partnerUserId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  await supabase
    .from('partner_notifications')
    .update({ read_at: now })
    .eq('partner_id', partnerId)
    .or(`partner_user_id.is.null,partner_user_id.eq.${partnerUserId}`)
    .is('read_at', null);
}
