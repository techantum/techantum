import { q } from '@/lib/finance/db';
import { listRoleRates } from './rates';
import { getSettings } from './settings';
import { overheadSnapshot } from './operational';

export async function costCenterLookups() {
  const [clients, projects, employees, roles, settings, overhead, projectTypes] = await Promise.all([
    q(
      undefined,
      `SELECT id, client_code, name, status
       FROM ops_clients
       WHERE status IS DISTINCT FROM 'inactive'
       ORDER BY name`
    ),
    q(
      undefined,
      `SELECT p.id, p.project_code, p.project_name, p.client_id, p.category, c.name AS client_name
       FROM project_management_projects p
       LEFT JOIN ops_clients c ON c.id = p.client_id
       WHERE p.archived_at IS NULL
       ORDER BY p.project_name`
    ),
    q(
      undefined,
      `SELECT id, employee_code, full_name, designation, department, status, annual_ctc
       FROM finance_employees
       WHERE status = 'active'
       ORDER BY full_name`
    ),
    listRoleRates(true),
    getSettings(),
    overheadSnapshot(),
    q(
      undefined,
      `SELECT id, name FROM project_management_project_types WHERE active = TRUE ORDER BY sort_order, name`
    ).catch(() => ({ rows: [] as { id: string; name: string }[] })),
  ]);

  return {
    clients: clients.rows,
    projects: projects.rows,
    employees: employees.rows,
    roles,
    settings,
    overhead,
    projectTypes: projectTypes.rows,
  };
}
