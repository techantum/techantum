import { writePmAudit } from './audit';
import { staffSlot, todayInKolkata } from './calculate';
import { q, withFinanceTx } from '@/lib/finance/db';
import { FinanceNotFoundError, FinanceValidationError } from '@/lib/finance/errors';

async function assertActiveEmployee(employeeId: string) {
  const { rows } = await q(undefined, `SELECT id, status FROM finance_employees WHERE id=$1`, [employeeId]);
  if (!rows[0]) throw new FinanceNotFoundError('Employee not found in HR');
  if (rows[0].status !== 'active') throw new FinanceValidationError('Inactive employees cannot be added to a new assignment');
  return rows[0];
}

async function assertAssignableProject(projectId: string) {
  const { rows } = await q(undefined, `SELECT id, archived_at FROM project_management_projects WHERE id=$1`, [projectId]);
  if (!rows[0]) throw new FinanceNotFoundError('Project not found');
  if (rows[0].archived_at) throw new FinanceValidationError('Archived projects are not available for new allocation');
}

export async function listAllocations(projectId?: string) {
  const values: unknown[] = [];
  const where = projectId ? (values.push(projectId), 'WHERE a.project_id = $1') : '';
  const { rows } = await q(
    undefined,
    `SELECT a.*, p.project_code, p.project_name, c.name AS client_name,
            e.full_name, e.employee_code, e.department, e.designation, e.status AS employee_status,
            r.name AS role_name
     FROM project_management_allocations a
     JOIN project_management_projects p ON p.id = a.project_id
     LEFT JOIN ops_clients c ON c.id = p.client_id
     JOIN finance_employees e ON e.id = a.employee_id
     LEFT JOIN project_management_roles r ON r.id = a.role_id
     ${where}
     ORDER BY p.project_code, a.status, e.full_name`,
    values
  );
  return rows;
}

export async function allocationSummary() {
  const { rows } = await q(
    undefined,
    `SELECT p.id, p.project_code, p.project_name, p.start_date, p.planned_end_date, c.name AS client_name,
            lead.full_name AS project_lead_name,
            COUNT(a.id) FILTER (WHERE a.status = 'active')::int AS team_size,
            COALESCE(SUM(a.allocation_percent) FILTER (WHERE a.status = 'active'), 0)::text AS allocated_capacity,
            MIN(a.start_date) FILTER (WHERE a.status = 'active') AS team_start,
            MAX(a.end_date) FILTER (WHERE a.status = 'active') AS team_end,
            STRING_AGG(DISTINCT e.department, ', ') FILTER (WHERE a.status = 'active' AND e.department IS NOT NULL) AS departments
     FROM project_management_projects p
     LEFT JOIN ops_clients c ON c.id = p.client_id
     LEFT JOIN finance_employees lead ON lead.id = p.lead_developer_id
     LEFT JOIN project_management_allocations a ON a.project_id = p.id
     LEFT JOIN finance_employees e ON e.id = a.employee_id
     WHERE p.archived_at IS NULL
     GROUP BY p.id, c.name, lead.full_name
     ORDER BY p.project_code`
  );
  return rows;
}

export async function employeeCapacity() {
  const today = todayInKolkata();
  const { rows } = await q(
    undefined,
    `SELECT e.id, e.full_name, e.employee_code, e.department, e.designation, e.status AS employee_status,
            COALESCE(SUM(a.allocation_percent) FILTER (
              WHERE a.status = 'active' AND (a.end_date IS NULL OR a.end_date >= $1::date)
            ), 0)::text AS total_percent,
            COALESCE(json_agg(json_build_object(
              'project_id', p.id,
              'project_code', p.project_code,
              'project_name', p.project_name,
              'allocation_percent', a.allocation_percent,
              'role_name', r.name,
              'status', a.status
            ) ORDER BY p.project_code) FILTER (WHERE a.id IS NOT NULL), '[]') AS projects
     FROM finance_employees e
     LEFT JOIN project_management_allocations a ON a.employee_id = e.id AND a.status = 'active'
     LEFT JOIN project_management_projects p ON p.id = a.project_id
     LEFT JOIN project_management_roles r ON r.id = a.role_id
     GROUP BY e.id
     ORDER BY e.full_name`,
    [today]
  );
  return rows.map((row) => {
    const total = Number(row.total_percent || 0);
    return { ...row, total_percent: total, available_percent: Math.round((100 - total) * 100) / 100, overloaded: total > 100 };
  });
}

