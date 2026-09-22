import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ClientPortalRole } from './types';
import { clientHasPermission, type WaPermission } from './permissions';

export async function requirePortalUser(permission?: WaPermission) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: membership } = await admin
    .from('wa_client_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (!membership) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  const role = membership.role as ClientPortalRole;
  if (permission && !clientHasPermission(role, permission)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user, role, clientId: membership.client_id as string, email: membership.email as string };
}
