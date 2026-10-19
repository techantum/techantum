import { writePmAudit } from './audit';
import { hierarchyStatus } from './calculate';
import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceConflictError, FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';

const ROLES = new Set(['manager', 'account_manager', 'sr_software_engineer', 'full_stack_developer', 'jr_full_stack_developer']);

export async function listTeam() {
  const { rows } = await q(
    undefined,
    `SELECT t.*, e.full_name, e.employee_code, e.status AS employee_status, e.designation,
            r.full_name AS reports_to_name, rt.project_role AS reports_to_role
     FROM project_management_team_profiles t
     JOIN finance_employees e ON e.id = t.employee_id
     LEFT JOIN finance_employees r ON r.id = t.reports_to_employee_id
     LEFT JOIN project_management_team_profiles rt ON rt.employee_id = t.reports_to_employee_id
     ORDER BY e.full_name`
  );
  const load = await q(
    undefined,
    `SELECT employee_id, COUNT(*)::int AS ongoing
     FROM (
       SELECT account_manager_id AS employee_id FROM project_management_projects WHERE archived_at IS NULL AND category='ongoing'
       UNION ALL SELECT sr_engineer_id FROM project_management_projects WHERE archived_at IS NULL AND category='ongoing'
       UNION ALL SELECT lead_developer_id FROM project_management_projects WHERE archived_at IS NULL AND category='ongoing'
       UNION ALL SELECT junior_developer_1_id FROM project_management_projects WHERE archived_at IS NULL AND category='ongoing'
       UNION ALL SELECT junior_developer_2_id FROM project_management_projects WHERE archived_at IS NULL AND category='ongoing'
     ) x WHERE employee_id IS NOT NULL GROUP BY employee_id`
  );
  const counts = new Map(load.rows.map((row) => [row.employee_id, row.ongoing]));
  return rows.map((row) => ({
    ...row,
    hierarchy: hierarchyStatus(String(row.project_role), row.reports_to_role as string | null),
    ongoing_projects: counts.get(row.employee_id) || 0,
  }));
}

export async function saveTeamProfile(body: Record<string, unknown>, userId: string) {
  const employeeId = String(body.employee_id || '');
  const role = String(body.project_role || '');
  if (!employeeId) throw new FinanceValidationError('Employee is required');
  if (!ROLES.has(role)) throw new FinanceValidationError('Project role is not recognised');
  const employee = await q(undefined, `SELECT id, status FROM finance_employees WHERE id=$1`, [employeeId]);
  if (!employee.rows[0]) throw new FinanceNotFoundError('Employee not found');
  if (!body.id && employee.rows[0].status && employee.rows[0].status !== 'active') {
    throw new FinanceValidationError('Only active employees can be newly assigned');
  }
  return withFinanceTx(async (db) => {
    const existing = await q(db, 'SELECT * FROM project_management_team_profiles WHERE employee_id=$1', [employeeId]);
    if (existing.rows[0] && body.version != null && Number(body.version) !== Number(existing.rows[0].version)) {
      throw new FinanceConflictError('This profile was updated by someone else. Reload and try again.');
    }
    const { rows } = await q(
      db,
      `INSERT INTO project_management_team_profiles (employee_id, project_role, reports_to_employee_id, active, updated_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (employee_id) DO UPDATE SET
         project_role=EXCLUDED.project_role,
         reports_to_employee_id=EXCLUDED.reports_to_employee_id,
         active=EXCLUDED.active,
         version=project_management_team_profiles.version+1,
         updated_by=EXCLUDED.updated_by
       RETURNING *`,
      [employeeId, role, body.reports_to_employee_id || null, body.active !== false && body.active !== 'false', userId]
    );
    await writePmAudit(db, {
      userId,
      entityType: 'team_profile',
      entityId: rows[0].id,
      action: existing.rows[0] ? 'Assignment' : 'Create',
      previous: existing.rows[0],
      next: rows[0],
    });
    return rows[0];
  });
}
