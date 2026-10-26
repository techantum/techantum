import { NextResponse } from 'next/server';
import { isSuperAdmin } from './roles';
import { getPlatformActor } from '@/lib/saas/session';

export async function requireAdmin() {
  const actor = await getPlatformActor();
  if (!actor || !isSuperAdmin(actor.role)) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { user: { id: actor.userId, email: actor.email }, role: actor.role, email: actor.email };
}

export async function requireSuperAdmin() {
  return requireAdmin();
}
