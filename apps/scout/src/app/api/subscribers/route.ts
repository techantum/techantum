import { NextResponse } from 'next/server';
import { isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';
import { listSubscribers } from '@/lib/saas/team';

export async function GET() {
  const actor = await getPlatformActor();
  if (!actor || !isSuperAdmin(actor.role)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }
  return NextResponse.json({ rows: await listSubscribers() });
}