export async function saveAllocation(body: Record<string, unknown>, userId: string) {
  const projectId = String(body.project_id || '');
  const employeeId = String(body.employee_id || '');
  if (!projectId) throw new FinanceValidationError('Select a project');
  if (!employeeId) throw new FinanceValidationError('Select an employee from HR');
  await assertAssignableProject(projectId);
  await assertActiveEmployee(employeeId);
  const percent = Number(body.allocation_percent ?? 100);
  if (!Number.isFinite(percent) || percent < 0) throw new FinanceValidationError('Allocation percent is required');
  return withFinanceTx(async (db) => {
    if (body.account_manager_id) {
      await assertActiveEmployee(String(body.account_manager_id));
      await q(db, `UPDATE project_management_projects SET account_manager_id=$2, updated_by=$3 WHERE id=$1`, [projectId, body.account_manager_id, userId]);
    }
    if (body.project_lead_id) {
      await assertActiveEmployee(String(body.project_lead_id));
      await q(db, `UPDATE project_management_projects SET lead_developer_id=$2, updated_by=$3 WHERE id=$1`, [projectId, body.project_lead_id, userId]);
    }
    const { rows } = await q(
      db,
      `INSERT INTO project_management_allocations
        (project_id, employee_id, role_id, allocation_percent, start_date, end_date, responsibility, status, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$8)
       ON CONFLICT (project_id, employee_id) WHERE status = 'active'
       DO UPDATE SET role_id=EXCLUDED.role_id, allocation_percent=EXCLUDED.allocation_percent,
         start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, responsibility=EXCLUDED.responsibility,
         version=project_management_allocations.version+1, updated_by=EXCLUDED.updated_by, updated_at=NOW()
       RETURNING *`,
      [
        projectId, employeeId, body.role_id || null, percent,
        body.start_date || null, body.end_date || null, body.responsibility || null, userId,
      ]
    );
    await writePmAudit(db, { userId, entityType: 'allocation', entityId: rows[0].id, projectId, action: 'Team Allocated', next: rows[0] });
    await q(db, `INSERT INTO project_management_events (event_key, project_id, entity_type, entity_id, employee_id, payload) VALUES ('team.allocated',$1,'allocation',$2,$3,$4::jsonb)`, [projectId, rows[0].id, employeeId, JSON.stringify({ allocation_percent: percent })]);
    return rows[0];
  });
}

export async function syncProjectDevelopers(
  db: Parameters<Parameters<typeof withFinanceTx>[0]>[0],
  projectId: string,
  employeeIds: string[],
  userId: string,
  keepIds: string[] = []
) {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  const { rows: roleRows } = await q(db, `SELECT id FROM project_management_roles WHERE active AND name ILIKE '%developer%' ORDER BY sort_order LIMIT 1`);
  const roleId = roleRows[0]?.id || null;
  const kept = new Set(keepIds);
  for (const employeeId of ids) {
    const { rows } = await q(
      db,
      `SELECT e.id, e.status, e.designation, e.department, t.project_role
       FROM finance_employees e
       LEFT JOIN project_management_team_profiles t ON t.employee_id = e.id
       WHERE e.id=$1`,
      [employeeId]
    );
    const employee = rows[0];
    if (!employee) throw new FinanceNotFoundError('Developer was not found in HR');
    if (employee.status !== 'active' && !kept.has(employeeId)) throw new FinanceValidationError('Inactive employees cannot be added as developers');
    if (staffSlot(employee) !== 'developer' && !kept.has(employeeId)) throw new FinanceValidationError('Developers must be employees in a developer role');
    await q(
      db,
      `INSERT INTO project_management_allocations
        (project_id, employee_id, role_id, allocation_percent, start_date, responsibility, status, created_by, updated_by)
       VALUES ($1,$2,$3,100,CURRENT_DATE,'developer','active',$4,$4)
       ON CONFLICT (project_id, employee_id) WHERE status = 'active'
       DO UPDATE SET responsibility='developer', role_id=COALESCE(EXCLUDED.role_id, project_management_allocations.role_id),
         updated_by=EXCLUDED.updated_by, updated_at=NOW(), version=project_management_allocations.version+1`,
      [projectId, employeeId, roleId, userId]
    );
  }
  await q(
    db,
    `UPDATE project_management_allocations
     SET status='released', updated_by=$3, updated_at=NOW(), version=version+1
     WHERE project_id=$1 AND status='active' AND responsibility='developer'
       AND NOT (employee_id = ANY($2::uuid[]))`,
    [projectId, ids, userId]
  );
}

export async function releaseAllocation(id: string, userId: string) {
  const { rows } = await q(undefined, `UPDATE project_management_allocations SET status='released', updated_by=$2, updated_at=NOW(), version=version+1 WHERE id=$1 AND status='active' RETURNING *`, [id, userId]);
  if (!rows[0]) throw new FinanceNotFoundError('Active allocation not found');
  await writePmAudit(undefined, { userId, entityType: 'allocation', entityId: id, projectId: rows[0].project_id, action: 'Team Member Released', next: rows[0] });
  return rows[0];
}
