import { createAdminClient } from '@/lib/supabase/admin';
import { rate, resolveDateRange } from '../date-range';
import type { DateRangeKey } from '../types';

export async function getProviderDashboard(range: DateRangeKey, from?: string, to?: string) {
  const { start, end } = resolveDateRange(range, from, to);
  const supabase = createAdminClient();

  const [
    { count: totalClients },
    { count: activeClients },
    { count: totalWabas },
    { count: activePhones },
    { data: messages },
    { data: templates },
    { data: phones },
    { data: alerts },
    { count: apiErrors },
    { count: webhookErrors },
    { data: daily },
  ] = await Promise.all([
    supabase.from('wa_clients').select('*', { count: 'exact', head: true }).neq('status', 'ARCHIVED'),
    supabase.from('wa_clients').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('wa_business_accounts').select('*', { count: 'exact', head: true }),
    supabase.from('wa_phone_numbers').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    supabase.from('wa_messages').select('id,client_id,status,template_id,created_at,direction').gte('created_at', start).lte('created_at', end),
    supabase.from('wa_templates').select('id,internal_status,name,client_id'),
    supabase.from('wa_phone_numbers').select('id,quality_rating,client_id,display_phone_number'),
    supabase.from('wa_alerts').select('*, wa_clients(name)').neq('status', 'RESOLVED').order('created_at', { ascending: false }).limit(25),
    supabase.from('wa_api_logs').select('*', { count: 'exact', head: true }).eq('status', 'FAILURE').gte('created_at', start),
    supabase.from('wa_webhook_events').select('*', { count: 'exact', head: true }).eq('processing_status', 'FAILED').gte('received_at', start),
    supabase.from('wa_daily_message_stats').select('*').gte('stat_date', start.slice(0, 10)).lte('stat_date', end.slice(0, 10)),
  ]);

  const rows = messages || [];
  const outbound = rows.filter((m) => m.direction !== 'INBOUND' || ['SENT', 'DELIVERED', 'READ', 'FAILED'].includes(m.status));
  const sent = outbound.filter((m) => ['SENT', 'DELIVERED', 'READ', 'FAILED', 'QUEUED'].includes(m.status)).length;
  const delivered = outbound.filter((m) => ['DELIVERED', 'READ'].includes(m.status)).length;
  const read = outbound.filter((m) => m.status === 'READ').length;
  const failed = outbound.filter((m) => m.status === 'FAILED').length;

  const { count: messagesToday } = await supabase
    .from('wa_messages')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', resolveDateRange('today').start);
  const monthStart = resolveDateRange('this_month').start;
  const { count: messagesMonth } = await supabase.from('wa_messages').select('*', { count: 'exact', head: true }).gte('created_at', monthStart);

  const templateStatus: Record<string, number> = {};
  for (const template of templates || []) {
    templateStatus[template.internal_status] = (templateStatus[template.internal_status] || 0) + 1;
  }

  const quality = { GREEN: 0, YELLOW: 0, RED: 0, UNKNOWN: 0 };
  for (const phone of phones || []) {
    const key = (phone.quality_rating || 'UNKNOWN').toUpperCase();
    if (key === 'GREEN') quality.GREEN += 1;
    else if (key === 'YELLOW') quality.YELLOW += 1;
    else if (key === 'RED') quality.RED += 1;
    else quality.UNKNOWN += 1;
  }

  const { data: clients } = await supabase.from('wa_clients').select('id,name');
  const clientNames = Object.fromEntries((clients || []).map((c) => [c.id, c.name]));
  const usageMap: Record<string, number> = {};
  for (const message of rows) {
    usageMap[message.client_id] = (usageMap[message.client_id] || 0) + 1;
  }
  const clientUsage = Object.entries(usageMap)
    .map(([id, count]) => ({ clientId: id, name: clientNames[id] || 'Unknown', messages: count }))
    .sort((a, b) => b.messages - a.messages)
    .slice(0, 10);

  const templateUsage: Record<string, { name: string; sent: number; delivered: number; read: number }> = {};
  for (const message of outbound) {
    if (!message.template_id) continue;
    const current = templateUsage[message.template_id] || { name: message.template_id, sent: 0, delivered: 0, read: 0 };
    current.sent += 1;
    if (['DELIVERED', 'READ'].includes(message.status)) current.delivered += 1;
    if (message.status === 'READ') current.read += 1;
    templateUsage[message.template_id] = current;
  }
  for (const template of templates || []) {
    if (templateUsage[template.id]) templateUsage[template.id].name = template.name;
  }

  return {
    cards: {
      totalClients: totalClients || 0,
      activeClients: activeClients || 0,
      totalWabas: totalWabas || 0,
      activePhones: activePhones || 0,
      messagesToday: messagesToday || 0,
      messagesMonth: messagesMonth || 0,
      templatesPending: (templateStatus.META_PENDING || 0) + (templateStatus.INTERNAL_REVIEW || 0),
      templatesRejected: templateStatus.META_REJECTED || 0,
      qualityWarnings: quality.YELLOW + quality.RED,
      apiWebhookErrors: (apiErrors || 0) + (webhookErrors || 0),
    },
    performance: {
      sent,
      delivered,
      read,
      failed,
      deliveryRate: rate(delivered, sent),
      readRate: rate(read, sent),
      failureRate: rate(failed, sent),
    },
    series: (daily || []).map((row) => ({
      date: row.stat_date,
      sent: row.sent,
      delivered: row.delivered,
      read: row.read,
      failed: row.failed,
    })),
    clientUsage,
    templatePerformance: Object.values(templateUsage)
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 8)
      .map((row) => ({ ...row, deliveryRate: rate(row.delivered, row.sent), readRate: rate(row.read, row.sent) })),
    quality,
    templateStatus,
    needsAttention: (alerts || []).map((alert) => ({
      id: alert.id,
      client: (alert.wa_clients as { name?: string } | null)?.name || 'Unassigned',
      clientId: alert.client_id,
      issue: alert.title,
      severity: alert.severity,
      since: alert.created_at,
      status: alert.status,
      type: alert.type,
      description: alert.description,
    })),
  };
}

