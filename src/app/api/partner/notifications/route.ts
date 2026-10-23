import { NextResponse } from 'next/server';
import { requirePartner } from '@/lib/partner/auth';
import {
  countUnreadNotifications,
  listPartnerNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/partner/notifications';

export async function GET(request: Request) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const countOnly = new URL(request.url).searchParams.get('countOnly') === '1';
  if (countOnly) {
    const unreadCount = await countUnreadNotifications(auth.partner.id, auth.partnerUser.id);
    return NextResponse.json({ unreadCount });
  }

  const [notifications, unreadCount] = await Promise.all([
    listPartnerNotifications(auth.partner.id, auth.partnerUser.id),
    countUnreadNotifications(auth.partner.id, auth.partnerUser.id),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const auth = await requirePartner();
  if ('error' in auth) return auth.error;

  const body = await request.json();

  if (body.markAllRead) {
    await markAllNotificationsRead(auth.partner.id, auth.partnerUser.id);
  } else if (body.id) {
    await markNotificationRead(body.id, auth.partner.id);
  }

  const unreadCount = await countUnreadNotifications(auth.partner.id, auth.partnerUser.id);
  return NextResponse.json({ unreadCount });
}
