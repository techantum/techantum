import { q } from '@/lib/finance/db';
import { monthlyOperationalTotal } from './operational';

export async function costCenterDashboard() {
  const [summary, recent, byStatus, monthlyOps] = await Promise.all([
    q<{
      total_estimates: string;
      draft_estimates: string;
      approved_estimates: string;
      estimated_count: string;
      avg_project_cost: string;
      total_resource_cost: string;
      total_operational_cost: string;
      avg_margin: string;
    }>(
      undefined,
      `SELECT
         COUNT(*)::text AS total_estimates,
         COUNT(*) FILTER (WHERE status = 'draft')::text AS draft_estimates,
         COUNT(*) FILTER (WHERE status = 'approved')::text AS approved_estimates,
         COUNT(*) FILTER (WHERE status = 'estimated')::text AS estimated_count,
         COALESCE(AVG(total_internal_cost) FILTER (WHERE status <> 'archived'), 0)::text AS avg_project_cost,
         COALESCE(SUM(resource_cost) FILTER (WHERE status <> 'archived'), 0)::text AS total_resource_cost,
         COALESCE(SUM(project_operational_cost) FILTER (WHERE status <> 'archived'), 0)::text AS total_operational_cost,
         COALESCE(AVG(profit_margin_pct) FILTER (WHERE profit_margin_pct IS NOT NULL AND status <> 'archived'), 0)::text AS avg_margin
       FROM cost_center_estimates`
    ),
    q(
      undefined,
      `SELECT e.id, e.estimate_code, e.estimate_name, e.status,
              e.final_approved_hours, e.resource_cost, e.project_operational_cost,
              e.total_internal_cost, e.proposed_client_price, e.profit_margin_pct, e.expected_profit,
              e.updated_at, c.name AS client_name, p.project_name, p.project_code
       FROM cost_center_estimates e
       LEFT JOIN ops_clients c ON c.id = e.client_id
       LEFT JOIN project_management_projects p ON p.id = e.project_id
       WHERE e.status <> 'archived'
       ORDER BY e.updated_at DESC
       LIMIT 12`
    ),
    q(
      undefined,
      `SELECT status, COUNT(*)::int AS count
       FROM cost_center_estimates
       GROUP BY status
       ORDER BY status`
    ),
    monthlyOperationalTotal(true),
  ]);

  const s = summary.rows[0];

  return {
    totals: {
      total_estimates: Number(s?.total_estimates || 0),
      draft_estimates: Number(s?.draft_estimates || 0),
      approved_estimates: Number(s?.approved_estimates || 0),
      estimated_count: Number(s?.estimated_count || 0),
      average_project_cost: Number(s?.avg_project_cost || 0),
      resource_cost: Number(s?.total_resource_cost || 0),
      operational_cost: Number(s?.total_operational_cost || 0),
      estimated_margin: Number(s?.avg_margin || 0),
      monthly_operational_cost: monthlyOps,
    },
    recent: recent.rows,
    by_status: byStatus.rows,
  };
}
