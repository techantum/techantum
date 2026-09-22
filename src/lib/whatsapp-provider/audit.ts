import { createAdminClient } from '@/lib/supabase/admin';

export async function writeAuditLog(entry: {
  clientId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const supabase = createAdminClient();
  await supabase.from('wa_audit_logs').insert({
    client_id: entry.clientId || null,
    actor_user_id: entry.actorUserId || null,
    action: entry.action,
    resource_type: entry.resourceType || null,
    resource_id: entry.resourceId || null,
    old_values: entry.oldValues || null,
    new_values: entry.newValues || null,
    ip_address: entry.ip || null,
    user_agent: entry.userAgent || null,
  });
}

export async function createAlert(entry: {
  clientId?: string | null;
  resourceType?: string;
  resourceId?: string;
  type: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFORMATION';
  title: string;
  description?: string;
}) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('wa_alerts')
    .select('id')
    .eq('type', entry.type)
    .eq('status', 'OPEN')
    .eq('client_id', entry.clientId || null)
    .eq('resource_id', entry.resourceId || null)
    .maybeSingle();
  if (data?.id) return data.id as string;
  const inserted = await supabase
    .from('wa_alerts')
    .insert({
      client_id: entry.clientId || null,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId || null,
      type: entry.type,
      severity: entry.severity,
      title: entry.title,
      description: entry.description || null,
      status: 'OPEN',
    })
    .select('id')
    .single();
  return inserted.data?.id as string | undefined;
}

export async function notify(entry: { clientId?: string | null; type: string; title: string; body?: string; userId?: string }) {
  const supabase = createAdminClient();
  await supabase.from('wa_notifications').insert({
    client_id: entry.clientId || null,
    audience: 'PROVIDER',
    user_id: entry.userId || null,
    type: entry.type,
    title: entry.title,
    body: entry.body || null,
  });
}
