import { NextResponse } from 'next/server';
import { isSuperAdmin } from '@/lib/admin/roles';
import { getPlatformActor } from '@/lib/saas/session';

export async function requireCmsAdmin() {
  const actor = await getPlatformActor();
  if (!actor || !isSuperAdmin(actor.role)) {
    return { error: NextResponse.json({ error: 'Super admin access required' }, { status: 403 }) };
  }
  return { actor };
}
