import { NextResponse } from 'next/server';
import { listNotifications } from '@/lib/saas/profile';
import { getPlatformActor } from '@/lib/saas/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getPlatformActor();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await listNotifications(actor.userId, actor.role);
  return NextResponse.json({ rows });
}
