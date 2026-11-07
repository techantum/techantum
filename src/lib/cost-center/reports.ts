import { q } from '@/lib/finance/db';
import { buildWorkbook } from '@/lib/finance/excel';
import { listOperationalCosts, monthlyOperationalTotal, overheadSnapshot } from './operational';
import { listRoleRates } from './rates';

export type CostCenterReportType =
  | 'project_cost'
  | 'resource_cost'
  | 'role_cost'
  | 'operational_cost'
  | 'profitability';

export async function buildCostCenterReport(type: CostCenterReportType) {
  if (type === 'project_cost' || type === 'profitability') {
    const { rows } = await q(
      undefined,
      `SELECT e.estimate_code, e.estimate_name, c.name AS client_name, p.project_name, p.project_code,
              e.project_type, e.complexity, e.status,
              e.modules_count, e.screens_count, e.apis_count,
              e.system_estimated_hours, e.adjusted_hours, e.final_approved_hours,
              e.resource_cost, e.project_operational_cost, e.additional_cost, e.total_internal_cost,
              e.proposed_client_price, e.expected_profit, e.profit_margin_pct, e.updated_at
       FROM cost_center_estimates e
       LEFT JOIN ops_clients c ON c.id = e.client_id
       LEFT JOIN project_management_projects p ON p.id = e.project_id
       WHERE e.status <> 'archived'
       ORDER BY e.updated_at DESC`
    );
    return {
      type,
      title: type === 'profitability' ? 'Profitability Report' : 'Project Cost Report',
      rows,
      columns: [
        { header: 'Code', key: 'estimate_code', width: 12 },
        { header: 'Estimate', key: 'estimate_name', width: 28 },
        { header: 'Client', key: 'client_name', width: 22 },
        { header: 'Project', key: 'project_name', width: 22 },
        { header: 'Hours', key: 'final_approved_hours', width: 12 },
        { header: 'Resource Cost', key: 'resource_cost', width: 14 },
        { header: 'Ops Cost', key: 'project_operational_cost', width: 14 },
        { header: 'Total Cost', key: 'total_internal_cost', width: 14 },
        { header: 'Client Price', key: 'proposed_client_price', width: 14 },
        { header: 'Profit', key: 'expected_profit', width: 12 },
        { header: 'Margin %', key: 'profit_margin_pct', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
      ],
    };
  }

  if (type === 'resource_cost') {
    const { rows } = await q(
      undefined,
      `SELECT e.estimate_code, e.estimate_name, c.name AS client_name,
              r.role_label, emp.full_name AS employee_name, r.designation,
              r.hourly_cost, r.planned_hours, r.allocation_pct, r.total_resource_cost, e.status
       FROM cost_center_estimate_resources r
       JOIN cost_center_estimates e ON e.id = r.estimate_id
       LEFT JOIN ops_clients c ON c.id = e.client_id
       LEFT JOIN finance_employees emp ON emp.id = r.employee_id
       WHERE e.status <> 'archived'
       ORDER BY e.estimate_code, r.sort_order`
    );
    return {
      type,
      title: 'Resource Cost Report',
      rows,
      columns: [
        { header: 'Estimate', key: 'estimate_code', width: 12 },
        { header: 'Name', key: 'estimate_name', width: 24 },
        { header: 'Client', key: 'client_name', width: 20 },
        { header: 'Role', key: 'role_label', width: 16 },
        { header: 'Employee', key: 'employee_name', width: 20 },
        { header: 'Hourly', key: 'hourly_cost', width: 12 },
        { header: 'Hours', key: 'planned_hours', width: 10 },
        { header: 'Alloc %', key: 'allocation_pct', width: 10 },
        { header: 'Cost', key: 'total_resource_cost', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
      ],
    };
  }

  if (type === 'role_cost') {
    const rates = await listRoleRates(false);
    const { rows: usage } = await q(
      undefined,
      `SELECT r.role_key, r.role_label,
              COUNT(*)::int AS assignments,
              COALESCE(SUM(r.planned_hours),0) AS total_hours,
              COALESCE(SUM(r.total_resource_cost),0) AS total_cost,
              COALESCE(AVG(r.hourly_cost),0) AS avg_hourly
       FROM cost_center_estimate_resources r
       JOIN cost_center_estimates e ON e.id = r.estimate_id
       WHERE e.status <> 'archived'
       GROUP BY r.role_key, r.role_label
       ORDER BY total_cost DESC`
    );
    const byKey = new Map(usage.map((u) => [u.role_key, u]));
    const rows = rates.map((rate) => {
      const u = byKey.get(rate.role_key);
      return {
        role_key: rate.role_key,
        role_label: rate.role_label,
        default_hourly: rate.hourly_cost,
        active: rate.active,
        assignments: u?.assignments || 0,
        total_hours: u?.total_hours || 0,
        total_cost: u?.total_cost || 0,
        avg_hourly: u?.avg_hourly || rate.hourly_cost,
      };
    });
    return {
      type,
      title: 'Role Cost Report',
      rows,
      columns: [
        { header: 'Role', key: 'role_label', width: 20 },
        { header: 'Default Hourly', key: 'default_hourly', width: 14 },
        { header: 'Assignments', key: 'assignments', width: 12 },
        { header: 'Total Hours', key: 'total_hours', width: 12 },
        { header: 'Avg Hourly Used', key: 'avg_hourly', width: 14 },
        { header: 'Total Cost', key: 'total_cost', width: 14 },
        { header: 'Active', key: 'active', width: 10 },
      ],
    };
  }

  const costs = await listOperationalCosts(false);
  const overhead = await overheadSnapshot();
  const monthly = await monthlyOperationalTotal(true);
  return {
    type,
    title: 'Operational Cost Report',
    meta: {
      monthly_operational_cost: monthly,
      productive_hours_per_month: overhead.productive_hours_per_month,
      operational_cost_per_hour: overhead.operational_cost_per_hour,
      formula: overhead.formula,
    },
    rows: costs,
    columns: [
      { header: 'Cost Name', key: 'cost_name', width: 24 },
      { header: 'Category', key: 'category', width: 16 },
      { header: 'Monthly Amount', key: 'monthly_amount', width: 16 },
      { header: 'Active', key: 'active', width: 10 },
      { header: 'Notes', key: 'notes', width: 28 },
    ],
  };
}

export async function exportCostCenterReport(type: CostCenterReportType) {
  const report = await buildCostCenterReport(type);
  const buffer = await buildWorkbook([
    {
      name: report.title.slice(0, 31),
      columns: report.columns,
      rows: report.rows as Record<string, unknown>[],
    },
  ]);
  return { buffer, filename: `cost-center-${type}-${new Date().toISOString().slice(0, 10)}.xlsx`, report };
}