export async function getAnalytics(params: { range: DateRangeKey; from?: string; to?: string; clientId?: string; groupBy?: string }) {
  const { start, end } = resolveDateRange(params.range, params.from, params.to);
  const supabase = createAdminClient();
  let query = supabase.from('wa_messages').select('id,client_id,waba_id,phone_number_id,template_id,campaign_id,status,type,created_at,direction').gte('created_at', start).lte('created_at', end);
  if (params.clientId) query = query.eq('client_id', params.clientId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = data || [];
  const sent = rows.filter((r) => r.direction !== 'INBOUND').length;
  const delivered = rows.filter((r) => ['DELIVERED', 'READ'].includes(r.status)).length;
  const read = rows.filter((r) => r.status === 'READ').length;
  const failed = rows.filter((r) => r.status === 'FAILED').length;
  const groupKey = params.groupBy || 'client_id';
  const groups: Record<string, { key: string; sent: number; delivered: number; read: number; failed: number }> = {};
  for (const row of rows) {
    const key = String((row as Record<string, unknown>)[groupKey] || 'unknown');
    const current = groups[key] || { key, sent: 0, delivered: 0, read: 0, failed: 0 };
    current.sent += 1;
    if (['DELIVERED', 'READ'].includes(row.status)) current.delivered += 1;
    if (row.status === 'READ') current.read += 1;
    if (row.status === 'FAILED') current.failed += 1;
    groups[key] = current;
  }
  return {
    overview: { total: rows.length, sent, delivered, read, failed, deliveryRate: rate(delivered, sent), readRate: rate(read, sent), failureRate: rate(failed, sent) },
    breakdown: Object.values(groups),
  };
}
