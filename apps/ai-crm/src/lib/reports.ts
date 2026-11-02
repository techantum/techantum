import { query } from './db';

async function sequential<T>(jobs: Array<() => Promise<T>>) {
  const out: T[] = [];
  for (const job of jobs) out.push(await job());
  return out;
}

export async function dashboardMetrics(workspaceId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Run sequentially to stay within Supabase session pooler limits.
  const [leads, bySource, byQual, byValidity, wa, calls, tasks, docs, activities, funnel] = await sequential([
    () =>
      query<{ total: string; neu: string; today: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE created_at >= $2)::text AS neu,
                COUNT(*) FILTER (WHERE created_at >= $3)::text AS today
         FROM crm.leads WHERE workspace_id=$1`,
        [workspaceId, since, startOfDay.toISOString()],
      ),
    () =>
      query(
        `SELECT source, COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE whatsapp_status='responded')::int AS responded,
                COUNT(*) FILTER (WHERE qualification_status IN ('hot','warm'))::int AS qualified
         FROM crm.leads WHERE workspace_id=$1 GROUP BY source ORDER BY count DESC`,
        [workspaceId],
      ),
    () =>
      query(
        `SELECT qualification_status, COUNT(*)::int AS count FROM crm.leads WHERE workspace_id=$1 GROUP BY qualification_status`,
        [workspaceId],
      ),
    () =>
      query(
        `SELECT validity_status, COUNT(*)::int AS count FROM crm.leads WHERE workspace_id=$1 GROUP BY validity_status`,
        [workspaceId],
      ),
    () =>
      query<{ sent: string; responded: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE whatsapp_status IN ('template_sent','responded'))::text AS sent,
           COUNT(*) FILTER (WHERE whatsapp_status='responded')::text AS responded
         FROM crm.leads WHERE workspace_id=$1`,
        [workspaceId],
      ),
    () =>
      query<{ scheduled: string; active: string; completed: string; failed: string; transferred: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('scheduled','queued'))::text AS scheduled,
           COUNT(*) FILTER (WHERE status IN ('dialing','ringing','connected'))::text AS active,
           COUNT(*) FILTER (WHERE status='completed')::text AS completed,
           COUNT(*) FILTER (WHERE status='failed')::text AS failed,
           COUNT(*) FILTER (WHERE status='transferred')::text AS transferred
         FROM crm.voice_calls WHERE workspace_id=$1`,
        [workspaceId],
      ),
    () =>
      query<{ open: string; overdue: string; due_today: string; completed: string }>(
        `SELECT
           COUNT(*) FILTER (WHERE status='open')::text AS open,
           COUNT(*) FILTER (WHERE status='open' AND due_at < NOW())::text AS overdue,
           COUNT(*) FILTER (WHERE status='open' AND due_at::date = CURRENT_DATE)::text AS due_today,
           COUNT(*) FILTER (WHERE status='done')::text AS completed
         FROM crm.tasks WHERE workspace_id=$1`,
        [workspaceId],
      ),
    () =>
      query(`SELECT status, COUNT(*)::int AS count FROM crm.documents WHERE workspace_id=$1 GROUP BY status`, [
        workspaceId,
      ]),
    () =>
      query(
        `SELECT a.*, l.full_name AS lead_name
         FROM crm.lead_activities a
         LEFT JOIN crm.leads l ON l.id=a.lead_id
         WHERE a.workspace_id=$1
         ORDER BY a.created_at DESC LIMIT 12`,
        [workspaceId],
      ),
    () =>
      query<{
        total: string;
        responded: string;
        qualified: string;
        called: string;
        converted: string;
      }>(
        `SELECT
           COUNT(*)::text AS total,
           COUNT(*) FILTER (WHERE whatsapp_status='responded')::text AS responded,
           COUNT(*) FILTER (WHERE qualification_status IN ('hot','warm'))::text AS qualified,
           COUNT(*) FILTER (WHERE ai_calling_status='completed')::text AS called,
           COUNT(*) FILTER (WHERE ps.is_won=true)::text AS converted
         FROM crm.leads l
         LEFT JOIN crm.pipeline_stages ps ON ps.id=l.pipeline_stage_id
         WHERE l.workspace_id=$1`,
        [workspaceId],
      ),
  ]);

  const total = Number(leads.rows[0]?.total || 0);
  const won = Number(funnel.rows[0]?.converted || 0);
  const responded = Number(wa.rows[0]?.responded || 0);
  const sent = Number(wa.rows[0]?.sent || 0);
  const qualified = Number(funnel.rows[0]?.qualified || 0);
  const called = Number(funnel.rows[0]?.called || 0);

  const qualMap = Object.fromEntries(byQual.rows.map((r: any) => [r.qualification_status, r.count]));
  const validityMap = Object.fromEntries(byValidity.rows.map((r: any) => [r.validity_status, r.count]));

  return {
    totalLeads: total,
    newLeads: Number(leads.rows[0]?.neu || 0),
    newToday: Number(leads.rows[0]?.today || 0),
    leadsBySource: bySource.rows,
    qualification: byQual.rows,
    validity: byValidity.rows,
    hotLeads: Number(qualMap.hot || 0),
    warmLeads: Number(qualMap.warm || 0),
    coldLeads: Number(qualMap.cold || 0),
    validLeads: Number(validityMap.valid || 0),
    needsReview: Number(validityMap.needs_review || 0),
    invalidLeads: Number(validityMap.invalid || 0),
    whatsappSent: sent,
    whatsappResponded: responded,
    whatsappResponseRate: sent ? Math.round((responded / sent) * 1000) / 10 : 0,
    aiQualified: qualified,
    callsScheduled: Number(calls.rows[0]?.scheduled || 0),
    callsActive: Number(calls.rows[0]?.active || 0),
    callsCompleted: Number(calls.rows[0]?.completed || 0),
    callsFailed: Number(calls.rows[0]?.failed || 0),
    callsTransferred: Number(calls.rows[0]?.transferred || 0),
    conversionRate: total ? Math.round((won / total) * 1000) / 10 : 0,
    conversions: won,
    openTasks: Number(tasks.rows[0]?.open || 0),
    overdueTasks: Number(tasks.rows[0]?.overdue || 0),
    dueTodayTasks: Number(tasks.rows[0]?.due_today || 0),
    completedTasks: Number(tasks.rows[0]?.completed || 0),
    documents: docs.rows,
    activities: activities.rows,
    funnel: {
      total,
      delivered: sent,
      responded,
      qualified,
      called,
      converted: won,
    },
    rangeDays: days,
  };
}
