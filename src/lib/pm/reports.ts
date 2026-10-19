import { buildWorkbook } from '@/lib/finance/excel';
import { projectDashboard, processDashboard } from './dashboard';
import { listOnboarding } from './onboarding';
import { listProjects } from './projects';
import { listRegister, REGISTERS } from './registers';
import { listTeam } from './team';
import { q } from '@/lib/finance/db';

function plain(rows: Record<string, unknown>[], columns: string[]) {
  return rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column] ?? ''])));
}

export async function exportPmReport(key: string) {
  if (key === 'projects' || key === 'ongoing' || key === 'delivered' || key === 'health' || key === 'support' || key === 'managers') {
    const listed = await listProjects({ pageSize: 500, category: key === 'ongoing' ? 'ongoing' : key === 'delivered' ? 'delivered' : undefined });
    const dash = key === 'managers' || key === 'health' ? await projectDashboard() : null;
    const rows = key === 'managers'
      ? dash?.managers || []
      : key === 'health'
        ? listed.rows.filter((row) => ['At Risk', 'Overdue', 'Watch', 'Update Pending'].includes(String(row.health)))
        : key === 'support'
          ? listed.rows.filter((row) => ['In Support', 'Support Ending Soon', 'Support Ended', 'Delivered'].includes(String(row.support_status)))
          : listed.rows;
    const columns = rows[0] ? Object.keys(rows[0]).filter((column) => typeof (rows[0] as Record<string, unknown>)[column] !== 'object') : ['project_code'];
    const buffer = await buildWorkbook([{ name: key, columns: columns.map((column) => ({ header: column, key: column, width: 18 })), rows: plain(rows as Record<string, unknown>[], columns) }]);
    return { filename: `pm-${key}.xlsx`, buffer };
  }
  if (key === 'daily') {
    const { rows } = await q(undefined, `SELECT p.project_code, d.update_date, d.rag, d.completion_percent, d.work_done, d.plan_today, d.team_hours, d.blockers, d.next_action, d.escalate FROM project_management_daily_updates d JOIN project_management_projects p ON p.id=d.project_id ORDER BY d.update_date DESC`);
    const columns = ['project_code', 'update_date', 'rag', 'completion_percent', 'work_done', 'plan_today', 'team_hours', 'blockers', 'next_action', 'escalate'];
    const buffer = await buildWorkbook([{ name: 'Daily Updates', columns: columns.map((column) => ({ header: column, key: column, width: 20 })), rows }]);
    return { filename: 'pm-daily-updates.xlsx', buffer };
  }
  if (key === 'onboarding') {
    const rows = await listOnboarding();
    const columns = ['project_code', 'project_name', 'client_name'];
    const buffer = await buildWorkbook([{ name: 'Onboarding', columns: [...columns, 'readiness'].map((column) => ({ header: column, key: column, width: 22 })), rows: rows.map((row) => ({ ...row, readiness: row.readiness?.status })) }]);
    return { filename: 'pm-onboarding.xlsx', buffer };
  }
  if (key === 'allocations' || key === 'capacity' || key === 'requirements' || key === 'tickets') {
    const { rows } = key === 'allocations'
      ? await q(undefined, `SELECT p.project_code, e.full_name, e.department, e.designation, r.name AS role_name, a.allocation_percent, a.status FROM project_management_allocations a JOIN project_management_projects p ON p.id=a.project_id JOIN finance_employees e ON e.id=a.employee_id LEFT JOIN project_management_roles r ON r.id=a.role_id ORDER BY p.project_code`)
      : key === 'capacity'
        ? await q(undefined, `SELECT e.full_name, e.department, e.designation, COALESCE(SUM(a.allocation_percent) FILTER (WHERE a.status='active'),0) AS total_percent FROM finance_employees e LEFT JOIN project_management_allocations a ON a.employee_id=e.id GROUP BY e.id ORDER BY e.full_name`)
        : key === 'requirements'
          ? await q(undefined, `SELECT requirement_code, p.project_code, r.module_name, r.title, r.category, r.priority, r.status, r.client_approval_status FROM project_management_requirements r JOIN project_management_projects p ON p.id=r.project_id ORDER BY p.project_code`)
          : await q(undefined, `SELECT ticket_code, p.project_code, t.title, t.ticket_type, t.priority, t.status, t.due_date, e.full_name AS assigned_to FROM project_management_tickets t JOIN project_management_projects p ON p.id=t.project_id LEFT JOIN finance_employees e ON e.id=t.assigned_employee_id ORDER BY t.created_at DESC`);
    const columns = rows[0] ? Object.keys(rows[0]) : ['empty'];
    const buffer = await buildWorkbook([{ name: key, columns: columns.map((column) => ({ header: column, key: column, width: 22 })), rows }]);
    return { filename: `pm-${key}.xlsx`, buffer };
  }
  if (key === 'team') {
    const rows = await listTeam();
    const columns = ['full_name', 'project_role', 'reports_to_name', 'hierarchy', 'ongoing_projects', 'active'];
    const buffer = await buildWorkbook([{ name: 'Team', columns: columns.map((column) => ({ header: column, key: column, width: 22 })), rows }]);
    return { filename: 'pm-team.xlsx', buffer };
  }
  if (key === 'process-health') {
    const data = await processDashboard();
    const rows = Object.entries(data.counts).map(([name, value]) => ({ name, value }));
    const buffer = await buildWorkbook([{ name: 'Process Health', columns: [{ header: 'name', key: 'name' }, { header: 'value', key: 'value' }], rows }]);
    return { filename: 'pm-process-health.xlsx', buffer };
  }
  const def = REGISTERS.find((item) => item.key === key);
  if (!def) {
    const data = await projectDashboard();
    const buffer = await buildWorkbook([{ name: 'Summary', columns: [{ header: 'metric', key: 'metric' }, { header: 'value', key: 'value' }], rows: Object.entries(data.portfolio).map(([metric, value]) => ({ metric, value })) }]);
    return { filename: 'pm-summary.xlsx', buffer };
  }
  const listed = await listRegister(key, {});
  const columns = ['code', ...def.fields.filter((field) => field.list).map((field) => field.key)];
  const buffer = await buildWorkbook([{ name: def.title.slice(0, 28), columns: columns.map((column) => ({ header: column, key: column, width: 20 })), rows: plain(listed.rows, columns) }]);
  return { filename: `pm-${key}.xlsx`, buffer };
}
